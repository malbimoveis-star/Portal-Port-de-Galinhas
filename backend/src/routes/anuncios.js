'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { comercianteVisivelPublicamente } = require('../utils/status');

const router = express.Router();

function parseAnuncio(anuncio) {
  return {
    ...anuncio,
    fotos: JSON.parse(anuncio.fotos || '[]'),
    tags: JSON.parse(anuncio.tags || '[]'),
  };
}

// GET /api/anuncios - lista publica (somente comerciantes ativo/degustacao valida e anuncios com status "ativo")
// filtros opcionais: ?categoria_id= | ?destaque=1 (retorna todos os anuncios ativos, sem limite fixo)
router.get('/', (req, res) => {
  const { categoria_id } = req.query;

  let anuncios;
  if (categoria_id) {
    anuncios = db
      .prepare("SELECT * FROM anuncios WHERE categoria_id = ? AND status = 'ativo' ORDER BY criado_em DESC")
      .all(categoria_id);
  } else {
    anuncios = db.prepare("SELECT * FROM anuncios WHERE status = 'ativo' ORDER BY criado_em DESC").all();
  }

  const visiveis = anuncios.filter((anuncio) => {
    const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(anuncio.id_comerciante);
    return comerciante && comercianteVisivelPublicamente(comerciante);
  });

  res.json(visiveis.map(parseAnuncio));
});

// GET /api/anuncios/:id - detalhe publico (respeita regra de visibilidade)
router.get('/:id', (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio || anuncio.status !== 'ativo') {
    return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  }

  const comerciante = db.prepare('SELECT * FROM comerciantes WHERE id = ?').get(anuncio.id_comerciante);
  if (!comerciante || !comercianteVisivelPublicamente(comerciante)) {
    return res.status(404).json({ erro: 'Anuncio indisponivel.' });
  }

  res.json(parseAnuncio(anuncio));
});

// GET /api/anuncios/comerciante/:id_comerciante - lista de anuncios de um comerciante (publico, respeitando status)
router.get('/comerciante/:id_comerciante', (req, res) => {
  const comerciante = db
    .prepare('SELECT * FROM comerciantes WHERE id = ?')
    .get(req.params.id_comerciante);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  const anuncios = db
    .prepare("SELECT * FROM anuncios WHERE id_comerciante = ? AND status = 'ativo' ORDER BY criado_em DESC")
    .all(req.params.id_comerciante);

  const visivel = comercianteVisivelPublicamente(comerciante);
  res.json({
    visivel_publicamente: visivel,
    anuncios: visivel ? anuncios.map(parseAnuncio) : [],
  });
});

// GET /api/anuncios/meus/lista - anuncios do comerciante autenticado (painel, sem filtro de visibilidade)
router.get('/meus/lista', autenticar, (req, res) => {
  const anuncios = db
    .prepare('SELECT * FROM anuncios WHERE id_comerciante = ? ORDER BY criado_em DESC')
    .all(req.comerciante.id);
  res.json(anuncios.map(parseAnuncio));
});

// POST /api/anuncios - cria anuncio (autenticado), com upload de ate 6 fotos
// Novo anuncio sempre entra com status "pendente", aguardando aprovacao do admin.
router.post('/', autenticar, upload.array('fotos', 6), (req, res) => {
  const { titulo, descricao, categoria_id, tags, latitude, longitude } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'Campo "titulo" e obrigatorio.' });

  const fotos = (req.files || []).map((f) => `/assets/uploads/${f.filename}`);
  const tagsArray = tags
    ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim()))
    : [];

  const info = db
    .prepare(
      `INSERT INTO anuncios (titulo, descricao, categoria_id, fotos, tags, id_comerciante, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`
    )
    .run(
      titulo,
      descricao || '',
      categoria_id || null,
      JSON.stringify(fotos),
      JSON.stringify(tagsArray),
      req.comerciante.id,
      latitude || null,
      longitude || null
    );

  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(parseAnuncio(anuncio));
});

// PUT /api/anuncios/:id - atualiza anuncio (somente o dono)
router.put('/:id', autenticar, upload.array('fotos', 6), (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  if (anuncio.id_comerciante !== req.comerciante.id) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para editar este anuncio.' });
  }

  const { titulo, descricao, categoria_id, tags, latitude, longitude } = req.body;
  const novasFotos = (req.files || []).map((f) => `/assets/uploads/${f.filename}`);
  const fotosFinal = novasFotos.length > 0 ? novasFotos : JSON.parse(anuncio.fotos || '[]');
  const tagsArray = tags
    ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim()))
    : JSON.parse(anuncio.tags || '[]');

  db.prepare(
    `UPDATE anuncios SET titulo = ?, descricao = ?, categoria_id = ?, fotos = ?, tags = ?, latitude = ?, longitude = ? WHERE id = ?`
  ).run(
    titulo || anuncio.titulo,
    descricao !== undefined ? descricao : anuncio.descricao,
    categoria_id !== undefined ? categoria_id : anuncio.categoria_id,
    JSON.stringify(fotosFinal),
    JSON.stringify(tagsArray),
    latitude !== undefined ? latitude : anuncio.latitude,
    longitude !== undefined ? longitude : anuncio.longitude,
    req.params.id
  );

  const atualizado = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  res.json(parseAnuncio(atualizado));
});

// DELETE /api/anuncios/:id - remove anuncio (somente o dono)
router.delete('/:id', autenticar, (req, res) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  if (anuncio.id_comerciante !== req.comerciante.id) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para remover este anuncio.' });
  }

  db.prepare('DELETE FROM anuncios WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

module.exports = router;
