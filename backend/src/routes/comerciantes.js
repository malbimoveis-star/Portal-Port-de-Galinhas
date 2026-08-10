'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticar, gerarToken } = require('../middleware/auth');
const { verificarEAtualizarStatus, calcularTempoRestanteDegustacao, comercianteVisivelPublicamente } = require('../utils/status');
const { PLANOS } = require('../utils/planos');

const router = express.Router();

function comercianteSemSenha(c) {
  if (!c) return c;
  const { senha_hash, token_confirmacao_email, token_recuperacao_senha, ...resto } = c;
  return resto;
}

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

  const info = db.prepare(
    `INSERT INTO comerciantes (nome, email, telefone, senha_hash, plano, status, data_criacao, data_inicio_degustacao)
     VALUES (?, ?, ?, ?, 'gratuito', 'degustacao', ?, ?)`
  ).run(nome, email, telefone || null, senha_hash, agora, agora);

  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(info.lastInsertRowid);
  const token = gerarToken(comerciante);

  res.status(201).json({ comerciante: comercianteSemSenha(comerciante), token });
});

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

router.put('/me', autenticar, (req, res) => {
  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(req.comerciante.id);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  const {
    nome, telefone, categoria, cidade, endereco, descricao,
    logo, banner, site, latitude, longitude
  } = req.body;

  db.prepare(`
    UPDATE comerciantes SET
      nome = ?, telefone = ?, categoria = ?, cidade = ?, endereco = ?, descricao = ?,
      logo = ?, banner = ?, site = ?, latitude = ?, longitude = ?
    WHERE id = ?
  `).run(
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
  );

  const atualizado = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(comerciante.id);
  res.json({ comerciante: comercianteSemSenha(atualizado) });
});

router.get('/', (req, res) => {
  const todos = db.prepare('SELECT * FROM comerciantes ORDER BY id DESC').all();
  const visiveis = todos
    .filter((c) => comercianteVisivelPublicamente(c))
    .map((c) => comercianteSemSenha(c));
  res.json(visiveis);
});

router.get('/:id', (req, res) => {
  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(req.params.id);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  verificarEAtualizarStatus(comerciante);
  res.json({ comerciante: comercianteSemSenha(comerciante) });
});

module.exports = router;
