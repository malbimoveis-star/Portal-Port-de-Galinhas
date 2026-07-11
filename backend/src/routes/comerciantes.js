'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticar, gerarToken } = require('../middleware/auth');
const { verificarEAtualizarStatus, calcularTempoRestanteDegustacao } = require('../utils/status');
const { PLANOS } = require('../utils/planos');

const router = express.Router();

function comercianteSemSenha(c) {
  if (!c) return c;
  const { senha_hash, ...resto } = c;
  return resto;
}

// POST /api/comerciantes/cadastro - cria novo comerciante (inicia degustacao)
router.post('/cadastro', async (req, res) => {
  const { nome, email, telefone, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Campos "nome", "email" e "senha" sao obrigatorios.' });
  }

  const existente = db.prepare('SELECT id FROM comerciantes WHERE email = ?').get(email);
  if (existente) {
    return res.status(409).json({ erro: 'Ja existe um comerciante cadastrado com este e-mail.' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const agora = new Date().toISOString();

  const info = db
    .prepare(
      `INSERT INTO comerciantes (nome, email, telefone, senha_hash, plano, status, data_criacao, data_inicio_degustacao)
       VALUES (?, ?, ?, ?, 'gratuito', 'degustacao', ?, ?)`
    )
    .run(nome, email, telefone || null, senha_hash, agora, agora);

  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(info.lastInsertRowid);
  const token = gerarToken(comerciante);

  res.status(201).json({ comerciante: comercianteSemSenha(comerciante), token });
});

// POST /api/comerciantes/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Campos "email" e "senha" sao obrigatorios.' });
  }

  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE email = ?').get(email);
  if (!comerciante) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  const senhaOk = await bcrypt.compare(senha, comerciante.senha_hash);
  if (!senhaOk) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  verificarEAtualizarStatus(comerciante);
  const token = gerarToken(comerciante);
  res.json({ comerciante: comercianteSemSenha(comerciante), token });
});

// GET /api/comerciantes/me - dados do comerciante autenticado (painel)
router.get('/me', autenticar, (req, res) => {
  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(req.comerciante.id);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  verificarEAtualizarStatus(comerciante);
  const degustacao = calcularTempoRestanteDegustacao(comerciante);

  res.json({
    comerciante: comercianteSemSenha(comerciante),
    degustacao,
    plano_info: PLANOS[comerciante.plano] || null,
  });
});

// GET /api/comerciantes/:id - dados publicos de um comerciante (pagina do comerciante)
router.get('/:id', (req, res) => {
  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(req.params.id);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  verificarEAtualizarStatus(comerciante);
  res.json({ comerciante: comercianteSemSenha(comerciante) });
});

// PUT /api/comerciantes/me - atualiza dados do comerciante autenticado
router.put('/me', autenticar, (req, res) => {
  const { nome, telefone } = req.body;
  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(req.comerciante.id);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  db.prepare('UPDATE comerciantes SET nome = ?, telefone = ? WHERE id = ?').run(
    nome || comerciante.nome,
    telefone !== undefined ? telefone : comerciante.telefone,
    comerciante.id
  );

  const atualizado = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(comerciante.id);
  res.json({ comerciante: comercianteSemSenha(atualizado) });
});

module.exports = router;
