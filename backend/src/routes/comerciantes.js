'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticar, gerarToken } = require('../middleware/auth');
const { verificarEAtualizarStatus, calcularTempoRestanteDegustacao, comercianteVisivelPublicamente } = require('../utils/status');
const { PLANOS } = require('../utils/planos');
const { enviarEmail, templateBoasVindas, templateRecuperacaoSenha, notificarAdmin } = require('../utils/mailer');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function comercianteSemSenha(c) {
    if (!c) return c;
    const { senha_hash, token_confirmacao_email, token_recuperacao_senha, ...resto } = c;
    return resto;
}

function gerarTokenAleatorio() {
    return crypto.randomBytes(32).toString('hex');
}

router.post('/cadastro', async (req, res) => {
    const { nome, email, telefone, senha, codigo_afiliado } = req.body;
    if (!nome || !email || !senha) {
          return res.status(400).json({ erro: 'Campos "nome", "email" e "senha" sao obrigatorios.' });
    }

              const existente = await db.get('SELECT id FROM comerciantes WHERE email = ?', [email]);
    if (existente) {
          return res.status(409).json({ erro: 'Ja existe um comerciante cadastrado com este e-mail.' });
    }

              const senha_hash = await bcrypt.hash(senha, 10);
    const agora = new Date().toISOString();

              const tokenConfirmacao = gerarTokenAleatorio();
    const expiraConfirmacao = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

              // Fase 3 do dashboard: se o cadastro veio de um link de indicacao
              // (?ref=CODIGO capturado no front-end), liga esse comerciante ao
              // afiliado correspondente para calcular a comissao quando ele pagar.
              // Codigo invalido/inexistente e ignorado silenciosamente (nao bloqueia
              // o cadastro).
              let idAfiliadoReferenciador = null;
              if (codigo_afiliado) {
                    const afiliado = await db.get("SELECT id FROM afiliados WHERE codigo = ? AND status = 'ativo'", [codigo_afiliado]);
                    if (afiliado) idAfiliadoReferenciador = afiliado.id;
              }

              const info = await db.run(
                    `INSERT INTO comerciantes (nome, email, telefone, senha_hash, plano, status, data_criacao, data_inicio_degustacao, token_confirmacao_email, token_confirmacao_expira_em, id_afiliado_referenciador)
                         VALUES (?, ?, ?, ?, 'gratuito', 'degustacao', ?, ?, ?, ?, ?)`,
                    [nome, email, telefone || null, senha_hash, agora, agora, tokenConfirmacao, expiraConfirmacao, idAfiliadoReferenciador]
                  );

              const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [info.lastInsertRowid]);
    const token = gerarToken(comerciante);

              const linkConfirmacao = `${FRONTEND_URL}/pages/confirmar-email.html?token=${tokenConfirmacao}`;
    enviarEmail({
          para: email,
          assunto: 'Confirme seu cadastro no Portal Porto de Galinhas',
          html: templateBoasVindas({ nome, linkConfirmacao }),
    }).catch((err) => console.error('[comerciantes] falha ao enviar e-mail de boas-vindas:', err.message));

              // Fase 2 do dashboard: avisa o admin por e-mail de todo novo cadastro.
              notificarAdmin({
                    titulo: 'Novo comerciante cadastrado',
                    mensagem: `O comerciante <strong>${nome}</strong> (${email}) acabou de se cadastrar no portal.`,
              }).catch((err) => console.error('[comerciantes] falha ao notificar admin sobre novo cadastro:', err.message));

              res.status(201).json({ comerciante: comercianteSemSenha(comerciante), token });
});

router.get('/confirmar-email/:token', async (req, res) => {
    const { token } = req.params;
    const comerciante = await db.get('SELECT * FROM comerciantes WHERE token_confirmacao_email = ?', [token]);

             if (!comerciante) {
                   return res.status(400).json({ erro: 'Link de confirmacao invalido.' });
             }
    if (comerciante.token_confirmacao_expira_em && new Date(comerciante.token_confirmacao_expira_em) < new Date()) {
          return res.status(400).json({ erro: 'Link de confirmacao expirado. Solicite um novo no seu painel.' });
    }

             await db.run(
                   'UPDATE comerciantes SET email_confirmado = 1, token_confirmacao_email = NULL, token_confirmacao_expira_em = NULL WHERE id = ?',
                   [comerciante.id]
                 );

             res.json({ sucesso: true, mensagem: 'E-mail confirmado com sucesso.' });
});

router.post('/esqueci-senha', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'Campo "email" e obrigatorio.' });

              const comerciante = await db.get('SELECT * FROM comerciantes WHERE email = ?', [email]);

              const respostaGenerica = { sucesso: true, mensagem: 'Se este e-mail estiver cadastrado, voce recebera um link de redefinicao de senha em instantes.' };
    if (!comerciante) return res.json(respostaGenerica);

              const tokenRecuperacao = gerarTokenAleatorio();
    const expiraRecuperacao = new Date(Date.now() + 60 * 60 * 1000).toISOString();

              await db.run(
                    'UPDATE comerciantes SET token_recuperacao_senha = ?, token_recuperacao_expira_em = ? WHERE id = ?',
                    [tokenRecuperacao, expiraRecuperacao, comerciante.id]
                  );

              const linkRedefinir = `${FRONTEND_URL}/pages/redefinir-senha.html?token=${tokenRecuperacao}`;
    enviarEmail({
          para: comerciante.email,
          assunto: 'Redefinicao de senha - Portal Porto de Galinhas',
          html: templateRecuperacaoSenha({ nome: comerciante.nome, linkRedefinir }),
    }).catch((err) => console.error('[comerciantes] falha ao enviar e-mail de recuperacao:', err.message));

              res.json(respostaGenerica);
});

router.post('/redefinir-senha', async (req, res) => {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) {
          return res.status(400).json({ erro: 'Campos "token" e "novaSenha" sao obrigatorios.' });
    }
    if (novaSenha.length < 6) {
          return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

              const comerciante = await db.get('SELECT * FROM comerciantes WHERE token_recuperacao_senha = ?', [token]);
    if (!comerciante) {
          return res.status(400).json({ erro: 'Link de redefinicao invalido.' });
    }
    if (comerciante.token_recuperacao_expira_em && new Date(comerciante.token_recuperacao_expira_em) < new Date()) {
          return res.status(400).json({ erro: 'Link de redefinicao expirado. Solicite um novo.' });
    }

              const senha_hash = await bcrypt.hash(novaSenha, 10);
    await db.run(
          'UPDATE comerciantes SET senha_hash = ?, token_recuperacao_senha = NULL, token_recuperacao_expira_em = NULL WHERE id = ?',
          [senha_hash, comerciante.id]
        );

              res.json({ sucesso: true, mensagem: 'Senha redefinida com sucesso. Voce ja pode fazer login.' });
});

router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
          return res.status(400).json({ erro: 'Campos "email" e "senha" sao obrigatorios.' });
    }

              const comerciante = await db.get('SELECT * FROM comerciantes WHERE email = ?', [email]);
    if (!comerciante) {
          return res.status(401).json({ erro: 'Credenciais invalidas.' });
    }

              const senhaOk = await bcrypt.compare(senha, comerciante.senha_hash);
    if (!senhaOk) {
          return res.status(401).json({ erro: 'Credenciais invalidas.' });
    }

              await verificarEAtualizarStatus(comerciante);
    const token = gerarToken(comerciante);
    res.json({ comerciante: comercianteSemSenha(comerciante), token });
});

router.get('/me', autenticar, async (req, res) => {
    const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.comerciante.id]);
    if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

             await verificarEAtualizarStatus(comerciante);
    const degustacao = calcularTempoRestanteDegustacao(comerciante);

             res.json({
                   comerciante: comercianteSemSenha(comerciante),
                   degustacao,
                   plano_info: PLANOS[comerciante.plano] || null,
             });
});

router.put('/me', autenticar, async (req, res) => {
    const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.comerciante.id]);
    if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

             const {
                   nome, telefone, categoria, cidade, endereco, descricao,
                   logo, banner, site, latitude, longitude
             } = req.body;

             await db.run(`
                 UPDATE comerciantes SET
                       nome = ?, telefone = ?, categoria = ?, cidade = ?, endereco = ?, descricao = ?,
                             logo = ?, banner = ?, site = ?, latitude = ?, longitude = ?
                                 WHERE id = ?
                                   `, [
                   nome || comerciante.nome,
                   telefone !== undefined ? telefone : comerciante.telefone,
                   categoria !== undefined ? categoria : comerciante.categoria,
                   cidade !== undefined ? cidade : comerciante.cidade,
                   endereco !== undefined ? endereco : comerciante.endereco,
                   descricao !== undefined ? descricao : comerciante.descricao,
                   logo !== undefined ? logo : comerciante.logo,
                   banner !== undefined ? banner : comerciante.banner,
                   site !== undefined ? site : comerciante.site,
                   latitude !== undefined ? latitude : comerciante.latitude,
                   longitude !== undefined ? longitude : comerciante.longitude,
                   comerciante.id
                 ]);

             const atualizado = await db.get('SELECT * FROM comerciantes WHERE id = ?', [comerciante.id]);
    res.json({ comerciante: comercianteSemSenha(atualizado) });
});

router.get('/', async (req, res) => {
    const todos = await db.all('SELECT * FROM comerciantes ORDER BY id DESC');
    // NOTA (migração Postgres): comercianteVisivelPublicamente agora é async
    // (ela chama verificarEAtualizarStatus, que grava no banco quando o status
    // muda). Array.prototype.filter não suporta predicado assíncrono, entao
    // calculamos a visibilidade de cada comerciante primeiro com Promise.all
    // e só depois filtramos pelo resultado - preserva ordem e resultado do
    // filter() síncrono original.
    const visibilidade = await Promise.all(todos.map((c) => comercianteVisivelPublicamente(c)));
    const visiveis = todos
      .filter((c, idx) => visibilidade[idx])
      .map((c) => comercianteSemSenha(c));
    res.json(visiveis);
});

router.get('/:id', async (req, res) => {
    const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.params.id]);
    if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

             await verificarEAtualizarStatus(comerciante);
    res.json({ comerciante: comercianteSemSenha(comerciante) });
});

module.exports = router;
