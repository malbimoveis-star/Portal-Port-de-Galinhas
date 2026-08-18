'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticarAfiliado, gerarTokenAfiliado } = require('../middleware/authAfiliado');
const { notificarAdmin, enviarEmail, templateBoasVindasAfiliado } = require('../utils/mailer');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const VERSAO_TERMOS_AFILIADO = '1.0';

function afiliadoSemSenha(a) {
  if (!a) return a;
  const { senha_hash, documento_base64, token_confirmacao_email, ...resto } = a;
  return resto;
}

function gerarTokenAleatorio() {
  return crypto.randomBytes(32).toString('hex');
}

// Validacao de CPF (formato + digitos verificadores). Aceita com ou sem
// pontuacao. Nao consulta a Receita Federal, so garante que o numero
// informado e estruturalmente valido.
function cpfValido(cpfBruto) {
  const cpf = String(cpfBruto || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  function calcularDigito(base) {
    let soma = 0;
    let peso = base.length + 1;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso;
      peso--;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const d1 = calcularDigito(cpf.slice(0, 9));
  const d2 = calcularDigito(cpf.slice(0, 9) + String(d1));
  return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
}

function normalizarBaseCodigo(nome) {
  const base = String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 14);
  return base || 'afiliado';
}

// Gera um codigo de indicacao unico (usado no link ?ref=CODIGO). Tenta o
// nome "limpo" primeiro (ex: "joaosilva"), e se ja existir vai adicionando
// um sufixo aleatorio ate achar um livre.
async function gerarCodigoUnico(nome) {
  const base = normalizarBaseCodigo(nome);
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const candidato = tentativa === 0 ? base : `${base}${crypto.randomBytes(2).toString('hex')}`;
    const existente = await db.get('SELECT id FROM afiliados WHERE codigo = ?', [candidato]);
    if (!existente) return candidato;
  }
  return `${base}${Date.now()}`;
}

function linkIndicacao(codigo) {
  return `${FRONTEND_URL.replace(/\/$/, '')}/?ref=${codigo}`;
}

// =========================================================
// ETAPA 1 - CADASTRO SIMPLES (publico, exposto no menu do site)
// =========================================================
//
// So pede nome/e-mail/senha. Nao coleta RG/CPF/telefone/chave Pix/documento
// nem mostra o Termo de Afiliado aqui - isso fica pra depois da confirmacao
// de e-mail, numa pagina separada (completar-cadastro-afiliado.html), pra
// nao expor dado sensivel numa pagina publica comum do site. Fica ativo na
// hora (sem aprovacao previa do admin), mas so tem o cadastro "completo"
// (perfil_completo = 1) depois de passar pela etapa 2.
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Campos "nome", "email" e "senha" sao obrigatorios.' });
  }

  const jaEhComerciante = await db.get('SELECT id FROM comerciantes WHERE email = ?', [email]);
  if (jaEhComerciante) {
    return res.status(409).json({ erro: 'Este e-mail ja e de um comerciante cadastrado no portal. Donos de comercio nao podem virar afiliado.' });
  }

  const existente = await db.get('SELECT id FROM afiliados WHERE email = ?', [email]);
  if (existente) {
    return res.status(409).json({ erro: 'Ja existe um afiliado cadastrado com este e-mail.' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const codigo = await gerarCodigoUnico(nome);
  const tokenConfirmacao = gerarTokenAleatorio();
  const expiraConfirmacao = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const info = await db.run(
    `INSERT INTO afiliados (nome, email, senha_hash, codigo, status, email_confirmado, perfil_completo, token_confirmacao_email, token_confirmacao_expira_em)
     VALUES (?, ?, ?, ?, 'ativo', 0, 0, ?, ?)`,
    [nome, email, senha_hash, codigo, tokenConfirmacao, expiraConfirmacao]
  );

  const afiliado = await db.get('SELECT * FROM afiliados WHERE id = ?', [info.lastInsertRowid]);
  const token = gerarTokenAfiliado(afiliado);

  const linkConfirmacao = `${FRONTEND_URL.replace(/\/$/, '')}/pages/confirmar-email-afiliado.html?token=${tokenConfirmacao}`;
  enviarEmail({
    para: email,
    assunto: 'Confirme seu cadastro no Programa de Afiliados',
    html: templateBoasVindasAfiliado({ nome, linkConfirmacao }),
  }).catch((err) => console.error('[afiliados] falha ao enviar e-mail de confirmacao:', err.message));

  notificarAdmin({
    titulo: 'Novo afiliado cadastrado (aguardando confirmacao)',
    mensagem: `<strong>${nome}</strong> (${email}) iniciou o cadastro de afiliado. Falta confirmar o e-mail e completar os dados (RG/CPF/documento/termo). Codigo de indicacao: <strong>${codigo}</strong>.`,
  }).catch((err) => console.error('[afiliados] falha ao notificar admin sobre novo afiliado:', err.message));

  res.status(201).json({
    afiliado: afiliadoSemSenha(afiliado),
    token,
    mensagem: 'Cadastro recebido! Verifique seu e-mail para confirmar e continuar o cadastro.',
  });
});

// GET /api/afiliados/confirmar-email/:token - link clicado a partir do
// e-mail de confirmacao. Rota publica (o token e a prova de posse do
// e-mail).
router.get('/confirmar-email/:token', async (req, res) => {
  const { token } = req.params;
  const afiliado = await db.get('SELECT * FROM afiliados WHERE token_confirmacao_email = ?', [token]);

  if (!afiliado) {
    return res.status(400).json({ erro: 'Link de confirmacao invalido.' });
  }
  if (afiliado.token_confirmacao_expira_em && new Date(afiliado.token_confirmacao_expira_em) < new Date()) {
    return res.status(400).json({ erro: 'Link de confirmacao expirado. Faca login para continuar.' });
  }

  await db.run(
    'UPDATE afiliados SET email_confirmado = 1, token_confirmacao_email = NULL, token_confirmacao_expira_em = NULL WHERE id = ?',
    [afiliado.id]
  );

  res.json({ sucesso: true, mensagem: 'E-mail confirmado com sucesso! Agora complete seu cadastro.' });
});

// POST /api/afiliados/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Campos "email" e "senha" sao obrigatorios.' });
  }

  const afiliado = await db.get('SELECT * FROM afiliados WHERE email = ?', [email]);
  if (!afiliado) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  const senhaValida = await bcrypt.compare(senha, afiliado.senha_hash);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  if (afiliado.status === 'bloqueado') {
    return res.status(403).json({ erro: 'Sua conta de afiliado esta bloqueada. Entre em contato com o suporte.' });
  }

  const token = gerarTokenAfiliado(afiliado);
  res.json({ afiliado: afiliadoSemSenha(afiliado), token, link_indicacao: linkIndicacao(afiliado.codigo) });
});

// POST /api/afiliados/registrar-clique - chamado pelo front-end quando
// alguem chega no site com ?ref=CODIGO. Rota publica, nao autenticada, so
// incrementa um contador. Ignora silenciosamente codigos invalidos.
router.post('/registrar-clique', async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) return res.json({ ok: true });

  const afiliado = await db.get("SELECT id FROM afiliados WHERE codigo = ? AND status = 'ativo'", [codigo]);
  if (afiliado) {
    await db.run('UPDATE afiliados SET cliques = cliques + 1 WHERE id = ?', [afiliado.id]);
  }
  res.json({ ok: true });
});

// =========================================================
// ETAPA 2 - COMPLETAR CADASTRO (autenticado, pagina separada)
// =========================================================
//
// PUT /api/afiliados/completar-cadastro
// So funciona depois do e-mail confirmado. Recebe RG, CPF, telefone, chave
// Pix, o documento de identidade e o aceite do Termo de Afiliado. Ao
// concluir, marca perfil_completo = 1 - e so a partir dai que o painel do
// afiliado libera normalmente (o front-end redireciona pra ca enquanto
// isso nao acontecer).
router.put('/completar-cadastro', autenticarAfiliado, async (req, res) => {
  const {
    rg, cpf, telefone, chave_pix,
    documento_base64, documento_nome, documento_tipo,
    aceite_termos,
  } = req.body;

  const afiliado = await db.get('SELECT * FROM afiliados WHERE id = ?', [req.afiliado.id]);
  if (!afiliado) return res.status(404).json({ erro: 'Afiliado nao encontrado.' });

  if (!afiliado.email_confirmado) {
    return res.status(400).json({ erro: 'Confirme seu e-mail antes de completar o cadastro. Verifique sua caixa de entrada.' });
  }

  if (!rg || !cpf || !telefone || !chave_pix) {
    return res.status(400).json({ erro: 'Campos "rg", "cpf", "telefone" e "chave_pix" sao obrigatorios.' });
  }

  if (!cpfValido(cpf)) {
    return res.status(400).json({ erro: 'CPF invalido. Confira o numero digitado.' });
  }

  if (!documento_base64 || !documento_nome) {
    return res.status(400).json({ erro: 'E obrigatorio anexar uma foto ou PDF do seu documento (RG ou CPF).' });
  }

  if (aceite_termos !== true) {
    return res.status(400).json({ erro: 'E preciso ler e aceitar o Termo de Afiliado para concluir o cadastro.' });
  }

  const cpfLimpo = String(cpf).replace(/\D/g, '');
  const cpfExistente = await db.get('SELECT id FROM afiliados WHERE cpf = ? AND id != ?', [cpfLimpo, afiliado.id]);
  if (cpfExistente) {
    return res.status(409).json({ erro: 'Ja existe um afiliado cadastrado com este CPF.' });
  }

  const agora = new Date().toISOString();

  await db.run(
    `UPDATE afiliados SET
       rg = ?, cpf = ?, telefone = ?, chave_pix = ?,
       documento_nome = ?, documento_tipo = ?, documento_base64 = ?,
       termos_aceitos_em = ?, termos_versao = ?, perfil_completo = 1
     WHERE id = ?`,
    [
      String(rg).trim(), cpfLimpo, String(telefone).trim(), String(chave_pix).trim(),
      documento_nome, documento_tipo || null, documento_base64,
      agora, VERSAO_TERMOS_AFILIADO, afiliado.id,
    ]
  );

  const atualizado = await db.get('SELECT * FROM afiliados WHERE id = ?', [afiliado.id]);

  notificarAdmin({
    titulo: 'Afiliado completou o cadastro',
    mensagem: `<strong>${afiliado.nome}</strong> (${afiliado.email}) confirmou o e-mail e completou o cadastro (CPF, documento e Termo de Afiliado aceitos). Confira na aba Afiliados do painel.`,
  }).catch((err) => console.error('[afiliados] falha ao notificar admin sobre perfil completo:', err.message));

  res.json({ afiliado: afiliadoSemSenha(atualizado), link_indicacao: linkIndicacao(atualizado.codigo) });
});

// GET /api/afiliados/me - dados do afiliado logado + estatisticas (cliques,
// indicacoes, comissao pendente/paga) para o painel dele. Inclui
// email_confirmado/perfil_completo pro front-end decidir se redireciona
// para a confirmacao de e-mail ou para completar-cadastro-afiliado.html.
router.get('/me', autenticarAfiliado, async (req, res) => {
  const afiliado = await db.get('SELECT * FROM afiliados WHERE id = ?', [req.afiliado.id]);
  if (!afiliado) return res.status(404).json({ erro: 'Afiliado nao encontrado.' });

  const [indicacoesTotal, comissaoPendente, comissaoPaga] = await Promise.all([
    db.get('SELECT COUNT(*)::int AS total FROM comerciantes WHERE id_afiliado_referenciador = ?', [afiliado.id]),
    db.get("SELECT COALESCE(SUM(valor_comissao), 0)::float AS total FROM comissoes_afiliado WHERE id_afiliado = ? AND status = 'pendente'", [afiliado.id]),
    db.get("SELECT COALESCE(SUM(valor_comissao), 0)::float AS total FROM comissoes_afiliado WHERE id_afiliado = ? AND status = 'pago'", [afiliado.id]),
  ]);

  res.json({
    afiliado: afiliadoSemSenha(afiliado),
    link_indicacao: linkIndicacao(afiliado.codigo),
    estatisticas: {
      cliques: afiliado.cliques || 0,
      indicacoes_total: indicacoesTotal.total,
      comissao_pendente: comissaoPendente.total,
      comissao_paga: comissaoPaga.total,
    },
  });
});

// GET /api/afiliados/me/comissoes - extrato de comissoes do afiliado logado.
router.get('/me/comissoes', autenticarAfiliado, async (req, res) => {
  const comissoes = await db.all(
    `SELECT co.id, co.valor_comissao, co.mes_referencia, co.status, co.criado_em, co.pago_em,
            c.nome AS nome_comerciante
     FROM comissoes_afiliado co
     LEFT JOIN comerciantes c ON c.id = co.id_comerciante
     WHERE co.id_afiliado = ?
     ORDER BY co.criado_em DESC`,
    [req.afiliado.id]
  );
  res.json(comissoes);
});

module.exports = router;
