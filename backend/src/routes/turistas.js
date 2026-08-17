'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticarTurista, gerarTokenTurista } = require('../middleware/authTurista');
const { turistaAtivo } = require('../utils/turistaStatus');

const router = express.Router();

function turistaSemSenha(t) {
  if (!t) return t;
  const { senha_hash, ...resto } = t;
  return resto;
}

// POST /api/turistas/cadastro - cria conta de turista (ainda sem assinatura ativa)
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Campos "nome", "email" e "senha" sao obrigatorios.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const existente = await db.get('SELECT id FROM turistas WHERE email = ?', [email]);
  if (existente) {
    return res.status(409).json({ erro: 'Ja existe uma conta de turista cadastrada com este e-mail.' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  const info = await db.run(
    `INSERT INTO turistas (nome, email, senha_hash, status)
     VALUES (?, ?, ?, 'inativo')`,
    [nome, email, senha_hash]
  );

  const turista = await db.get('SELECT * FROM turistas WHERE id = ?', [info.lastInsertRowid]);
  const token = gerarTokenTurista(turista);

  res.status(201).json({ turista: turistaSemSenha(turista), token, assinatura_ativa: false });
});

// POST /api/turistas/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Campos "email" e "senha" sao obrigatorios.' });
  }

  const turista = await db.get('SELECT * FROM turistas WHERE email = ?', [email]);
  if (!turista) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  const senhaOk = await bcrypt.compare(senha, turista.senha_hash);
  if (!senhaOk) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  const token = gerarTokenTurista(turista);
  const ativa = await turistaAtivo(turista.id);

  res.json({ turista: turistaSemSenha(turista), token, assinatura_ativa: ativa });
});

// GET /api/turistas/me - dados do turista logado + status da assinatura
router.get('/me', autenticarTurista, async (req, res) => {
  const turista = await db.get('SELECT * FROM turistas WHERE id = ?', [req.turista.id]);
  if (!turista) return res.status(404).json({ erro: 'Turista nao encontrado.' });

  const ativa = await turistaAtivo(turista.id);

  res.json({ turista: turistaSemSenha(turista), assinatura_ativa: ativa });
});

module.exports = router;
