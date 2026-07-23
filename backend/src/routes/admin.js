'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');
const upload = require('../middleware/upload');

const router = express.Router();

function parseAnuncio(anuncio) {
  return { ...anuncio, fotos: JSON.parse(anuncio.fotos || '[]'), tags: JSON.parse(anuncio.tags || '[]') };
}

router.use(autenticarAdmin);

router.get('/anuncios', (req, res) => {
  const { status } = req.query;
  const anuncios = status
    ? db.prepare('SELECT * FROM anuncios WHERE status = ? ORDER BY criado_em DESC').all(status)
    : db.prepare("SELECT * FROM anuncios WHERE status = 'pendente' ORDER BY criado_em DESC").all();
  res.json(anuncios.map(parseAnuncio));
});

router.get('/anuncios/todos', (req, res) => {
  res.json(db.prepare('SELECT * FROM anuncios ORDER BY criado_em DESC').all().map(parseAnuncio));
});

router.get('/anuncios/:id', (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  res.json(parseAnuncio(anuncio));
});

router.put('/anuncios/:id/aprovar', (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  db.prepare("UPDATE anuncios SET status = 'ativo' WHERE id = ?").run(req.params.id);
  res.json(parseAnuncio(db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id)));
});

router.put('/anuncios/:id/rejeitar', (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  db.prepare("UPDATE anuncios SET status = 'rejeitado' WHERE id = ?").run(req.params.id);
  res.json(parseAnuncio(db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id)));
});

router.put('/anuncios/:id', upload.array('fotos', 6), (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });

  const { titulo, descricao, categoria_id, tags, latitude, longitude, status } = req.body;
  const novasFotos = (req.files || []).map((f) => `/assets/uploads/${f.filename}`);
  const fotosFinal = novasFotos.length > 0 ? novasFotos : JSON.parse(anuncio.fotos || '[]');
  const tagsArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim())) : JSON.parse(anuncio.tags || '[]');

  db.prepare(
    `UPDATE anuncios SET titulo = ?, descricao = ?, categoria_id = ?, fotos = ?, tags = ?, latitude = ?, longitude = ?, status = ? WHERE id = ?`
  ).run(
    titulo || anuncio.titulo, descricao !== undefined ? descricao : anuncio.descricao,
    categoria_id !== undefined ? categoria_id : anuncio.categoria_id, JSON.stringify(fotosFinal), JSON.stringify(tagsArray),
    latitude !== undefined ? latitude : anuncio.latitude, longitude !== undefined ? longitude : anuncio.longitude,
    status || anuncio.status, req.params.id
  );
  res.json(parseAnuncio(db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id)));
});

router.delete('/anuncios/:id', (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  db.prepare('DELETE FROM anuncios WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

function slugify(texto) {
  return texto.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

router.get('/categorias', (req, res) => {
  res.json(db.prepare('SELECT * FROM categorias ORDER BY id ASC').all());
});

router.get('/categorias/:id', (req, res) => {
  const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });
  res.json(categoria);
});

router.post('/categorias', (req, res) => {
  const { nome, icone_url } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Campo "nome" e obrigatorio.' });
  const slug = slugify(nome);
  try {
    const info = db.prepare('INSERT INTO categorias (nome, icone_url, slug) VALUES (?, ?, ?)').run(nome, icone_url || null, slug);
    res.status(201).json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    res.status(400).json({ erro: 'Nao foi possivel criar a categoria (nome/slug duplicado?).', detalhe: err.message });
  }
});

router.put('/categorias/:id', (req, res) => {
  const { nome, icone_url } = req.body;
  const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });
  const novoNome = nome || categoria.nome;
  const novoIcone = icone_url !== undefined ? icone_url : categoria.icone_url;
  const novoSlug = nome ? slugify(nome) : categoria.slug;
  db.prepare('UPDATE categorias SET nome = ?, icone_url = ?, slug = ? WHERE id = ?').run(novoNome, novoIcone, novoSlug, req.params.id);
  res.json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id));
});

router.delete('/categorias/:id', (req, res) => {
  const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria nao encontrada.' });
  db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

module.exports = router;
