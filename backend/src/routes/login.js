'use strict';

const express = require('express');
const { gerarTokenAdmin } = require('../middleware/authAdmin');

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// POST /api/login - autenticacao do administrador (usuario/senha fixos via env var)
router.post('/', (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'Campos "usuario" e "senha" sao obrigatorios.' });
  }

  if (usuario !== ADMIN_USER || senha !== ADMIN_PASS) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  const token = gerarTokenAdmin(usuario);
  res.json({ token, usuario });
});

module.exports = router;
