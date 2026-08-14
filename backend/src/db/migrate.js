'use strict';

const db = require('./connection');

// =========================================================
// AUXILIAR - LISTAR COLUNAS DE UMA TABELA
// =========================================================
//
// Antes (SQLite): PRAGMA table_info(tabela)
// Agora (Postgres): consulta em information_schema.columns
//
// =========================================================

async function colunasDaTabela(tabela) {
  const linhas = await db.all(
    'SELECT column_name FROM information_schema.columns WHERE table_name = ?',
    [tabela]
  );

  return linhas.map((linha) => linha.column_name);
}

async function migrate() {

  console.log('[DB] Iniciando migrations...');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS comerciantes (

      id SERIAL PRIMARY KEY,

      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,

      categoria TEXT DEFAULT '',
      cidade TEXT DEFAULT '',
      endereco TEXT DEFAULT '',
      descricao TEXT DEFAULT '',

      logo TEXT DEFAULT '',
      banner TEXT DEFAULT '',
      site TEXT DEFAULT '',

      latitude REAL,
      longitude REAL,

      curtidas INTEGER DEFAULT 0,
      seguidores INTEGER DEFAULT 0,
      media_avaliacoes REAL DEFAULT 5,

      plano TEXT DEFAULT 'gratuito',
      status TEXT DEFAULT 'degustacao',

      data_criacao TEXT DEFAULT NOW()::text,
      data_inicio_degustacao TEXT DEFAULT NOW()::text,
      data_expiracao TEXT,

      email_confirmado INTEGER DEFAULT 0,

      token_confirmacao_email TEXT,
      token_confirmacao_expira_em TEXT,

      token_recuperacao_senha TEXT,
      token_recuperacao_expira_em TEXT,

      data_expiracao_degustacao TEXT

    );
  `);

  const colunasComerciante = await colunasDaTabela('comerciantes');

  async function criarColuna(nome, tipo) {

    if (!colunasComerciante.includes(nome)) {

      await db.exec(`ALTER TABLE comerciantes ADD COLUMN ${nome} ${tipo};`);

      console.log('[DB] Coluna criada:', nome);

    }

  }

  await criarColuna('categoria', "TEXT DEFAULT ''");
  await criarColuna('cidade', "TEXT DEFAULT ''");
  await criarColuna('endereco', "TEXT DEFAULT ''");
  await criarColuna('descricao', "TEXT DEFAULT ''");

  await criarColuna('logo', "TEXT DEFAULT ''");
  await criarColuna('banner', "TEXT DEFAULT ''");
  await criarColuna('site', "TEXT DEFAULT ''");

  await criarColuna('latitude', 'REAL');
  await criarColuna('longitude', 'REAL');

  await criarColuna('curtidas', 'INTEGER DEFAULT 0');
  await criarColuna('seguidores', 'INTEGER DEFAULT 0');
  await criarColuna('media_avaliacoes', 'REAL DEFAULT 5');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (

      id SERIAL PRIMARY KEY,

      nome TEXT NOT NULL,

      icone_url TEXT,

      slug TEXT UNIQUE

    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS anuncios (

      id SERIAL PRIMARY KEY,

      titulo TEXT NOT NULL,

      descricao TEXT,

      categoria_id INTEGER,

      fotos TEXT DEFAULT '[]',

      tags TEXT DEFAULT '[]',

      id_comerciante INTEGER NOT NULL,

      endereco TEXT,

      latitude REAL,

      longitude REAL,

      criado_em TEXT DEFAULT NOW()::text,

      status TEXT DEFAULT 'pendente',

      FOREIGN KEY(categoria_id)
      REFERENCES categorias(id),

      FOREIGN KEY(id_comerciante)
      REFERENCES comerciantes(id)
      ON DELETE CASCADE

    );
  `);

  const colunasAnuncio = await colunasDaTabela('anuncios');

  async function criarColunaAnuncio(nome, tipo) {

    if (!colunasAnuncio.includes(nome)) {

      await db.exec(`ALTER TABLE anuncios ADD COLUMN ${nome} ${tipo};`);

      console.log('[DB] Coluna criada:', nome);

    }

  }

  await criarColunaAnuncio('endereco', 'TEXT');
  await criarColunaAnuncio('latitude', 'REAL');
  await criarColunaAnuncio('longitude', 'REAL');
  await criarColunaAnuncio('status', "TEXT DEFAULT 'pendente'");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pagamentos (

      id SERIAL PRIMARY KEY,

      id_comerciante INTEGER,

      tipo_plano TEXT,

      valor REAL,

      data_pagamento TEXT DEFAULT NOW()::text,

      status TEXT DEFAULT 'pendente',

      mp_payment_id TEXT,

      mp_preference_id TEXT,

      FOREIGN KEY(id_comerciante)
      REFERENCES comerciantes(id)

    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS artigos (

      id SERIAL PRIMARY KEY,

      titulo TEXT NOT NULL,

      resumo TEXT DEFAULT '',

      conteudo TEXT NOT NULL,

      capa_url TEXT,

      publicado INTEGER DEFAULT 0,

      criado_em TEXT DEFAULT NOW()::text,

      atualizado_em TEXT DEFAULT NOW()::text

    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS artigo_traducoes (

      id SERIAL PRIMARY KEY,

      artigo_id INTEGER NOT NULL,

      idioma TEXT NOT NULL,

      titulo TEXT NOT NULL,

      resumo TEXT DEFAULT '',

      conteudo TEXT NOT NULL,

      seo_titulo TEXT DEFAULT '',

      seo_descricao TEXT DEFAULT '',

      seo_keywords TEXT DEFAULT '',

      criado_em TEXT DEFAULT NOW()::text,

      atualizado_em TEXT DEFAULT NOW()::text,

      FOREIGN KEY (artigo_id)
      REFERENCES artigos(id)
      ON DELETE CASCADE,

      UNIQUE(artigo_id, idioma)

    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artigos_publicado
    ON artigos(publicado);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_traducao_artigo
    ON artigo_traducoes(artigo_id);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_traducao_idioma
    ON artigo_traducoes(idioma);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS foto_curtidas (
      foto_key TEXT PRIMARY KEY,
      contagem INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS foto_comentarios (
      id SERIAL PRIMARY KEY,
      foto_key TEXT NOT NULL,
      nome TEXT,
      texto TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT NOW()::text
    );
  `);

  console.log('[DB] Todas as migrations executadas com sucesso.');

}

module.exports = migrate;

if (require.main === module) {

  migrate().catch((e) => {
    console.error(e);
    process.exit(1);
  });

}
