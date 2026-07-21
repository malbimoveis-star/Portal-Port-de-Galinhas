'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');

const router = express.Router();

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function normalizarPublicado(valor, padrao = 1) {
  if (valor === undefined || valor === null) {
    return padrao;
  }

  return valor ? 1 : 0;
}

function obterCapa(body) {
  // Aceita os formatos antigos e novos enviados pelo frontend
  return (
    body.capa_url ??
    body.capa ??
    body.imagem_capa ??
    null
  );
}

// =========================================================
// BLOG PÚBLICO
// =========================================================

// GET /api/blog
// Lista somente artigos publicados
router.get('/', (req, res) => {
  try {
    const artigos = db.prepare(`
      SELECT
        id,
        titulo,
        resumo,
        capa_url,
        criado_em
      FROM artigos
      WHERE publicado = 1
      ORDER BY criado_em DESC
    `).all();

    return res.json(artigos);

  } catch (err) {
    console.error('[blog] Erro ao listar artigos:', err);

    return res.status(500).json({
      erro: 'Erro ao carregar artigos.'
    });
  }
});

// =========================================================
// BLOG PÚBLICO - DETALHE
// =========================================================

// GET /api/blog/:id
// Retorna um artigo publicado
router.get('/:id', (req, res) => {
  try {
    const artigo = db.prepare(`
      SELECT *
      FROM artigos
      WHERE id = ?
        AND publicado = 1
    `).get(req.params.id);

    if (!artigo) {
      return res.status(404).json({
        erro: 'Artigo nao encontrado.'
      });
    }

    return res.json(artigo);

  } catch (err) {
    console.error('[blog] Erro ao buscar artigo:', err);

    return res.status(500).json({
      erro: 'Erro ao carregar artigo.'
    });
  }
});

// =========================================================
// ADMINISTRAÇÃO
// =========================================================

// GET /api/blog/admin
// Lista todos os artigos para o painel administrativo
//
// Esta é a rota que o seu painel-admin.js está chamando.
router.get('/admin', autenticarAdmin, (req, res) => {
  try {
    const artigos = db.prepare(`
      SELECT *
      FROM artigos
      ORDER BY criado_em DESC
    `).all();

    return res.json(artigos);

  } catch (err) {
    console.error('[blog admin] Erro ao listar artigos:', err);

    return res.status(500).json({
      erro: 'Erro ao carregar artigos administrativos.'
    });
  }
});

// Mantém também a rota antiga funcionando
// GET /api/blog/admin/todos
router.get('/admin/todos', autenticarAdmin, (req, res) => {
  try {
    const artigos = db.prepare(`
      SELECT *
      FROM artigos
      ORDER BY criado_em DESC
    `).all();

    return res.json(artigos);

  } catch (err) {
    console.error('[blog admin] Erro ao listar todos os artigos:', err);

    return res.status(500).json({
      erro: 'Erro ao carregar artigos administrativos.'
    });
  }
});

// =========================================================
// ADMIN - CRIAR ARTIGO
// =========================================================

// POST /api/blog
router.post('/', autenticarAdmin, (req, res) => {
  try {
    const {
      titulo,
      resumo,
      conteudo,
      publicado
    } = req.body;

    const capa_url = obterCapa(req.body);

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({
        erro: 'O titulo do artigo e obrigatorio.'
      });
    }

    if (!conteudo || !conteudo.trim()) {
      return res.status(400).json({
        erro: 'O conteudo do artigo e obrigatorio.'
      });
    }

    const info = db.prepare(`
      INSERT INTO artigos (
        titulo,
        resumo,
        conteudo,
        capa_url,
        publicado
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      titulo.trim(),
      resumo ? resumo.trim() : '',
      conteudo,
      capa_url || null,
      normalizarPublicado(publicado, 1)
    );

    const artigo = db.prepare(`
      SELECT *
      FROM artigos
      WHERE id = ?
    `).get(info.lastInsertRowid);

    return res.status(201).json(artigo);

  } catch (err) {
    console.error('[blog admin] Erro ao criar artigo:', err);

    return res.status(500).json({
      erro: 'Erro ao salvar artigo.'
    });
  }
});

// =========================================================
// ADMIN - EDITAR ARTIGO
// =========================================================

// PUT /api/blog/:id
router.put('/:id', autenticarAdmin, (req, res) => {
  try {
    const artigo = db.prepare(`
      SELECT *
      FROM artigos
      WHERE id = ?
    `).get(req.params.id);

    if (!artigo) {
      return res.status(404).json({
        erro: 'Artigo nao encontrado.'
      });
    }

    const {
      titulo,
      resumo,
      conteudo,
      publicado
    } = req.body;

    const capa_url = obterCapa(req.body);

    const novoTitulo =
      titulo !== undefined
        ? titulo.trim()
        : artigo.titulo;

    const novoResumo =
      resumo !== undefined
        ? resumo.trim()
        : artigo.resumo;

    const novoConteudo =
      conteudo !== undefined
        ? conteudo
        : artigo.conteudo;

    const novaCapa =
      capa_url !== null
        ? capa_url
        : artigo.capa_url;

    const novoPublicado =
      publicado !== undefined
        ? normalizarPublicado(publicado)
        : artigo.publicado;

    if (!novoTitulo) {
      return res.status(400).json({
        erro: 'O titulo do artigo e obrigatorio.'
      });
    }

    if (!novoConteudo || !novoConteudo.trim()) {
      return res.status(400).json({
        erro: 'O conteudo do artigo e obrigatorio.'
      });
    }

    db.prepare(`
      UPDATE artigos
      SET
        titulo = ?,
        resumo = ?,
        conteudo = ?,
        capa_url = ?,
        publicado = ?
      WHERE id = ?
    `).run(
      novoTitulo,
      novoResumo,
      novoConteudo,
      novaCapa,
      novoPublicado,
      req.params.id
    );

    const atualizado = db.prepare(`
      SELECT *
      FROM artigos
      WHERE id = ?
    `).get(req.params.id);

    return res.json(atualizado);

  } catch (err) {
    console.error('[blog admin] Erro ao editar artigo:', err);

    return res.status(500).json({
      erro: 'Erro ao atualizar artigo.'
    });
  }
});

// =========================================================
// ADMIN - EXCLUIR ARTIGO
// =========================================================

// DELETE /api/blog/:id
router.delete('/:id', autenticarAdmin, (req, res) => {
  try {
    const artigo = db.prepare(`
      SELECT *
      FROM artigos
      WHERE id = ?
    `).get(req.params.id);

    if (!artigo) {
      return res.status(404).json({
        erro: 'Artigo nao encontrado.'
      });
    }

    db.prepare(`
      DELETE FROM artigos
      WHERE id = ?
    `).run(req.params.id);

    return res.json({
      sucesso: true,
      mensagem: 'Artigo excluido com sucesso.'
    });

  } catch (err) {
    console.error('[blog admin] Erro ao excluir artigo:', err);

    return res.status(500).json({
      erro: 'Erro ao excluir artigo.'
    });
  }
});

module.exports = router;
