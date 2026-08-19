'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticarAdmin } = require('../middleware/authAdmin');
const upload = require('../middleware/upload');

const router = express.Router();

// Ate 25 fotos e 25 videos por anuncio.
const uploadMidia = upload.fields([
  { name: 'fotos', maxCount: 25 },
  { name: 'videos', maxCount: 25 },
]);


// =========================================================
// AUXILIAR - PARSEAR ANÚNCIO COM SEGURANÇA
// =========================================================

function parseAnuncio(anuncio) {
  if (!anuncio) {
    return null;
  }

  let fotos = [];
  let videos = [];
  let tags = [];

  try {
    fotos = JSON.parse(anuncio.fotos || '[]');
  } catch (err) {
    fotos = [];
  }

  try {
    videos = JSON.parse(anuncio.videos || '[]');
  } catch (err) {
    videos = [];
  }

  try {
    tags = JSON.parse(anuncio.tags || '[]');
  } catch (err) {
    tags = [];
  }

  return {
    ...anuncio,
    fotos,
    videos,
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
router.get('/anuncios', async (req, res) => {
  try {
    const { status } = req.query;

    const anuncios = status
      ? await db.all(`
            SELECT a.*, c.nome AS comerciante_nome, c.email AS comerciante_email
            FROM anuncios a
            LEFT JOIN comerciantes c ON c.id = a.id_comerciante
            WHERE a.status = ?
            ORDER BY a.criado_em DESC
          `, [status])
      : await db.all(`
            SELECT a.*, c.nome AS comerciante_nome, c.email AS comerciante_email
            FROM anuncios a
            LEFT JOIN comerciantes c ON c.id = a.id_comerciante
            WHERE a.status = 'pendente'
            ORDER BY a.criado_em DESC
          `);

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
router.get('/anuncios/todos', async (req, res) => {
  try {
    const anuncios = await db.all(`
        SELECT a.*, c.nome AS comerciante_nome, c.email AS comerciante_email
        FROM anuncios a
        LEFT JOIN comerciantes c ON c.id = a.id_comerciante
        ORDER BY a.criado_em DESC
      `);

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
router.get('/anuncios/:id', async (req, res) => {
  try {
    const anuncio = await db.get(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `, [req.params.id]);

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
router.put('/anuncios/:id/aprovar', async (req, res) => {
  try {
    const anuncio = await db.get(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `, [req.params.id]);

    if (!anuncio) {
      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });
    }

    await db.run(`
        UPDATE anuncios
        SET status = 'ativo'
        WHERE id = ?
      `, [req.params.id]);

    const atualizado = await db.get(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `, [req.params.id]);

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
router.put('/anuncios/:id/rejeitar', async (req, res) => {
  try {
    const anuncio = await db.get(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `, [req.params.id]);

    if (!anuncio) {
      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });
    }

    await db.run(`
        UPDATE anuncios
        SET status = 'rejeitado'
        WHERE id = ?
      `, [req.params.id]);

    const atualizado = await db.get(`
        SELECT *
        FROM anuncios
        WHERE id = ?
      `, [req.params.id]);

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
  uploadMidia,
  async (req, res) => {

    try {

      const anuncio = await db.get(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `, [req.params.id]);

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
      // FOTOS E VIDEOS
      // =====================================================

      const arquivos = req.files || {};

      const novasFotos = (arquivos.fotos || [])
        .map(
          (f) =>
            `/assets/uploads/${f.filename}`
        );

      const novosVideos = (arquivos.videos || [])
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

      let videosAntigos = [];

      try {
        videosAntigos = JSON.parse(
          anuncio.videos || '[]'
        );
      } catch (err) {
        videosAntigos = [];
      }


      const fotosFinal =
        novasFotos.length > 0
          ? novasFotos
          : fotosAntigas;

      const videosFinal =
        novosVideos.length > 0
          ? novosVideos
          : videosAntigos;


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

      await db.run(`
          UPDATE anuncios
          SET
            titulo = ?,
            descricao = ?,
            categoria_id = ?,
            fotos = ?,
            videos = ?,
            tags = ?,
            endereco = ?,
            latitude = ?,
            longitude = ?,
            status = ?
          WHERE id = ?
        `, [

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
            videosFinal
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
        ]);


      const atualizado = await db.get(`
          SELECT *
          FROM anuncios
          WHERE id = ?
        `, [req.params.id]);


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
router.delete('/anuncios/:id', async (req, res) => {

  try {

    const anuncio = await db.get(`
        SELECT id
        FROM anuncios
        WHERE id = ?
      `, [req.params.id]);


    if (!anuncio) {

      return res.status(404).json({
        erro: 'Anuncio nao encontrado.'
      });

    }


    await db.run(`
        DELETE FROM anuncios
        WHERE id = ?
      `, [req.params.id]);


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
// ANUNCIOS - CRIAR NOVO (ADMIN)
// =========================================================

// POST /api/admin/anuncios
router.post('/anuncios', uploadMidia, async (req, res) => {

  try {

    const {
      titulo,
      descricao,
      categoria_id,
      tags,
      id_comerciante,
      endereco,
      latitude,
      longitude,
      status
    } = req.body;

    if (!titulo || !String(titulo).trim()) {
      return res.status(400).json({
        erro: 'Campo titulo e obrigatorio.'
      });
    }

    if (!id_comerciante) {
      return res.status(400).json({
        erro: 'Campo id_comerciante e obrigatorio.'
      });
    }

    const comerciante = await db.get(`
      SELECT id
      FROM comerciantes
      WHERE id = ?
    `, [id_comerciante]);

    if (!comerciante) {
      return res.status(404).json({
        erro: 'Comerciante nao encontrado.'
      });
    }

    const arquivos = req.files || {};
    const fotos = (arquivos.fotos || []).map((f) => `/assets/uploads/${f.filename}`);
    const videos = (arquivos.videos || []).map((f) => `/assets/uploads/${f.filename}`);

    const tagsArray = tags
      ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim()).filter(Boolean))
      : [];

    const statusFinal = status && String(status).trim() ? status : 'ativo';

    const info = await db.run(`
      INSERT INTO anuncios (titulo, descricao, categoria_id, fotos, videos, tags, id_comerciante, endereco, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      String(titulo).trim(),
      descricao || '',
      categoria_id || null,
      JSON.stringify(fotos),
      JSON.stringify(videos),
      JSON.stringify(tagsArray),
      id_comerciante,
      endereco || null,
      latitude || null,
      longitude || null,
      statusFinal
    ]);

    const anuncio = await db.get(`
      SELECT *
      FROM anuncios
      WHERE id = ?
    `, [info.lastInsertRowid]);

    return res
      .status(201)
      .json(parseAnuncio(anuncio));

  } catch (err) {

    console.error(
      '[ADMIN] Erro ao criar anuncio:',
      err
    );

    return res.status(500).json({
      erro: 'Erro ao criar anuncio.'
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
      new RegExp('[\\u0300-\\u036f]', 'g'),
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
router.get('/categorias', async (req, res) => {

  try {

    const categorias = await db.all(`
        SELECT *
        FROM categorias
        ORDER BY id ASC
      `);

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
router.get('/categorias/:id', async (req, res) => {

  try {

    const categoria = await db.get(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `, [req.params.id]);


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
router.post('/categorias', async (req, res) => {

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


    const existente = await db.get(`
        SELECT id
        FROM categorias
        WHERE slug = ?
      `, [slug]);


    if (existente) {

      return res.status(409).json({
        erro:
          'Ja existe uma categoria com esse nome.'
      });

    }


    const info = await db.run(`
        INSERT INTO categorias (
          nome,
          icone_url,
          slug
        )
        VALUES (?, ?, ?)
      `, [
        nomeFinal,
        icone_url || null,
        slug
      ]);


    const categoria = await db.get(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `, [
        info.lastInsertRowid
      ]);


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


// PUT /api/admin/comerciantes/:id
// Planos e status validos que o admin pode atribuir manualmente a um
// comerciante (independente de pagamento real) - usado pelo override de
// "Tipo de anuncio: Comum ou Premium" no painel.
const PLANOS_VALIDOS_ADMIN = ['gratuito', 'basico', 'premium'];
const STATUS_VALIDOS_ADMIN = ['degustacao', 'ativo', 'expirado'];

router.put('/comerciantes/:id', async (req, res) => {

  try {

    const { logo, banner, plano, status } = req.body;

    if (plano !== undefined && !PLANOS_VALIDOS_ADMIN.includes(plano)) {
      return res.status(400).json({
        erro: 'Plano invalido. Use: gratuito, basico ou premium.'
      });
    }

    if (status !== undefined && !STATUS_VALIDOS_ADMIN.includes(status)) {
      return res.status(400).json({
        erro: 'Status invalido. Use: degustacao, ativo ou expirado.'
      });
    }

    const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.params.id]);

    if (!comerciante) {
      return res.status(404).json({
        erro: 'Comerciante nao encontrado.'
      });
    }

    // Override manual do admin: ao atribuir um plano pago (basico/premium)
    // sem informar um status explicito, ativa o comerciante automaticamente
    // (mesmo efeito de ativarComerciante() no fluxo de pagamento real, so
    // que sem exigir pagamento) - e assim que o anuncio/comerciante passa a
    // aparecer com o selo Premium no site imediatamente.
    let statusFinal = status !== undefined ? status : comerciante.status;
    if (plano !== undefined && (plano === 'basico' || plano === 'premium') && status === undefined) {
      statusFinal = 'ativo';
    }

    await db.run('UPDATE comerciantes SET logo = ?, banner = ?, plano = ?, status = ? WHERE id = ?', [
      logo !== undefined ? logo : comerciante.logo,
      banner !== undefined ? banner : comerciante.banner,
      plano !== undefined ? plano : comerciante.plano,
      statusFinal,
      req.params.id
    ]);

    const atualizado = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.params.id]);

    return res.json(atualizado);

  } catch (err) {
    console.error('[ADMIN] Erro ao editar comerciante:', err);
    return res.status(500).json({
      erro: 'Erro ao editar comerciante.'
    });
  }

});


router.put('/categorias/:id', async (req, res) => {

  try {

    const {
      nome,
      icone_url
    } = req.body;


    const categoria = await db.get(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `, [req.params.id]);


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


    const outraCategoria = await db.get(`
        SELECT id
        FROM categorias
        WHERE slug = ?
        AND id != ?
      `, [
        novoSlug,
        req.params.id
      ]);


    if (outraCategoria) {

      return res.status(409).json({
        erro:
          'Ja existe outra categoria com esse nome.'
      });

    }


    await db.run(`
        UPDATE categorias
        SET
          nome = ?,
          icone_url = ?,
          slug = ?
        WHERE id = ?
      `, [
        novoNome,
        novoIcone,
        novoSlug,
        req.params.id
      ]);


    const atualizada = await db.get(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `, [req.params.id]);


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
router.delete('/categorias/:id', async (req, res) => {

  try {

    const categoria = await db.get(`
        SELECT *
        FROM categorias
        WHERE id = ?
      `, [req.params.id]);


    if (!categoria) {

      return res.status(404).json({
        erro:
          'Categoria nao encontrada.'
      });

    }


    await db.run(`
        DELETE FROM categorias
        WHERE id = ?
      `, [req.params.id]);


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
// FASE 1 DO DASHBOARD - VISUALIZACOES DE ANUNCIOS
// =========================================================
//
// GET /api/admin/visualizacoes?granularidade=dia|semana|mes
//
// Retorna uma serie temporal (pra grafico) e um ranking dos anuncios mais
// vistos, ambos dentro da janela de tempo correspondente a granularidade
// escolhida:
//   - dia    -> ultimos 30 dias, um ponto por dia
//   - semana -> ultimas 12 semanas, um ponto por semana
//   - mes    -> ultimos 12 meses, um ponto por mes
//
// A tabela visualizacoes_anuncio guarda uma linha por visualizacao (sem
// deduplicar por visitante), entao o numero e mais parecido com
// "impressoes" do que "visitantes unicos" - suficiente pra fase 1.

const GRANULARIDADES_VISUALIZACOES = {
  dia: { unidadePostgres: 'day', diasDeJanela: 30 },
  semana: { unidadePostgres: 'week', diasDeJanela: 84 },
  mes: { unidadePostgres: 'month', diasDeJanela: 365 },
};

router.get('/visualizacoes', autenticarAdmin, async (req, res) => {
  const granularidadeEscolhida = GRANULARIDADES_VISUALIZACOES[req.query.granularidade]
    ? req.query.granularidade
    : 'dia';
  const { unidadePostgres, diasDeJanela } = GRANULARIDADES_VISUALIZACOES[granularidadeEscolhida];
  const desde = new Date(Date.now() - diasDeJanela * 24 * 60 * 60 * 1000).toISOString();

  try {
    const serie = await db.all(
      `SELECT to_char(date_trunc(?, criado_em::timestamptz), 'YYYY-MM-DD') AS periodo,
              COUNT(*)::int AS total
       FROM visualizacoes_anuncio
       WHERE criado_em::timestamptz >= ?::timestamptz
       GROUP BY 1
       ORDER BY 1`,
      [unidadePostgres, desde]
    );

    const ranking = await db.all(
      `SELECT v.id_anuncio, a.titulo, c.nome AS nome_comerciante, COUNT(*)::int AS total
       FROM visualizacoes_anuncio v
       JOIN anuncios a ON a.id = v.id_anuncio
       JOIN comerciantes c ON c.id = a.id_comerciante
       WHERE v.criado_em::timestamptz >= ?::timestamptz
       GROUP BY v.id_anuncio, a.titulo, c.nome
       ORDER BY total DESC
       LIMIT 10`,
      [desde]
    );

    const totalPeriodo = serie.reduce((soma, item) => soma + Number(item.total), 0);

    res.json({
      granularidade: granularidadeEscolhida,
      serie,
      ranking,
      total_periodo: totalPeriodo,
    });
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar visualizacoes:', err);
    res.status(500).json({ erro: 'Erro ao buscar estatisticas de visualizacoes.' });
  }
});

// =========================================================
// FASE 2 DO DASHBOARD - RESUMO GERAL E NOTIFICACOES
// =========================================================
//
// GET /api/admin/resumo
//
// Totais de cadastros, financeiro e engajamento para a tela inicial do
// admin, mais uma lista de "notificacoes" (eventos recentes que podem
// precisar de atencao: anuncios pendentes de aprovacao, novos comerciantes
// cadastrados nas ultimas 24h e pagamentos aprovados nas ultimas 24h).

router.get('/resumo', autenticarAdmin, async (req, res) => {
  try {
    const [
      comerciantesTotal,
      comerciantesAtivos,
      comerciantesDegustacao,
      comerciantesExpirados,
      turistasTotal,
      turistasAtivos,
      anunciosTotal,
      anunciosAtivos,
      anunciosPendentesCount,
      categoriasTotal,
      receitaTotal,
      receitaMesAtual,
      pagamentosAprovadosTotal,
      curtidasTotal,
      comentariosTotal,
      visualizacoesTotal,
    ] = await Promise.all([
      db.get('SELECT COUNT(*)::int AS total FROM comerciantes'),
      db.get("SELECT COUNT(*)::int AS total FROM comerciantes WHERE status = 'ativo'"),
      db.get("SELECT COUNT(*)::int AS total FROM comerciantes WHERE status = 'degustacao'"),
      db.get("SELECT COUNT(*)::int AS total FROM comerciantes WHERE status = 'expirado'"),
      db.get('SELECT COUNT(*)::int AS total FROM turistas'),
      db.get("SELECT COUNT(*)::int AS total FROM turistas WHERE status = 'ativo'"),
      db.get('SELECT COUNT(*)::int AS total FROM anuncios'),
      db.get("SELECT COUNT(*)::int AS total FROM anuncios WHERE status = 'ativo'"),
      db.get("SELECT COUNT(*)::int AS total FROM anuncios WHERE status = 'pendente'"),
      db.get('SELECT COUNT(*)::int AS total FROM categorias'),
      db.get("SELECT COALESCE(SUM(valor), 0)::float AS total FROM pagamentos WHERE status = 'aprovado'"),
      db.get("SELECT COALESCE(SUM(valor), 0)::float AS total FROM pagamentos WHERE status = 'aprovado' AND data_pagamento::timestamptz >= date_trunc('month', now())"),
      db.get("SELECT COUNT(*)::int AS total FROM pagamentos WHERE status = 'aprovado'"),
      db.get('SELECT COALESCE(SUM(contagem), 0)::int AS total FROM foto_curtidas'),
      db.get('SELECT COUNT(*)::int AS total FROM foto_comentarios'),
      db.get('SELECT COUNT(*)::int AS total FROM visualizacoes_anuncio'),
    ]);

    const [anunciosPendentesLista, novosComerciantes, pagamentosRecentes] = await Promise.all([
      db.all(
        `SELECT a.id, a.titulo, c.nome AS nome_comerciante
         FROM anuncios a
         JOIN comerciantes c ON c.id = a.id_comerciante
         WHERE a.status = 'pendente'
         ORDER BY a.criado_em DESC
         LIMIT 10`
      ),
      db.all(
        `SELECT id, nome, email, data_criacao
         FROM comerciantes
         WHERE data_criacao::timestamptz >= now() - interval '24 hours'
         ORDER BY data_criacao DESC
         LIMIT 10`
      ),
      db.all(
        `SELECT id, tipo_plano, valor, data_pagamento
         FROM pagamentos
         WHERE status = 'aprovado' AND data_pagamento::timestamptz >= now() - interval '24 hours'
         ORDER BY data_pagamento DESC
         LIMIT 10`
      ),
    ]);

    const notificacoes = [
      ...anunciosPendentesLista.map((a) => ({
        tipo: 'anuncio_pendente',
        texto: `Anúncio "${a.titulo}" de ${a.nome_comerciante} aguardando aprovação`,
        data: null,
      })),
      ...novosComerciantes.map((c) => ({
        tipo: 'novo_comerciante',
        texto: `Novo comerciante cadastrado: ${c.nome} (${c.email})`,
        data: c.data_criacao,
      })),
      ...pagamentosRecentes.map((p) => ({
        tipo: 'pagamento_aprovado',
        texto: `Pagamento aprovado: R$ ${Number(p.valor).toFixed(2)} (${p.tipo_plano})`,
        data: p.data_pagamento,
      })),
    ];

    res.json({
      cadastros: {
        comerciantes_total: comerciantesTotal.total,
        comerciantes_ativos: comerciantesAtivos.total,
        comerciantes_degustacao: comerciantesDegustacao.total,
        comerciantes_expirados: comerciantesExpirados.total,
        turistas_total: turistasTotal.total,
        turistas_ativos: turistasAtivos.total,
        anuncios_total: anunciosTotal.total,
        anuncios_ativos: anunciosAtivos.total,
        anuncios_pendentes: anunciosPendentesCount.total,
        categorias_total: categoriasTotal.total,
      },
      financeiro: {
        receita_total: receitaTotal.total,
        receita_mes_atual: receitaMesAtual.total,
        pagamentos_aprovados_total: pagamentosAprovadosTotal.total,
        assinaturas_ativas: comerciantesAtivos.total + turistasAtivos.total,
      },
      engajamento: {
        curtidas_total: curtidasTotal.total,
        comentarios_total: comentariosTotal.total,
        visualizacoes_total: visualizacoesTotal.total,
      },
      notificacoes,
    });
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar resumo geral:', err);
    res.status(500).json({ erro: 'Erro ao buscar resumo geral.' });
  }
});

// =========================================================
// FASE 3 DO DASHBOARD - SISTEMA DE AFILIADOS (admin)
// =========================================================
//
// GET /api/admin/afiliados
// Lista todos os afiliados com estatisticas agregadas (cliques, indicacoes,
// comissao pendente/paga) para a nova aba "Afiliados" do painel.

router.get('/afiliados', autenticarAdmin, async (req, res) => {
  try {
    const afiliados = await db.all(
      `SELECT a.id, a.nome, a.email, a.codigo, a.status, a.cliques, a.criado_em,
              a.rg, a.cpf, a.telefone, a.chave_pix, a.termos_aceitos_em, a.termos_versao,
              a.email_confirmado, a.perfil_completo,
              (a.documento_base64 IS NOT NULL) AS tem_documento,
              (SELECT COUNT(*)::int FROM comerciantes c WHERE c.id_afiliado_referenciador = a.id) AS indicacoes_total,
              COALESCE((SELECT SUM(valor_comissao) FROM comissoes_afiliado co WHERE co.id_afiliado = a.id AND co.status = 'pendente'), 0)::float AS comissao_pendente,
              COALESCE((SELECT SUM(valor_comissao) FROM comissoes_afiliado co WHERE co.id_afiliado = a.id AND co.status = 'pago'), 0)::float AS comissao_paga
       FROM afiliados a
       ORDER BY a.criado_em DESC`
    );
    res.json(afiliados);
  } catch (err) {
    console.error('[ADMIN] Erro ao listar afiliados:', err);
    res.status(500).json({ erro: 'Erro ao listar afiliados.' });
  }
});

// GET /api/admin/afiliados/:id/documento - devolve o documento (RG/CPF)
// anexado no cadastro como arquivo binario, para o admin conferir a
// identidade antes de liberar o pagamento das comissoes. Nao aparece na
// listagem geral (que so tem um booleano "tem_documento") pra nao pesar o
// payload da tabela.
router.get('/afiliados/:id/documento', autenticarAdmin, async (req, res) => {
  try {
    const afiliado = await db.get(
      'SELECT documento_base64, documento_tipo, documento_nome FROM afiliados WHERE id = ?',
      [req.params.id]
    );
    if (!afiliado || !afiliado.documento_base64) {
      return res.status(404).json({ erro: 'Documento nao encontrado.' });
    }
    const buffer = Buffer.from(afiliado.documento_base64, 'base64');
    res.setHeader('Content-Type', afiliado.documento_tipo || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${afiliado.documento_nome || 'documento'}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar documento do afiliado:', err);
    res.status(500).json({ erro: 'Erro ao buscar documento do afiliado.' });
  }
});

// GET /api/admin/afiliados/:id/comissoes - extrato detalhado de um afiliado
// (usado para conferir antes de fazer o fechamento do mes).
router.get('/afiliados/:id/comissoes', autenticarAdmin, async (req, res) => {
  try {
    const comissoes = await db.all(
      `SELECT co.id, co.valor_comissao, co.mes_referencia, co.status, co.criado_em, co.pago_em,
              c.nome AS nome_comerciante
       FROM comissoes_afiliado co
       LEFT JOIN comerciantes c ON c.id = co.id_comerciante
       WHERE co.id_afiliado = ?
       ORDER BY co.criado_em DESC`,
      [req.params.id]
    );
    res.json(comissoes);
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar comissoes do afiliado:', err);
    res.status(500).json({ erro: 'Erro ao buscar comissoes do afiliado.' });
  }
});

// PUT /api/admin/afiliados/:id/fechar-mes - fechamento mensal: marca como
// "pago" todas as comissoes pendentes de um afiliado num mes de referencia
// (o admin paga por fora do site - Pix, transferencia - e confirma aqui).
// body: { mes_referencia: 'YYYY-MM' } - se omitido, usa o mes atual.
router.put('/afiliados/:id/fechar-mes', autenticarAdmin, async (req, res) => {
  try {
    const mesReferencia = req.body.mes_referencia || new Date().toISOString().slice(0, 7);
    const agora = new Date().toISOString();

    const resultado = await db.run(
      `UPDATE comissoes_afiliado SET status = 'pago', pago_em = ?
       WHERE id_afiliado = ? AND mes_referencia = ? AND status = 'pendente'`,
      [agora, req.params.id, mesReferencia]
    );

    res.json({ sucesso: true, mes_referencia: mesReferencia, comissoes_pagas: resultado.changes || 0 });
  } catch (err) {
    console.error('[ADMIN] Erro ao fechar mes do afiliado:', err);
    res.status(500).json({ erro: 'Erro ao fechar mes do afiliado.' });
  }
});

// PUT /api/admin/afiliados/:id/status - bloquear/desbloquear um afiliado
// (ex: uso indevido do link). body: { status: 'ativo' | 'bloqueado' }
router.put('/afiliados/:id/status', autenticarAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['ativo', 'bloqueado'].includes(status)) {
    return res.status(400).json({ erro: 'Status invalido. Use "ativo" ou "bloqueado".' });
  }
  try {
    await db.run('UPDATE afiliados SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('[ADMIN] Erro ao atualizar status do afiliado:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status do afiliado.' });
  }
});

// DELETE /api/admin/afiliados/:id - exclui um afiliado (ex: cadastros de
// teste). As comissoes desse afiliado sao removidas junto (ON DELETE
// CASCADE em comissoes_afiliado). O vinculo id_afiliado_referenciador nos
// comerciantes ja indicados nao e apagado, so fica "orfao" (sem FK), entao
// o historico de quem indicou quem se mantem mesmo apos a exclusao.
router.delete('/afiliados/:id', autenticarAdmin, async (req, res) => {
  try {
    const afiliado = await db.get('SELECT id FROM afiliados WHERE id = ?', [req.params.id]);
    if (!afiliado) {
      return res.status(404).json({ erro: 'Afiliado nao encontrado.' });
    }
    await db.run('DELETE FROM afiliados WHERE id = ?', [req.params.id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('[ADMIN] Erro ao excluir afiliado:', err);
    res.status(500).json({ erro: 'Erro ao excluir afiliado.' });
  }
});

// =========================================================
// EXPORTAR ROUTER
// =========================================================

module.exports = router;
