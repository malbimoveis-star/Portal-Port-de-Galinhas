'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');

const router = express.Router();

// GET /api/blog - lista publica (somente publicados)
router.get('/', (req, res) => {
  const artigos = db.prepare('SELECT id, titulo, resumo, capa_url, criado_em FROM artigos WHERE publicado = 1 ORDER BY criado_em DESC').all();
  res.json(artigos);
});

// GET /api/blog/:id - detalhe publico de um artigo
router.get('/:id', (req, res) => {
  const artigo = db.prepare('SELECT * FROM artigos WHERE id = ? AND publicado = 1').get(req.params.id);
  if (!artigo) return res.status(404).json({ erro: 'Artigo nao encontrado.' });
  res.json(artigo);
});

// ===== Administração (exige token de admin) =====

// GET /api/blog/admin/todos - lista todos os artigos, publicados ou nao
router.get('/admin/todos', autenticarAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM artigos ORDER BY criado_em DESC').all());
});

// POST /api/blog - cria novo artigo
router.post('/', autenticarAdmin, (req, res) => {
  const { titulo, resumo, conteudo, capa_url, publicado } = req.body;
  if (!titulo || !conteudo) return res.status(400).json({ erro: 'Campos "titulo" e "conteudo" sao obrigatorios.' });

  const info = db.prepare(
    'INSERT INTO artigos (titulo, resumo, conteudo, capa_url, publicado) VALUES (?, ?, ?, ?, ?)'
  ).run(titulo, resumo || '', conteudo, capa_url || null, publicado === false ? 0 : 1);

  res.status(201).json(db.prepare('SELECT * FROM artigos WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/blog/:id - edita artigo existente
router.put('/:id', autenticarAdmin, (req, res) => {
  const artigo = db.prepare('SELECT * FROM artigos WHERE id = ?').get(req.params.id);
  if (!artigo) return res.status(404).json({ erro: 'Artigo nao encontrado.' });

  const { titulo, resumo, conteudo, capa_url, publicado } = req.body;
  db.prepare('UPDATE artigos SET titulo = ?, resumo = ?, conteudo = ?, capa_url = ?, publicado = ? WHERE id = ?').run(
    titulo || artigo.titulo,
    resumo !== undefined ? resumo : artigo.resumo,
    conteudo || artigo.conteudo,
    capa_url !== undefined ? capa_url : artigo.capa_url,
    publicado === undefined ? artigo.publicado : (publicado ? 1 : 0),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM artigos WHERE id = ?').get(req.params.id));
});

// DELETE /api/blog/:id - remove artigo
router.delete('/:id', autenticarAdmin, (req, res) => {
  const artigo = db.prepare('SELECT * FROM artigos WHERE id = ?').get(req.params.id);
  if (!artigo) return res.status(404).json({ erro: 'Artigo nao encontrado.' });
  db.prepare('DELETE FROM artigos WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

module.exports = router;
