'use strict';

const express = require('express');
const db = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { comercianteVisivelPublicamente } = require('../utils/status');
const { identificarOpcional } = require('../middleware/authTurista');
const { turistaAtivo } = require('../utils/turistaStatus');
const { notificarAdmin } = require('../utils/mailer');

const router = express.Router();

// Ate 25 fotos e 25 videos por anuncio.
const uploadMidia = upload.fields([
  { name: 'fotos', maxCount: 25 },
  { name: 'videos', maxCount: 25 },
]);

function parseAnuncio(anuncio) {
  return {
    ...anuncio,
    fotos: JSON.parse(anuncio.fotos || '[]'),
    videos: JSON.parse(anuncio.videos || '[]'),
    tags: JSON.parse(anuncio.tags || '[]'),
  };
}

router.get('/', async (req, res) => {
  const { categoria_id } = req.query;

  let anuncios;
  if (categoria_id) {
    anuncios = await db.all("SELECT * FROM anuncios WHERE categoria_id = ? AND status = 'ativo' ORDER BY criado_em DESC", [categoria_id]);
  } else {
    anuncios = await db.all("SELECT * FROM anuncios WHERE status = 'ativo' ORDER BY criado_em DESC");
  }

  // NOTA (migração Postgres): Array.prototype.filter não suporta predicado
  // assíncrono (o retorno de uma função async dentro de filter() é sempre
  // uma Promise, que é truthy). Calculamos a visibilidade de cada anuncio
  // primeiro com Promise.all e depois filtramos pelo resultado, preservando
  // a mesma ordem e o mesmo resultado do filter() síncrono original.
  const visibilidade = await Promise.all(anuncios.map(async (anuncio) => {
    const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [anuncio.id_comerciante]);
    return Boolean(comerciante) && (await comercianteVisivelPublicamente(comerciante));
  }));

  const visiveis = anuncios.filter((_, idx) => visibilidade[idx]);

  res.json(visiveis.map(parseAnuncio));
});

router.get('/:id', async (req, res) => {
  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id]);
  if (!anuncio || anuncio.status !== 'ativo') {
    return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  }

  const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [anuncio.id_comerciante]);
  if (!comerciante || !(await comercianteVisivelPublicamente(comerciante))) {
    return res.status(404).json({ erro: 'Anuncio indisponivel.' });
  }

  res.json(parseAnuncio(anuncio));
});

router.get('/comerciante/:id_comerciante', async (req, res) => {
  const comerciante = await db.get('SELECT * FROM comerciantes WHERE id = ?', [req.params.id_comerciante]);
  if (!comerciante) return res.status(404).json({ erro: 'Comerciante nao encontrado.' });

  const anuncios = await db.all("SELECT * FROM anuncios WHERE id_comerciante = ? AND status = 'ativo' ORDER BY criado_em DESC", [req.params.id_comerciante]);
  const visivel = await comercianteVisivelPublicamente(comerciante);

    const identidade = identificarOpcional(req);
    let acessoLiberado = false;
    if (identidade) {
            if (identidade.tipo === 'turista') {
                      acessoLiberado = await turistaAtivo(identidade.id);
            } else if (Number(identidade.id) === Number(req.params.id_comerciante)) {
                      acessoLiberado = true;
            }
    }

      res.json({
              visivel_publicamente: visivel,
              acesso_liberado: acessoLiberado,
              anuncios: (visivel && acessoLiberado) ? anuncios.map(parseAnuncio) : [],
      });
    });

// POST /api/anuncios/visualizacoes/lote - registra uma visualizacao para
// cada anuncio da lista (chamado pelo front-end quando a fanpage carrega os
// anuncios de um comerciante, ja que hoje os anuncios sao exibidos juntos
// como um feed, sem pagina individual por anuncio).
// body: { ids: [1, 2, 3] }
// Rota publica (sem autenticacao) - e so um contador de visualizacao, nao
// expõe nem altera dado nenhum de negocio. IDs invalidos/inexistentes ou
// de anuncios que nao estao 'ativo' sao ignorados silenciosamente.
router.post('/visualizacoes/lote', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ erro: 'Campo "ids" deve ser uma lista de IDs de anuncio.' });
  }

  // Limite de seguranca para evitar abuso (uma fanpage normal tem poucas
  // dezenas de anuncios, nunca centenas).
  const idsValidos = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 100);

  let registradas = 0;
  for (const idAnuncio of idsValidos) {
    const anuncio = await db.get("SELECT id FROM anuncios WHERE id = ? AND status = 'ativo'", [idAnuncio]);
    if (!anuncio) continue;
    await db.run('INSERT INTO visualizacoes_anuncio (id_anuncio) VALUES (?)', [idAnuncio]);
    registradas += 1;
  }

  res.json({ registradas });
});

router.get('/meus/lista', autenticar, async (req, res) => {
  const anuncios = await db.all('SELECT * FROM anuncios WHERE id_comerciante = ? ORDER BY criado_em DESC', [req.comerciante.id]);
  res.json(anuncios.map(parseAnuncio));
});

router.post('/', autenticar, uploadMidia, async (req, res) => {
  const { titulo, descricao, categoria_id, tags, endereco, latitude, longitude } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'Campo "titulo" e obrigatorio.' });

  const arquivos = req.files || {};
  const fotos = (arquivos.fotos || []).map((f) => `/assets/uploads/${f.filename}`);
  const videos = (arquivos.videos || []).map((f) => `/assets/uploads/${f.filename}`);
  const tagsArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim())) : [];

  const info = await db.run(
    `INSERT INTO anuncios (titulo, descricao, categoria_id, fotos, videos, tags, id_comerciante, endereco, latitude, longitude, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    [
      titulo, descricao || '', categoria_id || null, JSON.stringify(fotos), JSON.stringify(videos), JSON.stringify(tagsArray),
      req.comerciante.id, endereco || null, latitude || null, longitude || null
    ]
  );

  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [info.lastInsertRowid]);

  // Fase 2 do dashboard: avisa o admin por e-mail que ha um novo anuncio
  // aguardando aprovacao (todo anuncio novo comeca com status 'pendente').
  const comercianteDoAnuncio = await db.get('SELECT nome FROM comerciantes WHERE id = ?', [req.comerciante.id]);
  notificarAdmin({
    titulo: 'Novo anuncio pendente de aprovacao',
    mensagem: `O comerciante <strong>${(comercianteDoAnuncio && comercianteDoAnuncio.nome) || req.comerciante.id}</strong> enviou o anuncio "<strong>${titulo}</strong>" para revisao.`,
  }).catch((err) => console.error('[anuncios] falha ao notificar admin sobre novo anuncio pendente:', err.message));

  res.status(201).json(parseAnuncio(anuncio));
});

router.put('/:id', autenticar, uploadMidia, async (req, res) => {
  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id]);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  if (anuncio.id_comerciante !== req.comerciante.id) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para editar este anuncio.' });
  }

  const { titulo, descricao, categoria_id, tags, endereco, latitude, longitude } = req.body;
  const arquivos = req.files || {};
  const novasFotos = (arquivos.fotos || []).map((f) => `/assets/uploads/${f.filename}`);
  const novosVideos = (arquivos.videos || []).map((f) => `/assets/uploads/${f.filename}`);
  const fotosFinal = novasFotos.length > 0 ? novasFotos : JSON.parse(anuncio.fotos || '[]');
  const videosFinal = novosVideos.length > 0 ? novosVideos : JSON.parse(anuncio.videos || '[]');
  const tagsArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim())) : JSON.parse(anuncio.tags || '[]');

  await db.run(
    `UPDATE anuncios SET titulo = ?, descricao = ?, categoria_id = ?, fotos = ?, videos = ?, tags = ?, endereco = ?, latitude = ?, longitude = ? WHERE id = ?`,
    [
      titulo || anuncio.titulo,
      descricao !== undefined ? descricao : anuncio.descricao,
      categoria_id !== undefined ? categoria_id : anuncio.categoria_id,
      JSON.stringify(fotosFinal), JSON.stringify(videosFinal), JSON.stringify(tagsArray),
      endereco !== undefined ? endereco : anuncio.endereco,
      latitude !== undefined ? latitude : anuncio.latitude,
      longitude !== undefined ? longitude : anuncio.longitude,
      req.params.id
    ]
  );

  res.json(parseAnuncio(await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id])));
});

router.delete('/:id', autenticar, async (req, res) => {
  const anuncio = await db.get('SELECT * FROM anuncios WHERE id = ?', [req.params.id]);
  if (!anuncio) return res.status(404).json({ erro: 'Anuncio nao encontrado.' });
  if (anuncio.id_comerciante !== req.comerciante.id) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para remover este anuncio.' });
  }

  await db.run('DELETE FROM anuncios WHERE id = ?', [req.params.id]);
  res.json({ sucesso: true });
});

module.exports = router;
