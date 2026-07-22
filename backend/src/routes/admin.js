'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');
const upload = require('../middleware/upload');

const {
  verificarEAtualizarStatus,
  calcularTempoRestanteDegustacao
} = require('../utils/status');

const router = express.Router();


// =========================================================
// AUXILIAR - PARSEAR ANÚNCIO
// =========================================================

function parseAnuncio(anuncio) {
  return {
    ...anuncio,
    fotos: JSON.parse(anuncio.fotos || '[]'),
    tags: JSON.parse(anuncio.tags || '[]'),
  };
}


// =========================================================
// TODAS AS ROTAS DESTE ROUTER EXIGEM TOKEN DE ADMIN
// =========================================================

router.use(autenticarAdmin);


// =========================================================
// =========================================================
// ANÚNCIOS
// =========================================================
// =========================================================


// =========================================================
// GET /api/admin/anuncios
// Lista anúncios pendentes ou por status informado
// =========================================================

router.get('/anuncios', (req, res) => {

  try {

    const {
      status
    } = req.query;


    const anuncios =
      status

        ? db
            .prepare(`
              SELECT *
              FROM anuncios
              WHERE status = ?
              ORDER BY criado_em DESC
            `)
            .all(status)

        : db
            .prepare(`
              SELECT *
              FROM anuncios
              WHERE status = 'pendente'
              ORDER BY criado_em DESC
            `)
            .all();


    return res.json(
      anuncios.map(parseAnuncio)
    );


  } catch (err) {

    console.error(
      '[ADMIN] Erro ao listar anuncios:',
      err
    );


    return res.status(500).json({
      erro:
        'Erro ao carregar anuncios.'
    });
  }

});


// =========================================================
// GET /api/admin/anuncios/todos
// Lista todos os anúncios
// =========================================================

router.get('/anuncios/todos', (req, res) => {

  try {

    const anuncios =
      db
        .prepare(`
          SELECT *
          FROM anuncios
          ORDER BY criado_em DESC
        `)
        .all();


    return res.json(
      anuncios.map(parseAnuncio)
    );


  } catch (err) {

    console.error(
      '[ADMIN] Erro ao listar todos os anuncios:',
      err
    );


    return res.status(500).json({
      erro:
        'Erro ao carregar todos os anuncios.'
    });
  }

});


// =========================================================
// PUT /api/admin/anuncios/:id/aprovar
// Aprova anúncio
// =========================================================

router.put('/anuncios/:id/aprovar', (req, res) => {

  try {

    const anuncio =
      db
        .prepare(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `)
        .get(req.params.id);


    if (!anuncio) {

      return res.status(404).json({
        erro:
          'Anuncio nao encontrado.'
      });
    }


    db
      .prepare(`
        UPDATE anuncios
        SET status = 'ativo'
        WHERE id = ?
      `)
      .run(req.params.id);


    const atualizado =
      db
        .prepare(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `)
        .get(req.params.id);


    return res.json(
      parseAnuncio(atualizado)
    );


  } catch (err) {

    console.error(
      '[ADMIN] Erro ao aprovar anuncio:',
      err
    );


    return res.status(500).json({
      erro:
        'Erro ao aprovar anuncio.'
    });
  }

});


// =========================================================
// PUT /api/admin/anuncios/:id/rejeitar
// Rejeita anúncio
// =========================================================

router.put('/anuncios/:id/rejeitar', (req, res) => {

  try {

    const anuncio =
      db
        .prepare(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `)
        .get(req.params.id);


    if (!anuncio) {

      return res.status(404).json({
        erro:
          'Anuncio nao encontrado.'
      });
    }


    db
      .prepare(`
        UPDATE anuncios
        SET status = 'rejeitado'
        WHERE id = ?
      `)
      .run(req.params.id);


    const atualizado =
      db
        .prepare(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `)
        .get(req.params.id);


    return res.json(
      parseAnuncio(atualizado)
    );


  } catch (err) {

    console.error(
      '[ADMIN] Erro ao rejeitar anuncio:',
      err
    );


    return res.status(500).json({
      erro:
        'Erro ao rejeitar anuncio.'
    });
  }

});


// =========================================================
// PUT /api/admin/anuncios/:id
// Edição completa do anúncio pelo admin
// =========================================================

router.put(
  '/anuncios/:id',
  upload.array('fotos', 6),
  (req, res) => {

    try {

      const anuncio =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(req.params.id);


      if (!anuncio) {

        return res.status(404).json({
          erro:
            'Anuncio nao encontrado.'
        });
      }


      const {
        titulo,
        descricao,
        categoria_id,
        tags,
        latitude,
        longitude,
        status
      } = req.body;


      const novasFotos =
        (req.files || [])
          .map(
            (f) =>
              `/assets/uploads/${f.filename}`
          );


      const fotosAntigas =
        JSON.parse(
          anuncio.fotos || '[]'
        );


      const fotosFinal =
        novasFotos.length > 0
          ? novasFotos
          : fotosAntigas;


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
            )

          : JSON.parse(
              anuncio.tags || '[]'
            );


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
            longitude = ?,
            status = ?

          WHERE id = ?
        `)
        .run(

          titulo || anuncio.titulo,

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

          status || anuncio.status,

          req.params.id

        );


      const atualizado =
        db
          .prepare(`
            SELECT *
            FROM anuncios
            WHERE id = ?
          `)
          .get(req.params.id);


      return res.json(
        parseAnuncio(atualizado)
      );


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao editar anuncio:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao editar anuncio: ' +
          err.message
      });
    }

  }
);


// =========================================================
// DELETE /api/admin/anuncios/:id
// Excluir anúncio
// =========================================================

router.delete(
  '/anuncios/:id',
  (req, res) => {

    try {

      const anuncio =
        db
          .prepare(`
            SELECT id
            FROM anuncios
            WHERE id = ?
          `)
          .get(req.params.id);


      if (!anuncio) {

        return res.status(404).json({
          erro:
            'Anuncio nao encontrado.'
        });
      }


      db
        .prepare(`
          DELETE FROM anuncios
          WHERE id = ?
        `)
        .run(req.params.id);


      return res.json({
        sucesso:
          true
      });


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao excluir anuncio:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao excluir anuncio.'
      });
    }

  }
);


// =========================================================
// =========================================================
// COMERCIANTES / DEGUSTAÇÃO
// =========================================================
// =========================================================


// =========================================================
// GET /api/admin/comerciantes
//
// Lista todos os comerciantes.
//
// Esta será a base para o painel administrativo
// controlar degustação e assinaturas.
// =========================================================

router.get(
  '/comerciantes',
  (req, res) => {

    try {

      const comerciantes =
        db
          .prepare(`
            SELECT
              id,
              nome,
              email,
              telefone,
              plano,
              status,
              data_criacao,
              data_inicio_degustacao,
              data_expiracao
            FROM comerciantes
            ORDER BY data_criacao DESC
          `)
          .all();


      const resultado =
        comerciantes.map(
          (comerciante) => {

            verificarEAtualizarStatus(
              comerciante
            );


            return {

              ...comerciante,

              degustacao:
                calcularTempoRestanteDegustacao(
                  comerciante
                )

            };

          }
        );


      return res.json(
        resultado
      );


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao listar comerciantes:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao carregar comerciantes.'
      });
    }

  }
);


// =========================================================
// GET /api/admin/comerciantes/:id
//
// Visualiza todos os dados de um comerciante.
// Não retorna senha.
// =========================================================

router.get(
  '/comerciantes/:id',
  (req, res) => {

    try {

      const comerciante =
        db
          .prepare(`
            SELECT
              id,
              nome,
              email,
              telefone,
              plano,
              status,
              data_criacao,
              data_inicio_degustacao,
              data_expiracao
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!comerciante) {

        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      verificarEAtualizarStatus(
        comerciante
      );


      return res.json({

        comerciante,

        degustacao:
          calcularTempoRestanteDegustacao(
            comerciante
          )

      });


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao buscar comerciante:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao carregar comerciante.'
      });
    }

  }
);


// =========================================================
// PUT /api/admin/comerciantes/:id/degustacao
//
// ADMIN PODE DEFINIR UM PRAZO PERSONALIZADO.
//
// Exemplos:
//
// {
//   "dias": 5
// }
//
// ou:
//
// {
//   "dias": 30
// }
//
// O prazo é contado a partir de agora.
//
// Isso permite ao admin conceder:
// 5 dias
// 7 dias
// 15 dias
// 30 dias
// ou qualquer outro prazo necessário.
// =========================================================

router.put(
  '/comerciantes/:id/degustacao',
  (req, res) => {

    try {

      const {
        dias
      } = req.body;


      const quantidadeDias =
        Number(dias);


      // -----------------------------------------------------
      // VALIDAR DIAS
      // -----------------------------------------------------

      if (
        !Number.isInteger(
          quantidadeDias
        ) ||
        quantidadeDias <= 0
      ) {

        return res.status(400).json({
          erro:
            'Informe uma quantidade de dias inteira maior que zero.'
        });
      }


      // -----------------------------------------------------
      // BUSCAR COMERCIANTE
      // -----------------------------------------------------

      const comerciante =
        db
          .prepare(`
            SELECT *
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!comerciante) {

        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      // -----------------------------------------------------
      // NOVA DATA DE EXPIRAÇÃO
      //
      // O prazo começa a contar a partir de agora.
      // -----------------------------------------------------

      const agora =
        new Date();


      const novaExpiracao =
        new Date(
          agora.getTime() +
          (
            quantidadeDias *
            24 *
            60 *
            60 *
            1000
          )
        );


      // -----------------------------------------------------
      // ATUALIZAR COMERCIANTE
      //
      // Status volta para degustacao.
      // Plano permanece gratuito.
      // -----------------------------------------------------

      db
        .prepare(`
          UPDATE comerciantes

          SET
            status = 'degustacao',
            plano = 'gratuito',
            data_inicio_degustacao = ?,
            data_expiracao = ?

          WHERE id = ?
        `)
        .run(

          agora.toISOString(),

          novaExpiracao.toISOString(),

          req.params.id

        );


      // -----------------------------------------------------
      // BUSCAR ATUALIZADO
      // -----------------------------------------------------

      const atualizado =
        db
          .prepare(`
            SELECT
              id,
              nome,
              email,
              telefone,
              plano,
              status,
              data_criacao,
              data_inicio_degustacao,
              data_expiracao
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      return res.json({

        sucesso:
          true,

        mensagem:
          `Degustacao definida para ${quantidadeDias} dias.`,

        comerciante:
          atualizado,

        degustacao:
          calcularTempoRestanteDegustacao(
            atualizado
          )

      });


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao definir degustacao:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao definir prazo de degustacao: ' +
          err.message
      });
    }

  }
);


// =========================================================
// PUT /api/admin/comerciantes/:id/ativar
//
// Permite ao admin ativar manualmente um comerciante.
// =========================================================

router.put(
  '/comerciantes/:id/ativar',
  (req, res) => {

    try {

      const comerciante =
        db
          .prepare(`
            SELECT id
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!comerciante) {

        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      db
        .prepare(`
          UPDATE comerciantes

          SET
            status = 'ativo'

          WHERE id = ?
        `)
        .run(
          req.params.id
        );


      const atualizado =
        db
          .prepare(`
            SELECT
              id,
              nome,
              email,
              telefone,
              plano,
              status,
              data_criacao,
              data_inicio_degustacao,
              data_expiracao
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      return res.json({

        sucesso:
          true,

        mensagem:
          'Comerciante ativado com sucesso.',

        comerciante:
          atualizado

      });


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao ativar comerciante:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao ativar comerciante.'
      });
    }

  }
);


// =========================================================
// PUT /api/admin/comerciantes/:id/expirar
//
// Permite ao admin encerrar manualmente o acesso.
// =========================================================

router.put(
  '/comerciantes/:id/expirar',
  (req, res) => {

    try {

      const comerciante =
        db
          .prepare(`
            SELECT id
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!comerciante) {

        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      db
        .prepare(`
          UPDATE comerciantes

          SET
            status = 'expirado'

          WHERE id = ?
        `)
        .run(
          req.params.id
        );


      return res.json({

        sucesso:
          true,

        mensagem:
          'Acesso do comerciante expirado com sucesso.'

      });


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao expirar comerciante:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao expirar comerciante.'
      });
    }

  }
);


// =========================================================
// =========================================================
// CATEGORIAS
// =========================================================
// =========================================================


// =========================================================
// GERAR SLUG
// =========================================================

function slugify(texto) {

  return texto

    .toString()

    .normalize('NFD')

    .replace(
      /[\u0300-\u036f]/g,
      ''
    )

    .toLowerCase()

    .trim()

    .replace(
      /[^a-z0-9]+/g,
      '-'
    )

    .replace(
      /(^-|-$)/g,
      ''
    );

}


// =========================================================
// GET /api/admin/categorias
// =========================================================

router.get(
  '/categorias',
  (req, res) => {

    try {

      const categorias =
        db
          .prepare(`
            SELECT *
            FROM categorias
            ORDER BY id ASC
          `)
          .all();


      return res.json(
        categorias
      );


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao listar categorias:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao carregar categorias.'
      });
    }

  }
);


// =========================================================
// POST /api/admin/categorias
// Criar categoria
// =========================================================

router.post(
  '/categorias',
  (req, res) => {

    try {

      const {
        nome,
        icone_url
      } = req.body;


      if (!nome) {

        return res.status(400).json({
          erro:
            'Campo "nome" e obrigatorio.'
        });
      }


      const slug =
        slugify(nome);


      const info =
        db
          .prepare(`
            INSERT INTO categorias (
              nome,
              icone_url,
              slug
            )

            VALUES (?, ?, ?)
          `)
          .run(

            String(nome).trim(),

            icone_url || null,

            slug

          );


      const categoria =
        db
          .prepare(`
            SELECT *
            FROM categorias
            WHERE id = ?
          `)
          .get(
            info.lastInsertRowid
          );


      return res
        .status(201)
        .json(
          categoria
        );


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao criar categoria:',
        err
      );


      return res.status(400).json({

        erro:
          'Nao foi possivel criar a categoria.',

        detalhe:
          err.message

      });
    }

  }
);


// =========================================================
// PUT /api/admin/categorias/:id
// Editar categoria
// =========================================================

router.put(
  '/categorias/:id',
  (req, res) => {

    try {

      const {
        nome,
        icone_url
      } = req.body;


      const categoria =
        db
          .prepare(`
            SELECT *
            FROM categorias
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!categoria) {

        return res.status(404).json({
          erro:
            'Categoria nao encontrada.'
        });
      }


      const novoNome =
        nome
          ? String(nome).trim()
          : categoria.nome;


      const novoIcone =
        icone_url !== undefined
          ? icone_url
          : categoria.icone_url;


      const novoSlug =
        nome
          ? slugify(
              novoNome
            )
          : categoria.slug;


      db
        .prepare(`
          UPDATE categorias

          SET
            nome = ?,
            icone_url = ?,
            slug = ?

          WHERE id = ?
        `)
        .run(

          novoNome,

          novoIcone,

          novoSlug,

          req.params.id

        );


      const atualizada =
        db
          .prepare(`
            SELECT *
            FROM categorias
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      return res.json(
        atualizada
      );


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao editar categoria:',
        err
      );


      return res.status(400).json({

        erro:
          'Nao foi possivel atualizar a categoria.',

        detalhe:
          err.message

      });
    }

  }
);


// =========================================================
// DELETE /api/admin/categorias/:id
// Excluir categoria
// =========================================================

router.delete(
  '/categorias/:id',
  (req, res) => {

    try {

      const categoria =
        db
          .prepare(`
            SELECT *
            FROM categorias
            WHERE id = ?
          `)
          .get(
            req.params.id
          );


      if (!categoria) {

        return res.status(404).json({
          erro:
            'Categoria nao encontrada.'
        });
      }


      db
        .prepare(`
          DELETE FROM categorias
          WHERE id = ?
        `)
        .run(
          req.params.id
        );


      return res.json({
        sucesso:
          true
      });


    } catch (err) {

      console.error(
        '[ADMIN] Erro ao excluir categoria:',
        err
      );


      return res.status(500).json({
        erro:
          'Erro ao excluir categoria.'
      });
    }

  }
);


// =========================================================
// EXPORTAR
// =========================================================

module.exports = router;
