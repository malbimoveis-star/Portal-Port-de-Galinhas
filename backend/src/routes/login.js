'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { gerarTokenAdmin } = require('../middleware/authAdmin');
const { enviarEmail, templateRecuperacaoSenha } = require('../utils/mailer');

const router = express.Router();

const ADMIN_USER_PADRAO = process.env.ADMIN_USER || 'admin';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

function gerarTokenAleatorio() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/login - autenticacao do administrador. A senha agora fica
// gravada (com hash) na tabela administradores, nao mais so na variavel
// de ambiente ADMIN_PASS - isso permite o fluxo de "esqueci a senha"
// abaixo. O registro padrao e' criado automaticamente no boot do servidor
// (ver backend/src/db/seedAdmin.js), entao o login continua funcionando
// com o usuario/senha de sempre sem nenhuma acao manual.
router.post('/', async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'Campos "usuario" e "senha" sao obrigatorios.' });
  }

  try {
    const admin = await db.get('SELECT * FROM administradores WHERE usuario = ?', [usuario]);
    if (!admin) {
      return res.status(401).json({ erro: 'Credenciais invalidas.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, admin.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais invalidas.' });
    }

    const token = gerarTokenAdmin(usuario);
    res.json({ token, usuario });
  } catch (err) {
    console.error('[login] erro ao autenticar admin:', err);
    res.status(500).json({ erro: 'Erro ao autenticar.' });
  }
});

// POST /api/login/esqueci-senha - envia um link de redefinicao para o
// e-mail de recuperacao cadastrado do admin. So existe um administrador
// no painel, entao nao pedimos e-mail no corpo: se "usuario" nao vier,
// usamos o ADMIN_USER padrao. Resposta sempre generica (nao revela se o
// usuario existe), igual ao fluxo de comerciante/afiliado.
router.post('/esqueci-senha', async (req, res) => {
  const usuarioBusca = (req.body && req.body.usuario) || ADMIN_USER_PADRAO;

  const respostaGenerica = {
    sucesso: true,
    mensagem: 'Se este usuario existir, um link de redefinicao foi enviado para o e-mail de recuperacao cadastrado.',
  };

  try {
    const admin = await db.get('SELECT * FROM administradores WHERE usuario = ?', [usuarioBusca]);
    if (!admin || !admin.email) {
      return res.json(respostaGenerica);
    }

    const tokenRecuperacao = gerarTokenAleatorio();
    const expiraRecuperacao = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.run(
      'UPDATE administradores SET token_recuperacao_senha = ?, token_recuperacao_expira_em = ? WHERE id = ?',
      [tokenRecuperacao, expiraRecuperacao, admin.id]
    );

    const linkRedefinir = `${BACKEND_URL}/admin/redefinir-senha.html?token=${tokenRecuperacao}`;
    enviarEmail({
      para: admin.email,
      assunto: 'Redefinicao de senha - Painel Administrativo',
      html: templateRecuperacaoSenha({ nome: 'Administrador', linkRedefinir }),
    }).catch((err) => console.error('[login] falha ao enviar e-mail de recuperacao do admin:', err.message));

    res.json(respostaGenerica);
  } catch (err) {
    console.error('[login] erro ao solicitar recuperacao de senha do admin:', err);
    res.status(500).json({ erro: 'Erro ao solicitar recuperacao de senha.' });
  }
});

// POST /api/login/redefinir-senha - troca a senha do admin usando o token
// recebido por e-mail (valido por 1 hora).
router.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) {
    return res.status(400).json({ erro: 'Campos "token" e "novaSenha" sao obrigatorios.' });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const admin = await db.get('SELECT * FROM administradores WHERE token_recuperacao_senha = ?', [token]);
    if (!admin) {
      return res.status(400).json({ erro: 'Link de redefinicao invalido.' });
    }
    if (admin.token_recuperacao_expira_em && new Date(admin.token_recuperacao_expira_em) < new Date()) {
      return res.status(400).json({ erro: 'Link de redefinicao expirado. Solicite um novo.' });
    }

    const senha_hash = await bcrypt.hash(novaSenha, 10);
    await db.run(
      'UPDATE administradores SET senha_hash = ?, token_recuperacao_senha = NULL, token_recuperacao_expira_em = NULL WHERE id = ?',
      [senha_hash, admin.id]
    );

    res.json({ sucesso: true, mensagem: 'Senha redefinida com sucesso. Voce ja pode fazer login.' });
  } catch (err) {
    console.error('[login] erro ao redefinir senha do admin:', err);
    res.status(500).json({ erro: 'Erro ao redefinir senha.' });
  }
});

module.exports = router;
