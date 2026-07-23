'use strict';

const db = require('./connection');

function migrate() {

  console.log('[DB] Iniciando migrations...');

  // =====================================================
  // TABELA COMERCIANTES
  // =====================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS comerciantes (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

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

      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
      data_inicio_degustacao TEXT DEFAULT CURRENT_TIMESTAMP,
      data_expiracao TEXT,

      email_confirmado INTEGER DEFAULT 0,

      token_confirmacao_email TEXT,
      token_confirmacao_expira_em TEXT,

      token_recuperacao_senha TEXT,
      token_recuperacao_expira_em TEXT,

      data_expiracao_degustacao TEXT

    );
  `);

  const colunasComerciante = db
    .prepare("PRAGMA table_info(comerciantes)")
    .all()
    .map(c => c.name);

  function criarColuna(nome, tipo){

    if(!colunasComerciante.includes(nome)){

      db.exec(`ALTER TABLE comerciantes ADD COLUMN ${nome} ${tipo};`);

      console.log("[DB] Coluna criada:", nome);

    }

  }

  criarColuna("categoria","TEXT DEFAULT ''");
  criarColuna("cidade","TEXT DEFAULT ''");
  criarColuna("endereco","TEXT DEFAULT ''");
  criarColuna("descricao","TEXT DEFAULT ''");

  criarColuna("logo","TEXT DEFAULT ''");
  criarColuna("banner","TEXT DEFAULT ''");
  criarColuna("site","TEXT DEFAULT ''");

  criarColuna("latitude","REAL");
  criarColuna("longitude","REAL");

  criarColuna("curtidas","INTEGER DEFAULT 0");
  criarColuna("seguidores","INTEGER DEFAULT 0");
  criarColuna("media_avaliacoes","REAL DEFAULT 5");
    // =====================================================
  // TABELA CATEGORIAS
  // =====================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      nome TEXT NOT NULL,

      icone_url TEXT,

      slug TEXT UNIQUE

    );
  `);


  // =====================================================
  // TABELA ANUNCIOS
  // =====================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS anuncios (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      titulo TEXT NOT NULL,

      descricao TEXT,

      categoria_id INTEGER,

      fotos TEXT DEFAULT '[]',

      tags TEXT DEFAULT '[]',

      id_comerciante INTEGER NOT NULL,

      endereco TEXT,

      latitude REAL,

      longitude REAL,

      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,

      status TEXT DEFAULT 'pendente',

      FOREIGN KEY(categoria_id)
      REFERENCES categorias(id),

      FOREIGN KEY(id_comerciante)
      REFERENCES comerciantes(id)
      ON DELETE CASCADE

    );
  `);


  const colunasAnuncio = db
    .prepare("PRAGMA table_info(anuncios)")
    .all()
    .map(c => c.name);

  function criarColunaAnuncio(nome,tipo){

    if(!colunasAnuncio.includes(nome)){

      db.exec(`ALTER TABLE anuncios ADD COLUMN ${nome} ${tipo};`);

      console.log("[DB] Coluna criada:",nome);

    }

  }

  criarColunaAnuncio("endereco","TEXT");
  criarColunaAnuncio("latitude","REAL");
  criarColunaAnuncio("longitude","REAL");
  criarColunaAnuncio("status","TEXT DEFAULT 'pendente'");


  // =====================================================
  // TABELA PAGAMENTOS
  // =====================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS pagamentos (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      id_comerciante INTEGER,

      tipo_plano TEXT,

      valor REAL,

      data_pagamento TEXT DEFAULT CURRENT_TIMESTAMP,

      status TEXT DEFAULT 'pendente',

      mp_payment_id TEXT,

      mp_preference_id TEXT,

      FOREIGN KEY(id_comerciante)
      REFERENCES comerciantes(id)

    );
  `);
    // =====================================================
  // TABELA ARTIGOS
  // =====================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS artigos (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      titulo TEXT NOT NULL,

      resumo TEXT DEFAULT '',

      conteudo TEXT NOT NULL,

      capa_url TEXT,

      publicado INTEGER DEFAULT 0,

      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP

    );
  `);


  // =====================================================
  // TABELA ARTIGO_TRADUCOES
  // =====================================================

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

      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (artigo_id)
      REFERENCES artigos(id)
      ON DELETE CASCADE,

      UNIQUE(artigo_id, idioma)

    );
  `);


  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artigos_publicado
    ON artigos(publicado);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_traducao_artigo
    ON artigo_traducoes(artigo_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_traducao_idioma
    ON artigo_traducoes(idioma);
  `);


  console.log("[DB] Todas as migrations executadas com sucesso.");

}

module.exports = migrate;

if (require.main === module) {

  migrate();

}
