'use strict';

const db = require('./connection');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comerciantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      plano TEXT NOT NULL DEFAULT 'gratuito', -- gratuito | basico | premium
      status TEXT NOT NULL DEFAULT 'degustacao', -- degustacao | ativo | expirado
      data_criacao TEXT NOT NULL DEFAULT (datetime('now')),
      data_inicio_degustacao TEXT NOT NULL DEFAULT (datetime('now')),
      data_expiracao TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      icone_url TEXT,
      slug TEXT UNIQUE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS anuncios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT,
      categoria_id INTEGER,
      fotos TEXT DEFAULT '[]', -- json array de paths
      tags TEXT DEFAULT '[]', -- json array
      id_comerciante INTEGER NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'pendente', -- pendente | ativo | rejeitado
      FOREIGN KEY (categoria_id) REFERENCES categorias(id),
      FOREIGN KEY (id_comerciante) REFERENCES comerciantes(id) ON DELETE CASCADE
    );
  `);

  // Migracoes incrementais (adiciona colunas em bancos ja existentes sem perder dados)
  const colunasAnuncios = db.prepare('PRAGMA table_info(anuncios)').all().map((c) => c.name);
  if (!colunasAnuncios.includes('latitude')) {
    db.exec('ALTER TABLE anuncios ADD COLUMN latitude REAL;');
  }
  if (!colunasAnuncios.includes('longitude')) {
    db.exec('ALTER TABLE anuncios ADD COLUMN longitude REAL;');
  }
  if (!colunasAnuncios.includes('status')) {
    db.exec("ALTER TABLE anuncios ADD COLUMN status TEXT NOT NULL DEFAULT 'pendente';");
    // Anuncios ja existentes (criados antes da moderacao existir) permanecem visiveis.
    db.exec("UPDATE anuncios SET status = 'ativo' WHERE status IS NULL OR status = 'pendente';");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_comerciante INTEGER,
      tipo_plano TEXT NOT NULL, -- turista | comerciante_basico | comerciante_premium
      valor REAL NOT NULL,
      data_pagamento TEXT DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aprovado | rejeitado
      mp_payment_id TEXT,
      mp_preference_id TEXT,
      FOREIGN KEY (id_comerciante) REFERENCES comerciantes(id)
    );
  `);

  // Corrige anuncios de exemplo (seed) que ficaram com fotos placeholder SVG
  // em vez das fotos reais em /assets/comerciantes/ (bug de versoes anteriores
  // do seed). Idempotente: so atualiza se o titulo bater E a foto ainda for
  // um placeholder, nunca sobrescreve fotos reais ja customizadas pelo usuario.
  const correcoesFotos = [
    { titulo: 'Passeio de Lancha pelas Piscinas Naturais', foto: '/assets/comerciantes/passeio-lancha.jpg' },
    { titulo: 'Mergulho Guiado nos Corais', foto: '/assets/comerciantes/mergulho-corais.jpg' },
    { titulo: 'Buggy pelas Dunas com Paradas para Banho', foto: '/assets/comerciantes/buggy-dunas.jpg' },
    { titulo: 'Frutos do Mar Frescos a Beira-Mar', foto: '/assets/comerciantes/restaurante-mar-azul.jpg' },
  ];
  const updateFotos = db.prepare(
    "UPDATE anuncios SET fotos = ? WHERE titulo = ? AND (fotos LIKE '%placeholder%' OR fotos LIKE '%destaque-%')"
  );
  for (const item of correcoesFotos) {
    updateFotos.run(JSON.stringify([item.foto]), item.titulo);
  }

  console.log('[db] migrations aplicadas com sucesso.');
}

module.exports = migrate;

if (require.main === module) {
  migrate();
}
