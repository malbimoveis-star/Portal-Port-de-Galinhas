'use strict';

const db = require('./connection');

function migrate() {
  // =========================================================
  // COMERCIANTES
  // =========================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS comerciantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      plano TEXT NOT NULL DEFAULT 'gratuito',
      status TEXT NOT NULL DEFAULT 'degustacao',
      data_criacao TEXT NOT NULL DEFAULT (datetime('now')),
      data_inicio_degustacao TEXT NOT NULL DEFAULT (datetime('now')),
      data_expiracao TEXT
    );
  `);

  // =========================================================
  // CATEGORIAS
  // =========================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      icone_url TEXT,
      slug TEXT UNIQUE
    );
  `);

  // =========================================================
  // ANÚNCIOS
  // =========================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS anuncios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT,
      categoria_id INTEGER,
      fotos TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      id_comerciante INTEGER NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'pendente',
      FOREIGN KEY (categoria_id) REFERENCES categorias(id),
      FOREIGN KEY (id_comerciante) REFERENCES comerciantes(id)
        ON DELETE CASCADE
    );
  `);

  // =========================================================
  // CORREÇÃO DE COLUNAS ANTIGAS DOS ANÚNCIOS
  // =========================================================

  const colunasAnuncios = db
    .prepare('PRAGMA table_info(anuncios)')
    .all()
    .map((c) => c.name);

  if (!colunasAnuncios.includes('latitude')) {
    db.exec(`
      ALTER TABLE anuncios
      ADD COLUMN latitude REAL;
    `);
  }

  if (!colunasAnuncios.includes('longitude')) {
    db.exec(`
      ALTER TABLE anuncios
      ADD COLUMN longitude REAL;
    `);
  }

  if (!colunasAnuncios.includes('status')) {
    db.exec(`
      ALTER TABLE anuncios
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pendente';
    `);
  }

  // =========================================================
  // PAGAMENTOS
  // =========================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_comerciante INTEGER,
      tipo_plano TEXT NOT NULL,
      valor REAL NOT NULL,
      data_pagamento TEXT DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pendente',
      mp_payment_id TEXT,
      mp_preference_id TEXT,
      FOREIGN KEY (id_comerciante)
        REFERENCES comerciantes(id)
    );
  `);

  // =========================================================
  // CORREÇÃO DAS FOTOS DOS ANÚNCIOS DE TESTE
  // =========================================================

  const correcoesFotos = [
    {
      titulo: 'Passeio de Lancha pelas Piscinas Naturais',
      foto: '/assets/comerciantes/passeio-lancha.jpg'
    },
    {
      titulo: 'Mergulho Guiado nos Corais',
      foto: '/assets/comerciantes/mergulho-corais.jpg'
    },
    {
      titulo: 'Buggy pelas Dunas com Paradas para Banho',
      foto: '/assets/comerciantes/buggy-dunas.jpg'
    },
    {
      titulo: 'Frutos do Mar Frescos a Beira-Mar',
      foto: '/assets/comerciantes/restaurante-mar-azul.jpg'
    }
  ];

  const updateFotos = db.prepare(
    `
    UPDATE anuncios
    SET fotos = ?
    WHERE titulo = ?
      AND (
        fotos LIKE '%placeholder%'
        OR fotos LIKE '%destaque-%'
      )
    `
  );

  for (const item of correcoesFotos) {
    updateFotos.run(
      JSON.stringify([item.foto]),
      item.titulo
    );
  }

  // =========================================================
  // BLOG - ARTIGOS
  // =========================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS artigos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      slug TEXT NOT NULL UNIQUE,

      capa_url TEXT,

      publicado INTEGER NOT NULL DEFAULT 0,

      criado_em TEXT NOT NULL
        DEFAULT (datetime('now')),

      atualizado_em TEXT NOT NULL
        DEFAULT (datetime('now'))
    );
  `);

  // =========================================================
  // BLOG - TRADUÇÕES DOS ARTIGOS
  // =========================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS artigo_traducoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      artigo_id INTEGER NOT NULL,

      idioma TEXT NOT NULL,

      titulo TEXT NOT NULL,

      resumo TEXT DEFAULT '',

      conteudo TEXT NOT NULL,

      seo_titulo TEXT DEFAULT '',

      seo_descricao TEXT DEFAULT '',

      seo_keywords TEXT DEFAULT '',

      criado_em TEXT NOT NULL
        DEFAULT (datetime('now')),

      atualizado_em TEXT NOT NULL
        DEFAULT (datetime('now')),

      FOREIGN KEY (artigo_id)
        REFERENCES artigos(id)
        ON DELETE CASCADE,

      UNIQUE (artigo_id, idioma)
    );
  `);

  // =========================================================
  // ÍNDICES DO BLOG
  // =========================================================

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artigo_traducoes_artigo
    ON artigo_traducoes(artigo_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artigo_traducoes_idioma
    ON artigo_traducoes(idioma);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artigos_publicado
    ON artigos(publicado);
  `);

  // =========================================================
  // FINALIZAÇÃO
  // =========================================================

  console.log(
    '[db] migrations aplicadas com sucesso.'
  );
}

module.exports = migrate;

if (require.main === module) {
  migrate();
}
