'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');
const upload = require('../middleware/upload');

const router = express.Router();


// =========================================================
// AUXILIAR - PARSEAR ANÚNCIO COM SEGURANÇA
// =========================================================

function parseAnuncio(anuncio) {
  if (!anuncio) {
    return null;
  }

  let fotos = [];
  let tags = [];

  try {
    fotos = JSON.parse(anuncio.fotos || '[]');
  } catch (err) {
    fotos = [];
  }

  try {
    tags = JSON.parse(anuncio.tags || '[]');
  } catch (err) {
    tags = [];
  }

  return {
    ...anuncio,
    fotos,
    tags
  };
}


// =========================================================
// TODAS AS ROTAS EXIGEM AUTENTICAÇÃO DE ADMIN
// =========================================================

router.use(autenticarAdmin);


// =========================================================
// ANÚNCIOS
// =========================================================


// GET /api/admin/anuncios
// Lista anúncios pendentes ou por status
router.get('/anuncios', (req, res) => {
  try {
    const { status } = req.query;

    const anuncios = status
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
      erro: 'Erro ao carregar anuncios.'
    });
  }
});


// GET /api/admin/anuncios/todos
// Lista todos os anúncios
router.get('/anuncios/todos', (req, res) => {
  try {
    const anuncios = db
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
      erro: 'Erro ao carregar todos os anuncios.'
    });
  }
});


// GET /api/admin/anuncios/:id
// Buscar anúncio específico
router.get('/anuncios/:id', (req, res) => {
  try {
    const anuncio = db
      .prepare(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!anuncio) {
      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });
    }

    return res.json(
      parseAnuncio(anuncio)
    );

  } catch (err) {
    console.error(
      '[ADMIN] Erro ao buscar anuncio:',
      err
    );

    return res.status(500).json({
      erro: 'Erro ao carregar anuncio.'
    });
  }
});


// PUT /api/admin/anuncios/:id/aprovar
// Aprovar anúncio
router.put('/anuncios/:id/aprovar', (req, res) => {
  try {
    const anuncio = db
      .prepare(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!anuncio) {
      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });
    }

    db
      .prepare(`
        UPDATE anuncios
        SET status = 'ativo'
        WHERE id = ?
      `)
      .run(req.params.id);

    const atualizado = db
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
      erro: 'Erro ao aprovar anuncio.'
    });
  }
});


// PUT /api/admin/anuncios/:id/rejeitar
// Rejeitar anúncio
router.put('/anuncios/:id/rejeitar', (req, res) => {
  try {
    const anuncio = db
      .prepare(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!anuncio) {
      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });
    }

    db
      .prepare(`
        UPDATE anuncios
        SET status = 'rejeitado'
        WHERE id = ?
      `)
      .run(req.params.id);

    const atualizado = db
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
      erro: 'Erro ao rejeitar anuncio.'
    });
  }
});


// PUT /api/admin/anuncios/:id
// Editar anúncio
router.put(
  '/anuncios/:id',
  upload.array('fotos', 6),
  (req, res) => {

    try {

      const anuncio = db
        .prepare(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `)
        .get(req.params.id);

      if (!anuncio) {
        return res.status(404).json({
          erro: 'Anuncio nao encontrado.'
        });
      }

      const {
        titulo,
        descricao,
        categoria_id,
        tags,
        endereco,
        latitude,
        longitude,
        status
      } = req.body;


      // =====================================================
      // FOTOS
      // =====================================================

      const novasFotos = (req.files || [])
        .map(
          (f) =>
            `/assets/uploads/${f.filename}`
        );


      let fotosAntigas = [];

      try {
        fotosAntigas = JSON.parse(
          anuncio.fotos || '[]'
        );
      } catch (err) {
        fotosAntigas = [];
      }


      const fotosFinal =
        novasFotos.length > 0
          ? novasFotos
          : fotosAntigas;


      // =====================================================
      // TAGS
      // =====================================================

      let tagsArray = [];

      if (tags !== undefined) {

        tagsArray = Array.isArray(tags)
          ? tags
          : String(tags)
              .split(',')
              .map(
                (tag) =>
                  tag.trim()
              )
              .filter(Boolean);

      } else {

        try {

          tagsArray = JSON.parse(
            anuncio.tags || '[]'
          );

        } catch (err) {

          tagsArray = [];

        }

      }


      // =====================================================
      // ATUALIZAR ANÚNCIO
      // =====================================================

      db
        .prepare(`
          UPDATE anuncios
          SET
            titulo = ?,
            descricao = ?,
            categoria_id = ?,
            fotos = ?,
            tags = ?,
            endereco = ?,
            latitude = ?,
            longitude = ?,
            status = ?
          WHERE id = ?
        `)
        .run(

          titulo !== undefined &&
          String(titulo).trim()
            ? String(titulo).trim()
            : anuncio.titulo,

          descricao !== undefined
            ? descricao
            : anuncio.descricao,

          categoria_id !== undefined
            ? categoria_id || null
            : anuncio.categoria_id,

          JSON.stringify(
            fotosFinal
          ),

          JSON.stringify(
            tagsArray
          ),

          endereco !== undefined
            ? endereco
            : anuncio.endereco,

          latitude !== undefined
            ? latitude || null
            : anuncio.latitude,

          longitude !== undefined
            ? longitude || null
            : anuncio.longitude,

          status !== undefined &&
          status
            ? status
            : anuncio.status,

          req.params.id
        );


      const atualizado = db
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


// DELETE /api/admin/anuncios/:id
// Excluir anúncio
router.delete('/anuncios/:id', (req, res) => {

  try {

    const anuncio = db
      .prepare(`
        SELECT id
        FROM anuncios
        WHERE id = ?
      `)
      .get(req.params.id);


    if (!anuncio) {

      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });

    }


    db
      .prepare(`
        DELETE FROM anuncios
        WHERE id = ?
      `)
      .run(req.params.id);


    return res.json({
      sucesso: true
    });


  } catch (err) {

    console.error(
      '[ADMIN] Erro ao excluir anuncio:',
      err
    );

    return res.status(500).json({
      erro: 'Erro ao excluir anuncio.'
    });

  }

});


// =========================================================
// CATEGORIAS
// =========================================================

function slugify(texto) {

  return String(texto)
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


// GET /api/admin/categorias
router.get('/categorias', (req, res) => {

  try {

    const categorias = db
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
      erro: 'Erro ao carregar categorias.'
    });

  }

});


// GET /api/admin/categorias/:id
router.get('/categorias/:id', (req, res) => {

  try {

    const categoria = db
      .prepare(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `)
      .get(req.params.id);


    if (!categoria) {

      return res.status(404).json({
        erro: 'Categoria nao encontrada.'
      });

    }


    return res.json(
      categoria
    );

  } catch (err) {

    console.error(
      '[ADMIN] Erro ao buscar categoria:',
      err
    );

    return res.status(500).json({
      erro: 'Erro ao carregar categoria.'
    });

  }

});


// POST /api/admin/categorias
router.post('/categorias', (req, res) => {

  try {

    const {
      nome,
      icone_url
    } = req.body;


    if (
      !nome ||
      !String(nome).trim()
    ) {

      return res.status(400).json({
        erro:
          'Campo "nome" e obrigatorio.'
      });

    }


    const nomeFinal =
      String(nome).trim();


    const slug =
      slugify(nomeFinal);


    const existente = db
      .prepare(`
        SELECT id
        FROM categorias
        WHERE slug = ?
      `)
      .get(slug);


    if (existente) {

      return res.status(409).json({
        erro:
          'Ja existe uma categoria com esse nome.'
      });

    }


    const info = db
      .prepare(`
        INSERT INTO categorias (
          nome,
          icone_url,
          slug
        )
        VALUES (?, ?, ?)
      `)
      .run(
        nomeFinal,
        icone_url || null,
        slug
      );


    const categoria = db
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

});


// PUT /api/admin/categorias/:id
router.put('/categorias/:id', (req, res) => {

  try {

    const {
      nome,
      icone_url
    } = req.body;


    const categoria = db
      .prepare(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `)
      .get(req.params.id);


    if (!categoria) {

      return res.status(404).json({
        erro:
          'Categoria nao encontrada.'
      });

    }


    const novoNome =
      nome !== undefined &&
      String(nome).trim()
        ? String(nome).trim()
        : categoria.nome;


    const novoIcone =
      icone_url !== undefined
        ? icone_url
        : categoria.icone_url;


    const novoSlug =
      nome !== undefined &&
      String(nome).trim()
        ? slugify(novoNome)
        : categoria.slug;


    const outraCategoria = db
      .prepare(`
        SELECT id
        FROM categorias
        WHERE slug = ?
        AND id != ?
      `)
      .get(
        novoSlug,
        req.params.id
      );


    if (outraCategoria) {

      return res.status(409).json({
        erro:
          'Ja existe outra categoria com esse nome.'
      });

    }


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


    const atualizada = db
      .prepare(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `)
      .get(req.params.id);


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

});


// DELETE /api/admin/categorias/:id
router.delete('/categorias/:id', (req, res) => {

  try {

    const categoria = db
      .prepare(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `)
      .get(req.params.id);


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
      .run(req.params.id);


    return res.json({
      sucesso: true
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

});


// =========================================================
// EXPORTAR ROUTER
// =========================================================

module.exports = router;
