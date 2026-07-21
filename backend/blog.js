'use strict';

const express = require('express');
const crypto = require('crypto');

const db = require('../db/connection');

const router = express.Router();


// =========================================================
// AUXILIAR — GERAR SLUG
// =========================================================

function gerarSlug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


// =========================================================
// AUXILIAR — SLUG ÚNICO
// =========================================================

function gerarSlugUnico(titulo) {

  const slugBase =
    gerarSlug(titulo) ||
    `artigo-${Date.now()}`;

  let slug = slugBase;

  let contador = 2;

  while (
    db
      .prepare(
        'SELECT id FROM artigos WHERE slug = ?'
      )
      .get(slug)
  ) {

    slug =
      `${slugBase}-${contador}`;

    contador++;

  }

  return slug;

}


// =========================================================
// LISTAR ARTIGOS PUBLICADOS
// GET /api/blog
// =========================================================

router.get(
  '/',
  (req, res) => {

    try {

      const idioma =
        req.query.idioma ||
        'pt-BR';


      const artigos =
        db
          .prepare(`
            SELECT
              a.id,
              a.slug,
              a.capa_url,
              a.publicado,
              a.criado_em,
              a.atualizado_em,

              t.idioma,
              t.titulo,
              t.resumo,
              t.conteudo,
              t.seo_titulo,
              t.seo_descricao,
              t.seo_keywords

            FROM artigos a

            INNER JOIN artigo_traducoes t
              ON t.artigo_id = a.id

            WHERE a.publicado = 1
              AND t.idioma = ?

            ORDER BY a.criado_em DESC
          `)
          .all(idioma);


      res.json(artigos);


    } catch (erro) {

      console.error(
        '[BLOG] Erro ao listar artigos:',
        erro
      );


      res
        .status(500)
        .json({
          erro:
            'Erro ao carregar artigos.'
        });

    }

  }
);


// =========================================================
// CRIAR ARTIGO
// POST /api/blog
// =========================================================

router.post(
  '/',
  (req, res) => {

    try {

      const {
        titulo,
        resumo,
        capa_url,
        conteudo,
        publicado,
        idioma
      } = req.body;


      if (!titulo || !titulo.trim()) {

        return res
          .status(400)
          .json({
            erro:
              'O título do artigo é obrigatório.'
          });

      }


      if (!conteudo || !conteudo.trim()) {

        return res
          .status(400)
          .json({
            erro:
              'O conteúdo do artigo é obrigatório.'
          });

      }


      const idiomaFinal =
        idioma ||
        'pt-BR';


      const slug =
        gerarSlugUnico(titulo);


      const artigoPublicado =
        publicado === false ||
        publicado === 0 ||
        publicado === '0'
          ? 0
          : 1;


      const criarArtigo =
        db.prepare(`
          INSERT INTO artigos (
            slug,
            capa_url,
            publicado
          )
          VALUES (?, ?, ?)
        `);


      const resultado =
        criarArtigo.run(
          slug,
          capa_url || null,
          artigoPublicado
        );


      const artigoId =
        resultado.lastInsertRowid;


      const criarTraducao =
        db.prepare(`
          INSERT INTO artigo_traducoes (
            artigo_id,
            idioma,
            titulo,
            resumo,
            conteudo
          )
          VALUES (?, ?, ?, ?, ?)
        `);


      criarTraducao.run(
        artigoId,
        idiomaFinal,
        titulo.trim(),
        resumo || '',
        conteudo
      );


      const artigo =
        db
          .prepare(`
            SELECT
              a.id,
              a.slug,
              a.capa_url,
              a.publicado,
              a.criado_em,
              a.atualizado_em,

              t.idioma,
              t.titulo,
              t.resumo,
              t.conteudo

            FROM artigos a

            INNER JOIN artigo_traducoes t
              ON t.artigo_id = a.id

            WHERE a.id = ?
              AND t.idioma = ?
          `)
          .get(
            artigoId,
            idiomaFinal
          );


      return res
        .status(201)
        .json(artigo);


    } catch (erro) {

      console.error(
        '[BLOG] Erro ao criar artigo:',
        erro
      );


      return res
        .status(500)
        .json({
          erro:
            'Erro ao salvar artigo.'
        });

    }

  }
);


// =========================================================
// LISTAR TODOS OS ARTIGOS — ADMIN
// GET /api/blog/admin/todos
// =========================================================

router.get(
  '/admin/todos',
  (req, res) => {

    try {

      const artigos =
        db
          .prepare(`
            SELECT
              a.id,
              a.slug,
              a.capa_url,
              a.publicado,
              a.criado_em,
              a.atualizado_em,

              t.idioma,
              t.titulo,
              t.resumo,
              t.conteudo

            FROM artigos a

            LEFT JOIN artigo_traducoes t
              ON t.artigo_id = a.id

            ORDER BY a.criado_em DESC
          `)
          .all();


      res.json(artigos);


    } catch (erro) {

      console.error(
        '[BLOG ADMIN] Erro ao listar artigos:',
        erro
      );


      res
        .status(500)
        .json({
          erro:
            'Erro ao carregar artigos.'
        });

    }

  }
);


// =========================================================
// BUSCAR ARTIGO POR SLUG
// GET /api/blog/artigo/:slug
// =========================================================

router.get(
  '/artigo/:slug',
  (req, res) => {

    try {

      const idioma =
        req.query.idioma ||
        'pt-BR';


      const artigo =
        db
          .prepare(`
            SELECT
              a.id,
              a.slug,
              a.capa_url,
              a.publicado,
              a.criado_em,
              a.atualizado_em,

              t.idioma,
              t.titulo,
              t.resumo,
              t.conteudo,
              t.seo_titulo,
              t.seo_descricao,
              t.seo_keywords

            FROM artigos a

            INNER JOIN artigo_traducoes t
              ON t.artigo_id = a.id

            WHERE a.slug = ?
              AND t.idioma = ?
          `)
          .get(
            req.params.slug,
            idioma
          );


      if (!artigo) {

        return res
          .status(404)
          .json({
            erro:
              'Artigo não encontrado.'
          });

      }


      res.json(artigo);


    } catch (erro) {

      console.error(
        '[BLOG] Erro ao buscar artigo:',
        erro
      );


      res
        .status(500)
        .json({
          erro:
            'Erro ao carregar artigo.'
        });

    }

  }
);


// =========================================================
// EXCLUIR ARTIGO
// DELETE /api/blog/:id
// =========================================================

router.delete(
  '/:id',
  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      if (!Number.isInteger(id)) {

        return res
          .status(400)
          .json({
            erro:
              'ID de artigo inválido.'
          });

      }


      const artigo =
        db
          .prepare(
            'SELECT id FROM artigos WHERE id = ?'
          )
          .get(id);


      if (!artigo) {

        return res
          .status(404)
          .json({
            erro:
              'Artigo não encontrado.'
          });

      }


      db
        .prepare(
          'DELETE FROM artigos WHERE id = ?'
        )
        .run(id);


      res.json({
        sucesso: true,
        mensagem:
          'Artigo excluído com sucesso.'
      });


    } catch (erro) {

      console.error(
        '[BLOG] Erro ao excluir artigo:',
        erro
      );


      res
        .status(500)
        .json({
          erro:
            'Erro ao excluir artigo.'
        });

    }

  }
);


module.exports = router;
