'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { comercianteVisivelPublicamente } = require('../utils/status');

const router = express.Router();

// =========================================================
// AUXILIAR
// =========================================================

function parseJsonSeguro(valor, padrao = []) {
  if (!valor) {
    return padrao;
  }

  try {
    const resultado = JSON.parse(valor);

    return resultado;
  } catch (err) {
    console.error(
      '[ANUNCIOS] Erro ao interpretar JSON:',
      err
    );

    return padrao;
  }
}


// =========================================================
// AUXILIAR
// CONVERTER ANÚNCIO
// =========================================================

function parseAnuncio(anuncio) {
  if (!anuncio) {
    return anuncio;
  }

  return {
    ...anuncio,

    fotos:
      parseJsonSeguro(
        anuncio.fotos,
        []
      ),

    tags:
      parseJsonSeguro(
        anuncio.tags,
        []
      )
  };
}


// =========================================================
// GET /api/anuncios
// =========================================================
//
// Lista pública de anúncios.
//
// Somente:
// - anúncios com status "ativo";
// - comerciantes publicamente visíveis.
//
// Filtros opcionais:
// ?categoria_id=
// ?destaque=1
//
// =========================================================

router.get(
  '/',
  (req, res) => {

    try {

      const {
        categoria_id
      } = req.query;


      let anuncios;


      if (categoria_id) {

        anuncios =
          db
            .prepare(`
              SELECT *
              FROM anuncios
              WHERE categoria_id = ?
                AND status = 'ativo'
              ORDER BY criado_em DESC
            `)
            .all(
              categoria_id
            );

      } else {

        anuncios =
          db
            .prepare(`
              SELECT *
              FROM anuncios
              WHERE status = 'ativo'
              ORDER BY criado_em DESC
            `)
            .all();

      }


      const visiveis =
        anuncios.filter(
          (anuncio) => {

            const comerciante =
              db
                .prepare(`
                  SELECT *
                  FROM comerciantes
                  WHERE id = ?
                `)
                .get(
                  anuncio.id_comerciante
                );


            return (
              comerciante &&
              comercianteVisivelPublicamente(
                comerciante
              )
            );

          }
        );


      return res.json(
        visiveis.map(
          parseAnuncio
        )
      );


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao listar anúncios:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao carregar anúncios.'

      });

    }

  }
);


// =========================================================
// GET /api/anuncios/comerciante/:id_comerciante
// =========================================================
//
// IMPORTANTE:
// Esta rota precisa ficar ANTES de:
//
// GET /api/anuncios/:id
//
// Caso contrário:
//
// /comerciante/123
//
// pode ser interpretado como:
//
// /:id
//
// com:
// req.params.id = "comerciante"
//
// =========================================================

router.get(
  '/comerciante/:id_comerciante',
  (req, res) => {

    try {

      const comerciante =
        db
          .prepare(`
            SELECT *
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id_comerciante
          );


      if (!comerciante) {

        return res.status(404).json({

          erro:
            'Comerciante não encontrado.'

        });

      }


      // -----------------------------------------------------
      // VERIFICAR VISIBILIDADE PÚBLICA
      // -----------------------------------------------------

      const visivel =
        comercianteVisivelPublicamente(
          comerciante
        );


      // -----------------------------------------------------
      // BUSCAR ANÚNCIOS ATIVOS
      // -----------------------------------------------------

      const anuncios =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id_comerciante = ?
              AND status = 'ativo'
            ORDER BY criado_em DESC
          `)
          .all(
            req.params.id_comerciante
          );


      // -----------------------------------------------------
      // RETORNAR
      // -----------------------------------------------------

      return res.json({

        visivel_publicamente:
          visivel,

        anuncios:
          visivel
            ? anuncios.map(
                parseAnuncio
              )
            : []

      });


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao buscar anúncios do comerciante:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao carregar anúncios do comerciante.'

      });

    }

  }
);


// =========================================================
// GET /api/anuncios/meus/lista
// =========================================================
//
// Lista todos os anúncios do comerciante autenticado.
//
// Inclui:
// - ativos;
// - pendentes;
// - rejeitados;
// - outros status.
//
// Não depende da visibilidade pública.
//
// =========================================================

router.get(
  '/meus/lista',
  autenticar,
  (req, res) => {

    try {

      const anuncios =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id_comerciante = ?
            ORDER BY criado_em DESC
          `)
          .all(
            req.comerciante.id
          );


      return res.json(

        anuncios.map(
          parseAnuncio
        )

      );


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao listar anúncios do comerciante:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao carregar seus anúncios.'

      });

    }

  }
);


// =========================================================
// GET /api/anuncios/:id
// =========================================================
//
// Detalhe público de um anúncio.
//
// Somente anúncios ativos
// de comerciantes publicamente visíveis.
//
// IMPORTANTE:
// Esta rota fica DEPOIS das rotas específicas.
//
// =========================================================

router.get(
  '/:id',
  (req, res) => {

    try {

      const anuncio =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (
        !anuncio ||
        anuncio.status !== 'ativo'
      ) {

        return res.status(404).json({

          erro:
            'Anúncio não encontrado.'

        });

      }


      const comerciante =
        db
          .prepare(`
            SELECT *
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            anuncio.id_comerciante
          );


      if (
        !comerciante ||
        !comercianteVisivelPublicamente(
          comerciante
        )
      ) {

        return res.status(404).json({

          erro:
            'Anúncio indisponível.'

        });

      }


      return res.json(

        parseAnuncio(
          anuncio
        )

      );


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao buscar anúncio:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao carregar anúncio.'

      });

    }

  }
);


// =========================================================
// POST /api/anuncios
// =========================================================
//
// Cria anúncio autenticado.
//
// O anúncio começa como:
// status = pendente
//
// Máximo:
// 6 fotos
//
// =========================================================

router.post(
  '/',
  autenticar,
  upload.array(
    'fotos',
    6
  ),
  (req, res) => {

    try {

      const {
        titulo,
        descricao,
        categoria_id,
        tags,
        latitude,
        longitude
      } = req.body;


      if (
        !titulo ||
        !String(titulo).trim()
      ) {

        return res.status(400).json({

          erro:
            'Campo "titulo" é obrigatório.'

        });

      }


      // -----------------------------------------------------
      // FOTOS
      // -----------------------------------------------------

      const fotos =
        (
          req.files ||
          []
        ).map(
          (f) =>
            `/assets/uploads/${f.filename}`
        );


      // -----------------------------------------------------
      // TAGS
      // -----------------------------------------------------

      const tagsArray =
        tags
          ? (
              Array.isArray(tags)
                ? tags
                : String(tags)
                    .split(',')
                    .map(
                      (t) =>
                        t.trim()
                    )
                    .filter(Boolean)
            )
          : [];


      // -----------------------------------------------------
      // INSERIR
      // -----------------------------------------------------

      const info =
        db
          .prepare(`
            INSERT INTO anuncios (
              titulo,
              descricao,
              categoria_id,
              fotos,
              tags,
              id_comerciante,
              latitude,
              longitude,
              status
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              'pendente'
            )
          `)
          .run(

            String(
              titulo
            ).trim(),

            descricao
              ? String(
                  descricao
                )
              : '',

            categoria_id ||
              null,

            JSON.stringify(
              fotos
            ),

            JSON.stringify(
              tagsArray
            ),

            req.comerciante.id,

            latitude ||
              null,

            longitude ||
              null

          );


      // -----------------------------------------------------
      // BUSCAR CRIADO
      // -----------------------------------------------------

      const anuncio =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(
            info.lastInsertRowid
          );


      return res
        .status(201)
        .json(
          parseAnuncio(
            anuncio
          )
        );


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao criar anúncio:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao criar anúncio: ' +
          err.message

      });

    }

  }
);


// =========================================================
// PUT /api/anuncios/:id
// =========================================================
//
// Atualiza anúncio.
//
// Somente o dono pode editar.
//
// =========================================================

router.put(
  '/:id',
  autenticar,
  upload.array(
    'fotos',
    6
  ),
  (req, res) => {

    try {

      const anuncio =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!anuncio) {

        return res.status(404).json({

          erro:
            'Anúncio não encontrado.'

        });

      }


      if (
        anuncio.id_comerciante !==
        req.comerciante.id
      ) {

        return res.status(403).json({

          erro:
            'Você não tem permissão para editar este anúncio.'

        });

      }


      const {
        titulo,
        descricao,
        categoria_id,
        tags,
        latitude,
        longitude
      } = req.body;


      // -----------------------------------------------------
      // FOTOS
      // -----------------------------------------------------

      const novasFotos =
        (
          req.files ||
          []
        ).map(
          (f) =>
            `/assets/uploads/${f.filename}`
        );


      const fotosAtuais =
        parseJsonSeguro(
          anuncio.fotos,
          []
        );


      const fotosFinal =
        novasFotos.length > 0
          ? novasFotos
          : fotosAtuais;


      // -----------------------------------------------------
      // TAGS
      // -----------------------------------------------------

      const tagsAtuais =
        parseJsonSeguro(
          anuncio.tags,
          []
        );


      const tagsArray =
        tags
          ? (
              Array.isArray(tags)
                ? tags
                : String(tags)
                    .split(',')
                    .map(
                      (t) =>
                        t.trim()
                    )
                    .filter(Boolean)
            )
          : tagsAtuais;


      // -----------------------------------------------------
      // ATUALIZAR
      // -----------------------------------------------------

      db
        .prepare(`
          UPDATE anuncios
          SET
            titulo = ?,
            descricao = ?,
            categoria_id = ?,
            fotos = ?,
            tags = ?,
            latitude = ?,
            longitude = ?
          WHERE id = ?
        `)
        .run(

          titulo !== undefined
            ? String(
                titulo
              ).trim()
            : anuncio.titulo,

          descricao !== undefined
            ? descricao
            : anuncio.descricao,

          categoria_id !== undefined
            ? categoria_id
            : anuncio.categoria_id,

          JSON.stringify(
            fotosFinal
          ),

          JSON.stringify(
            tagsArray
          ),

          latitude !== undefined
            ? latitude
            : anuncio.latitude,

          longitude !== undefined
            ? longitude
            : anuncio.longitude,

          req.params.id

        );


      // -----------------------------------------------------
      // RETORNAR ATUALIZADO
      // -----------------------------------------------------

      const atualizado =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      return res.json(

        parseAnuncio(
          atualizado
        )

      );


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao atualizar anúncio:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao atualizar anúncio: ' +
          err.message

      });

    }

  }
);


// =========================================================
// DELETE /api/anuncios/:id
// =========================================================
//
// Remove anúncio.
//
// Somente o dono pode remover.
//
// =========================================================

router.delete(
  '/:id',
  autenticar,
  (req, res) => {

    try {

      const anuncio =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!anuncio) {

        return res.status(404).json({

          erro:
            'Anúncio não encontrado.'

        });

      }


      if (
        anuncio.id_comerciante !==
        req.comerciante.id
      ) {

        return res.status(403).json({

          erro:
            'Você não tem permissão para remover este anúncio.'

        });

      }


      db
        .prepare(`
          DELETE FROM anuncios
          WHERE id = ?
        `)
        .run(
          req.params.id
        );


      return res.json({

        sucesso:
          true,

        mensagem:
          'Anúncio removido com sucesso.'

      });


    } catch (err) {

      console.error(
        '[ANUNCIOS] Erro ao remover anúncio:',
        err
      );


      return res.status(500).json({

        erro:
          'Erro ao remover anúncio: ' +
          err.message

      });

    }

  }
);


module.exports = router;
