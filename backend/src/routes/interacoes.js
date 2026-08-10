'use strict';

const express = require('express');
const db = require('../db/connection');

const router = express.Router();

function fotoValida(fotoKey) {
  return typeof fotoKey === 'string' && /^[0-9]+-[0-9]+$/.test(fotoKey);
}

router.get('/:fotoKey', (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  const curtida = db.prepare('SELECT contagem FROM foto_curtidas WHERE foto_key = ?').get(fotoKey);
  const comentarios = db.prepare('SELECT id, nome, texto, criado_em FROM foto_comentarios WHERE foto_key = ? ORDER BY criado_em ASC').all(fotoKey);
  res.json({ curtidas: curtida ? curtida.contagem : 0, comentarios });
});

router.post('/:fotoKey/curtir', (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  db.prepare(`
    INSERT INTO foto_curtidas (foto_key, contagem) VALUES (?, 1)
    ON CONFLICT(foto_key) DO UPDATE SET contagem = contagem + 1
  `).run(fotoKey);
  const atual = db.prepare('SELECT contagem FROM foto_curtidas WHERE foto_key = ?').get(fotoKey);
  res.json({ curtidas: atual.contagem });
});

router.post('/:fotoKey/descurtir', (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  db.prepare(`
    INSERT INTO foto_curtidas (foto_key, contagem) VALUES (?, 0)
    ON CONFLICT(foto_key) DO UPDATE SET contagem = MAX(contagem - 1, 0)
  `).run(fotoKey);
  const atual = db.prepare('SELECT contagem FROM foto_curtidas WHERE foto_key = ?').get(fotoKey);
  res.json({ curtidas: atual.contagem });
});

router.post('/:fotoKey/comentarios', (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  const { nome, texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ erro: 'Escreva um comentario.' });
  if (texto.length > 500) return res.status(400).json({ erro: 'Comentario muito longo (maximo 500 caracteres).' });

  const info = db.prepare('INSERT INTO foto_comentarios (foto_key, nome, texto) VALUES (?, ?, ?)')
    .run(fotoKey, (nome || 'Visitante').slice(0, 60), texto.trim());

  res.status(201).json(db.prepare('SELECT id, nome, texto, criado_em FROM foto_comentarios WHERE id = ?').get(info.lastInsertRowid));
});

module.exports = router;
