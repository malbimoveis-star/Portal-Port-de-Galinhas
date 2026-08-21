'use strict';

const express = require('express');
const db = require('../db/connection');

const router = express.Router();

function fotoValida(fotoKey) {
  return typeof fotoKey === 'string' && /^[0-9]+-[0-9]+$/.test(fotoKey);
}

router.get('/:fotoKey', async (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  const curtida = await db.get('SELECT contagem FROM foto_curtidas WHERE foto_key = ?', [fotoKey]);
  const naoGostei = await db.get('SELECT contagem FROM foto_nao_gostei WHERE foto_key = ?', [fotoKey]);
  const comentarios = await db.all('SELECT id, nome, texto, criado_em FROM foto_comentarios WHERE foto_key = ? ORDER BY criado_em ASC', [fotoKey]);
  res.json({
    curtidas: curtida ? curtida.contagem : 0,
    naoGostei: naoGostei ? naoGostei.contagem : 0,
    comentarios,
  });
});

router.post('/:fotoKey/curtir', async (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  await db.run(`
    INSERT INTO foto_curtidas (foto_key, contagem) VALUES (?, 1)
    ON CONFLICT(foto_key) DO UPDATE SET contagem = contagem + 1
  `, [fotoKey]);
  const atual = await db.get('SELECT contagem FROM foto_curtidas WHERE foto_key = ?', [fotoKey]);
  res.json({ curtidas: atual.contagem });
});

router.post('/:fotoKey/descurtir', async (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  // NOTA (migração Postgres): SQLite aceita MAX(a, b) como função escalar
  // (o maior entre dois valores). No Postgres, MAX() só existe como função
  // de agregação; o equivalente escalar é GREATEST(a, b). Troca obrigatória
  // para nao quebrar em runtime - sem isso o Postgres rejeita a query.
  await db.run(`
    INSERT INTO foto_curtidas (foto_key, contagem) VALUES (?, 0)
    ON CONFLICT(foto_key) DO UPDATE SET contagem = GREATEST(contagem - 1, 0)
  `, [fotoKey]);
  const atual = await db.get('SELECT contagem FROM foto_curtidas WHERE foto_key = ?', [fotoKey]);
  res.json({ curtidas: atual.contagem });
});

// Fase 4: reacao "nao gostei" ao lado do curtir (nao substitui, convive com
// ele - pedido explicito do cliente). Mesmo padrao de contador simples via
// UPSERT usado em curtir/descurtir.
router.post('/:fotoKey/nao-gostei', async (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  await db.run(`
    INSERT INTO foto_nao_gostei (foto_key, contagem) VALUES (?, 1)
    ON CONFLICT(foto_key) DO UPDATE SET contagem = contagem + 1
  `, [fotoKey]);
  const atual = await db.get('SELECT contagem FROM foto_nao_gostei WHERE foto_key = ?', [fotoKey]);
  res.json({ naoGostei: atual.contagem });
});

router.post('/:fotoKey/desfazer-nao-gostei', async (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  await db.run(`
    INSERT INTO foto_nao_gostei (foto_key, contagem) VALUES (?, 0)
    ON CONFLICT(foto_key) DO UPDATE SET contagem = GREATEST(contagem - 1, 0)
  `, [fotoKey]);
  const atual = await db.get('SELECT contagem FROM foto_nao_gostei WHERE foto_key = ?', [fotoKey]);
  res.json({ naoGostei: atual.contagem });
});

router.post('/:fotoKey/comentarios', async (req, res) => {
  const { fotoKey } = req.params;
  if (!fotoValida(fotoKey)) return res.status(400).json({ erro: 'Identificador de foto invalido.' });

  const { nome, texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ erro: 'Escreva um comentario.' });
  if (texto.length > 500) return res.status(400).json({ erro: 'Comentario muito longo (maximo 500 caracteres).' });

  const info = await db.run('INSERT INTO foto_comentarios (foto_key, nome, texto) VALUES (?, ?, ?)', [
    fotoKey, (nome || 'Visitante').slice(0, 60), texto.trim()
  ]);

  res.status(201).json(await db.get('SELECT id, nome, texto, criado_em FROM foto_comentarios WHERE id = ?', [info.lastInsertRowid]));
});

module.exports = router;
