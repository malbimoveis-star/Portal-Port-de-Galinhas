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
router.get('/', async (req, res) => {
  const categorias = await db.all('SELECT * FROM categorias ORDER BY id ASC');
  res.json(categorias);
});

// GET /api/categorias/:id - detalhe de uma categoria
router.get('/:id', async (req, res) => {
  const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });
  res.json(categoria);
});

// POST /api/categorias - cria nova categoria
router.post('/', async (req, res) => {
  const { nome, icone_url } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Campo "nome" e obrigatorio.' });

  const slug = slugify(nome);
  try {
    const info = await db.run('INSERT INTO categorias (nome, icone_url, slug) VALUES (?, ?, ?)', [nome, icone_url || null, slug]);
    const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [info.lastInsertRowid]);
    res.status(201).json(categoria);
  } catch (err) {
    res.status(400).json({ erro: 'Nao foi possivel criar a categoria (nome/slug duplicado?).', detalhe: err.message });
  }
});

// PUT /api/categorias/:id - atualiza categoria
router.put('/:id', async (req, res) => {
  const { nome, icone_url } = req.body;
  const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });

  const novoNome = nome || categoria.nome;
  const novoIcone = icone_url !== undefined ? icone_url : categoria.icone_url;
  const novoSlug = nome ? slugify(nome) : categoria.slug;

  await db.run('UPDATE categorias SET nome = ?, icone_url = ?, slug = ? WHERE id = ?', [
    novoNome,
    novoIcone,
    novoSlug,
    req.params.id
  ]);

  const atualizada = await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  res.json(atualizada);
});

// DELETE /api/categorias/:id - remove categoria
router.delete('/:id', async (req, res) => {
  const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });

  await db.run('DELETE FROM categorias WHERE id = ?', [req.params.id]);
  res.json({ sucesso: true });
});

module.exports = router;
