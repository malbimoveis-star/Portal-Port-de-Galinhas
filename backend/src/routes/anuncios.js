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

router.get('/', async (req, res) => {
  const { categoria_id } = req.query;

  let anuncios;
  if (categoria_id) {
    anuncios = await db.all("SELECT * FROM anuncios WHERE categoria_id = ? AND status = 'ativo' ORDER BY criado_em DESC", [categoria_id]);
  } else {
    anuncios = await db.all("SELECT * FROM anuncios WHERE status = 'ativo' ORDER BY criado_em DESC");
  }

  // NOTA (migração Postgres): Array.prototype.filter não suporta predicado
  // assíncrono (o retorno de uma função async dentro de filter() é sempre
  // uma Promise, que é truthy). Calculamos a visibilidade de cada anuncio
  // primeiro com Promise.all e depois filtramos pelo resultado, preservando
  // a mesma ordem e o mesmo resultado do filter() síncrono original.
  const visibilidade = await Promise.all(anuncios.map(async (anuncio) => {
    const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [anuncio.id_comerciante]);
    return Boolean(comerciante) && (await comercianteVisivelPublicamente(comerciante));
  }));

  const visiveis = anuncios.filter((_, idx) => visibilidade[idx]);

  res.json(visiveis.map(parseAnuncio));
});

router.get('/:id', async (req, res) => {
  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id]);
  if (!anuncio || anuncio.status !== 'ativo') {
    return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  }

  const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [anuncio.id_comerciante]);
  if (!comerciante || !(await comercianteVisivelPublicamente(comerciante))) {
    return res.status(404).json({ erro: 'Anuncio indisponivel.' });
  }

  res.json(parseAnuncio(anuncio));
});

router.get('/comerciante/:id_comerciante', async (req, res) => {
  const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.params.id_comerciante]);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  const anuncios = await db.all("SELECT * FROM anuncios WHERE id_comerciante = ? AND status = 'ativo' ORDER BY criado_em DESC", [req.params.id_comerciante]);
  const visivel = await comercianteVisivelPublicamente(comerciante);

  res.json({ visivel_publicamente: visivel, anuncios: visivel ? anuncios.map(parseAnuncio) : [] });
});

router.get('/meus/lista', autenticar, async (req, res) => {
  const anuncios = await db.all('SELECT * FROM anuncios WHERE id_comerciante = ? ORDER BY criado_em DESC', [req.comerciante.id]);
  res.json(anuncios.map(parseAnuncio));
});

router.post('/', autenticar, upload.array('fotos', 6), async (req, res) => {
  const { titulo, descricao, categoria_id, tags, endereco, latitude, longitude } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'Campo "titulo" e obrigatorio.' });

  const fotos = (req.files || []).map((f) => `/assets/uploads/${f.filename}`);
  const tagsArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim())) : [];

  const info = await db.run(
    `INSERT INTO anuncios (titulo, descricao, categoria_id, fotos, tags, id_comerciante, endereco, latitude, longitude, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    [
      titulo, descricao || '', categoria_id || null, JSON.stringify(fotos), JSON.stringify(tagsArray),
      req.comerciante.id, endereco || null, latitude || null, longitude || null
    ]
  );

  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(parseAnuncio(anuncio));
});

router.put('/:id', autenticar, upload.array('fotos', 6), async (req, res) => {
  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id]);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  if (anuncio.id_comerciante !== req.comerciante.id) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para editar este anuncio.' });
  }

  const { titulo, descricao, categoria_id, tags, endereco, latitude, longitude } = req.body;
  const novasFotos = (req.files || []).map((f) => `/assets/uploads/${f.filename}`);
  const fotosFinal = novasFotos.length > 0 ? novasFotos : JSON.parse(anuncio.fotos || '[]');
  const tagsArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim())) : JSON.parse(anuncio.tags || '[]');

  await db.run(
    `UPDATE anuncios SET titulo = ?, descricao = ?, categoria_id = ?, fotos = ?, tags = ?, endereco = ?, latitude = ?, longitude = ? WHERE id = ?`,
    [
      titulo || anuncio.titulo,
      descricao !== undefined ? descricao : anuncio.descricao,
      categoria_id !== undefined ? categoria_id : anuncio.categoria_id,
      JSON.stringify(fotosFinal), JSON.stringify(tagsArray),
      endereco !== undefined ? endereco : anuncio.endereco,
      latitude !== undefined ? latitude : anuncio.latitude,
      longitude !== undefined ? longitude : anuncio.longitude,
      req.params.id
    ]
  );

  res.json(parseAnuncio(await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id])));
});

router.delete('/:id', autenticar, async (req, res) => {
  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id]);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  if (anuncio.id_comerciante !== req.comerciante.id) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para remover este anuncio.' });
  }

  await db.run('DELETE FROM anuncios WHERE id = ?', [req.params.id]);
  res.json({ sucesso: true });
});

module.exports = router;
