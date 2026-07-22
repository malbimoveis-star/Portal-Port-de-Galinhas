'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');

const router = express.Router();

// =========================================================
// AUXILIARES
// =========================================================

function normalizarPublicado(valor, padrao = 1) {
  if (valor === undefined || valor === null) {
    return padrao;
  }

  if (
    valor === false ||
    valor === 0 ||
    valor === '0' ||
    valor === 'false' ||
    valor === 'off'
  ) {
    return 0;
  }

  return 1;
}

// =========================================================
// OBTER CAPA
// =========================================================

function obterCapa(body = {}) {
  const capaInformada =
    body.capa_url ??
    body.capa ??
    body.imagem_capa ??
    null;

  // -------------------------------------------------------
  // CAPA INFORMADA MANUALMENTE
  // -------------------------------------------------------

  if (
    typeof capaInformada === 'string' &&
    capaInformada.trim()
  ) {
    return capaInformada.trim();
  }

  // -------------------------------------------------------
  // PROCURAR PRIMEIRA IMAGEM NO CONTEÚDO
  // -------------------------------------------------------

  const conteudo =
    typeof body.conteudo === 'string'
      ? body.conteudo
      : '';

  if (!conteudo) {
    return null;
  }

  const resultado =
    conteudo.match(
      /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i
    );

  if (
    resultado &&
    resultado[1]
  ) {
    return resultado[1].trim();
  }

  return null;
}

// =========================================================
// BLOG PÚBLICO
// GET /api/blog
// =========================================================

router.get(
  '/',
  (req, res) => {

    try {

      const artigos =
        db.prepare(`
          SELECT
            id,
            titulo,
            resumo,
            conteudo,
            capa_url,
            publicado,
            criado_em
          FROM artigos
          WHERE publicado = 1
          ORDER BY criado_em DESC
        `).all();

      return res.json(
        artigos
      );

    } catch (err) {

      console.error(
        '[BLOG] Erro ao listar artigos:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar artigos.'
      });
    }
  }
);

// =========================================================
// ADMIN
// GET /api/blog/admin
// =========================================================

router.get(
  '/admin',
  autenticarAdmin,
  (req, res) => {

    try {

      const artigos =
        db.prepare(`
          SELECT *
          FROM artigos
          ORDER BY criado_em DESC
        `).all();

      return res.json(
        artigos
      );

    } catch (err) {

      console.error(
        '[BLOG ADMIN] Erro ao listar artigos:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar artigos administrativos.'
      });
    }
  }
);

// =========================================================
// ADMIN
// GET /api/blog/admin/todos
// =========================================================

router.get(
  '/admin/todos',
  autenticarAdmin,
  (req, res) => {

    try {

      const artigos =
        db.prepare(`
          SELECT *
          FROM artigos
          ORDER BY criado_em DESC
        `).all();

      return res.json(
        artigos
      );

    } catch (err) {

      console.error(
        '[BLOG ADMIN] Erro ao listar todos os artigos:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar artigos administrativos.'
      });
    }
  }
);

// =========================================================
// ADMIN - OBTER ARTIGO PARA EDIÇÃO
// GET /api/blog/admin/:id
// =========================================================
//
// Esta rota é usada pelo botão "Editar" do painel administrativo.
//
// IMPORTANTE:
// Ela precisa ficar ANTES de:
// GET /api/blog/:id
//
// Assim o Express não interpreta "admin" como sendo um ID.
//

router.get(
  '/admin/:id',
  autenticarAdmin,
  (req, res) => {

    try {

      const artigo =
        db.prepare(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `).get(
          req.params.id
        );

      if (!artigo) {

        return res.status(404).json({
          erro:
            'Artigo não encontrado.'
        });
      }

      console.log(
        '[BLOG ADMIN] Artigo carregado para edição:',
        artigo.id
      );

      return res.json(
        artigo
      );

    } catch (err) {

      console.error(
        '[BLOG ADMIN] Erro ao carregar artigo para edição:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar artigo para edição: ' +
          err.message
      });
    }
  }
);

// =========================================================
// ADMIN - CRIAR ARTIGO
// POST /api/blog
// =========================================================

router.post(
  '/',
  autenticarAdmin,
  (req, res) => {

    try {

      const {
        titulo,
        resumo,
        conteudo,
        publicado
      } = req.body;

      // -----------------------------------------------------
      // OBTER CAPA
      // -----------------------------------------------------

      const capa_url =
        obterCapa(
          req.body
        );

      // -----------------------------------------------------
      // VALIDAR TÍTULO
      // -----------------------------------------------------

      if (
        !titulo ||
        typeof titulo !== 'string' ||
        !titulo.trim()
      ) {

        return res.status(400).json({
          erro:
            'O título do artigo é obrigatório.'
        });
      }

      // -----------------------------------------------------
      // VALIDAR CONTEÚDO
      // -----------------------------------------------------

      if (
        !conteudo ||
        typeof conteudo !== 'string' ||
        !conteudo.trim()
      ) {

        return res.status(400).json({
          erro:
            'O conteúdo do artigo é obrigatório.'
        });
      }

      // -----------------------------------------------------
      // SALVAR ARTIGO
      // -----------------------------------------------------

      const resultado =
        db.prepare(`
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

          typeof resumo === 'string'
            ? resumo.trim()
            : '',

          conteudo,

          capa_url || null,

          normalizarPublicado(
            publicado,
            1
          )
        );

      // -----------------------------------------------------
      // BUSCAR ARTIGO CRIADO
      // -----------------------------------------------------

      const artigo =
        db.prepare(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `).get(
          resultado.lastInsertRowid
        );

      console.log(
        '[BLOG] Artigo salvo com sucesso:',
        artigo
      );

      return res
        .status(201)
        .json(
          artigo
        );

    } catch (err) {

      console.error(
        '[BLOG] ERRO AO SALVAR ARTIGO:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao salvar artigo: ' +
          err.message
      });
    }
  }
);

// =========================================================
// ADMIN - EDITAR ARTIGO
// PUT /api/blog/:id
// =========================================================

router.put(
  '/:id',
  autenticarAdmin,
  (req, res) => {

    try {

      const artigo =
        db.prepare(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `).get(
          req.params.id
        );

      if (!artigo) {

        return res.status(404).json({
          erro:
            'Artigo não encontrado.'
        });
      }

      const {
        titulo,
        resumo,
        conteudo,
        publicado
      } = req.body;

      // -----------------------------------------------------
      // DADOS ATUAIS
      // -----------------------------------------------------

      const novoTitulo =
        titulo !== undefined
          ? String(titulo).trim()
          : artigo.titulo;

      const novoResumo =
        resumo !== undefined
          ? String(resumo).trim()
          : (
              artigo.resumo ||
              ''
            );

      const novoConteudo =
        conteudo !== undefined
          ? String(conteudo)
          : artigo.conteudo;

      // -----------------------------------------------------
      // OBTER NOVA CAPA
      // -----------------------------------------------------

      let novaCapa;

      const capaInformada =
        req.body.capa_url ??
        req.body.capa ??
        req.body.imagem_capa ??
        null;

      if (
        typeof capaInformada === 'string' &&
        capaInformada.trim()
      ) {

        novaCapa =
          capaInformada.trim();

      } else if (
        conteudo !== undefined
      ) {

        const capaAutomatica =
          obterCapa({
            conteudo:
              novoConteudo
          });

        novaCapa =
          capaAutomatica ||
          artigo.capa_url ||
          null;

      } else {

        novaCapa =
          artigo.capa_url ||
          null;
      }

      // -----------------------------------------------------
      // PUBLICADO
      // -----------------------------------------------------

      const novoPublicado =
        publicado !== undefined
          ? normalizarPublicado(
              publicado
            )
          : artigo.publicado;

      // -----------------------------------------------------
      // VALIDAR TÍTULO
      // -----------------------------------------------------

      if (!novoTitulo) {

        return res.status(400).json({
          erro:
            'O título do artigo é obrigatório.'
        });
      }

      // -----------------------------------------------------
      // VALIDAR CONTEÚDO
      // -----------------------------------------------------

      if (
        !novoConteudo ||
        !novoConteudo.trim()
      ) {

        return res.status(400).json({
          erro:
            'O conteúdo do artigo é obrigatório.'
        });
      }

      // -----------------------------------------------------
      // ATUALIZAR
      // -----------------------------------------------------

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

      // -----------------------------------------------------
      // RETORNAR ATUALIZADO
      // -----------------------------------------------------

      const atualizado =
        db.prepare(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `).get(
          req.params.id
        );

      console.log(
        '[BLOG ADMIN] Artigo atualizado:',
        atualizado
      );

      return res.json(
        atualizado
      );

    } catch (err) {

      console.error(
        '[BLOG ADMIN] Erro ao editar artigo:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao atualizar artigo: ' +
          err.message
      });
    }
  }
);

// =========================================================
// ADMIN - EXCLUIR ARTIGO
// DELETE /api/blog/:id
// =========================================================

router.delete(
  '/:id',
  autenticarAdmin,
  (req, res) => {

    try {

      const artigo =
        db.prepare(`
          SELECT id
          FROM artigos
          WHERE id = ?
        `).get(
          req.params.id
        );

      if (!artigo) {

        return res.status(404).json({
          erro:
            'Artigo não encontrado.'
        });
      }

      db.prepare(`
        DELETE FROM artigos
        WHERE id = ?
      `).run(
        req.params.id
      );

      return res.json({
        sucesso:
          true,

        mensagem:
          'Artigo excluído com sucesso.'
      });

    } catch (err) {

      console.error(
        '[BLOG ADMIN] Erro ao excluir artigo:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao excluir artigo: ' +
          err.message
      });
    }
  }
);

// =========================================================
// BLOG PÚBLICO - DETALHE
// GET /api/blog/:id
// =========================================================

router.get(
  '/:id',
  (req, res) => {

    try {

      const artigo =
        db.prepare(`
          SELECT *
          FROM artigos
          WHERE id = ?
            AND publicado = 1
        `).get(
          req.params.id
        );

      if (!artigo) {

        return res.status(404).json({
          erro:
            'Artigo não encontrado.'
        });
      }

      return res.json(
        artigo
      );

    } catch (err) {

      console.error(
        '[BLOG] Erro ao buscar artigo:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar artigo.'
      });
    }
  }
);

// =========================================================
// EXPORTAR
// =========================================================

module.exports = router;
