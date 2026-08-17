'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');

const router = express.Router();

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

function obterCapa(body = {}) {
  const capaInformada =
    body.capa_url ??
    body.capa ??
    body.imagem_capa ??
    null;

  if (
    typeof capaInformada === 'string' &&
    capaInformada.trim()
  ) {
    return capaInformada.trim();
  }

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

router.get(
  '/',
  async (req, res) => {

    try {

      const artigos =
        await db.all(`
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
        `);

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

router.get(
  '/admin',
  autenticarAdmin,
  async (req, res) => {

    try {

      const artigos =
        await db.all(`
          SELECT *
          FROM artigos
          ORDER BY criado_em DESC
        `);

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

router.get(
  '/admin/todos',
  autenticarAdmin,
  async (req, res) => {

    try {

      const artigos =
        await db.all(`
          SELECT *
          FROM artigos
          ORDER BY criado_em DESC
        `);

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

router.get(
  '/admin/:id',
  autenticarAdmin,
  async (req, res) => {

    try {

      const artigo =
        await db.get(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `, [
          req.params.id
        ]);

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

router.post(
  '/',
  autenticarAdmin,
  async (req, res) => {

    try {

      const {
        titulo,
        resumo,
        conteudo,
        publicado
      } = req.body;

      const capa_url =
        obterCapa(
          req.body
        );

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

      const resultado =
        await db.run(`
          INSERT INTO artigos (
            titulo,
            resumo,
            conteudo,
            capa_url,
            publicado
          )
          VALUES (?, ?, ?, ?, ?)
        `, [

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
        ]);

      const artigo =
        await db.get(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `, [
          resultado.lastInsertRowid
        ]);

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

router.put(
  '/:id',
  autenticarAdmin,
  async (req, res) => {

    try {

      const artigo =
        await db.get(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `, [
          req.params.id
        ]);

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

      const novoPublicado =
        publicado !== undefined
          ? normalizarPublicado(
              publicado
            )
          : artigo.publicado;

      if (!novoTitulo) {

        return res.status(400).json({
          erro:
            'O título do artigo é obrigatório.'
        });
      }

      if (
        !novoConteudo ||
        !novoConteudo.trim()
      ) {

        return res.status(400).json({
          erro:
            'O conteúdo do artigo é obrigatório.'
        });
      }

      await db.run(`
        UPDATE artigos
        SET
          titulo = ?,
          resumo = ?,
          conteudo = ?,
          capa_url = ?,
          publicado = ?
        WHERE id = ?
      `, [

        novoTitulo,

        novoResumo,

        novoConteudo,

        novaCapa,

        novoPublicado,

        req.params.id
      ]);

      const atualizado =
        await db.get(`
          SELECT *
          FROM artigos
          WHERE id = ?
        `, [
          req.params.id
        ]);

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

router.delete(
  '/:id',
  autenticarAdmin,
  async (req, res) => {

    try {

      const artigo =
        await db.get(`
          SELECT id
          FROM artigos
          WHERE id = ?
        `, [
          req.params.id
        ]);

      if (!artigo) {

        return res.status(404).json({
          erro:
            'Artigo não encontrado.'
        });
      }

      await db.run(`
        DELETE FROM artigos
        WHERE id = ?
      `, [
        req.params.id
      ]);

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

router.get(
  '/:id',
  async (req, res) => {

    try {

      const artigo =
        await db.get(`
          SELECT *
          FROM artigos
          WHERE id = ?
            AND publicado = 1
        `, [
          req.params.id
        ]);

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

module.exports = router;
