'use strict';

const express = require('express');
const db = require('../db/connection');

const router = express.Router();

function slugify(texto) {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/categorias - lista todas as categorias
router.get('/', (req, res) => {
  const categorias = db.prepare('SELECT * FROM categorias ORDER BY id ASC').all();
  res.json(categorias);
});

// GET /api/categorias/:id - detalhe de uma categoria
router.get('/:id', (req, res) => {
  const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });
  res.json(categoria);
});

// POST /api/categorias - cria nova categoria
router.post('/', (req, res) => {
  const { nome, icone_url } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Campo "nome" e obrigatorio.' });

  const slug = slugify(nome);
  try {
    const info = db
      .prepare('INSERT INTO categorias (nome, icone_url, slug) VALUES (?, ?, ?)')
      .run(nome, icone_url || null, slug);
    const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(categoria);
  } catch (err) {
    res.status(400).json({ erro: 'Nao foi possivel criar a categoria (nome/slug duplicado?).', detalhe: err.message });
  }
});

// PUT /api/categorias/:id - atualiza categoria
router.put('/:id', (req, res) => {
  const { nome, icone_url } = req.body;
  const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });

  const novoNome = nome || categoria.nome;
  const novoIcone = icone_url !== undefined ? icone_url : categoria.icone_url;
  const novoSlug = nome ? slugify(nome) : categoria.slug;

  db.prepare('UPDATE categorias SET nome = ?, icone_url = ?, slug = ? WHERE id = ?').run(
    novoNome,
    novoIcone,
    novoSlug,
    req.params.id
  );

  const atualizada = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  res.json(atualizada);
});

// DELETE /api/categorias/:id - remove categoria
router.delete('/:id', (req, res) => {
  const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });

  db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

module.exports = router;
