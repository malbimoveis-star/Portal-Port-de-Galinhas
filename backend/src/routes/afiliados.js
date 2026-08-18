'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticarAfiliado, gerarTokenAfiliado } = require('../middleware/authAfiliado');
const { notificarAdmin } = require('../utils/mailer');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function afiliadoSemSenha(a) {
  if (!a) return a;
  const { senha_hash, documento_base64, ...resto } = a;
  return resto;
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

// POST /api/afiliados/cadastro - cadastro publico de afiliado. Fica ativo na
// hora (sem aprovacao previa). Donos de comercio ja cadastrados no portal
// (comerciantes) nao podem virar afiliado.
const VERSAO_TERMOS_AFILIADO = '1.0';

router.post('/cadastro', async (req, res) => {
  const {
    nome, email, senha, rg, cpf, telefone, chave_pix,
    documento_base64, documento_nome, documento_tipo,
    aceite_termos,
  } = req.body;

  if (!nome || !email || !senha || !rg || !cpf || !telefone || !chave_pix) {
    return res.status(400).json({ erro: 'Campos "nome", "email", "senha", "rg", "cpf", "telefone" e "chave_pix" sao obrigatorios.' });
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

  const jaEhComerciante = await db.get('SELECT id FROM comerciantes WHERE email = ?', [email]);
  if (jaEhComerciante) {
    return res.status(409).json({ erro: 'Este e-mail ja e de um comerciante cadastrado no portal. Donos de comercio nao podem virar afiliado.' });
  }

  const existente = await db.get('SELECT id FROM afiliados WHERE email = ?', [email]);
  if (existente) {
    return res.status(409).json({ erro: 'Ja existe um afiliado cadastrado com este e-mail.' });
  }

  const cpfExistente = await db.get('SELECT id FROM afiliados WHERE cpf = ?', [String(cpf).replace(/\D/g, '')]);
  if (cpfExistente) {
    return res.status(409).json({ erro: 'Ja existe um afiliado cadastrado com este CPF.' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const codigo = await gerarCodigoUnico(nome);
  const agora = new Date().toISOString();

  const info = await db.run(
    `INSERT INTO afiliados
       (nome, email, senha_hash, codigo, status, rg, cpf, telefone, chave_pix, documento_nome, documento_tipo, documento_base64, termos_aceitos_em, termos_versao)
     VALUES (?, ?, ?, ?, 'ativo', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nome, email, senha_hash, codigo,
      String(rg).trim(), String(cpf).replace(/\D/g, ''), String(telefone).trim(), String(chave_pix).trim(),
      documento_nome, documento_tipo || null, documento_base64,
      agora, VERSAO_TERMOS_AFILIADO,
    ]
  );

  const afiliado = await db.get('SELECT * FROM afiliados WHERE id = ?', [info.lastInsertRowid]);
  const token = gerarTokenAfiliado(afiliado);

  notificarAdmin({
    titulo: 'Novo afiliado cadastrado',
    mensagem: `<strong>${nome}</strong> (${email}) se cadastrou como afiliado. Codigo de indicacao: <strong>${codigo}</strong>. Documento anexado - confira na aba Afiliados do painel.`,
  }).catch((err) => console.error('[afiliados] falha ao notificar admin sobre novo afiliado:', err.message));

  res.status(201).json({ afiliado: afiliadoSemSenha(afiliado), token, link_indicacao: linkIndicacao(codigo) });
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

// GET /api/afiliados/me - dados do afiliado logado + estatisticas (cliques,
// indicacoes, comissao pendente/paga) para o painel dele.
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
