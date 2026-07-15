'use strict';
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || './data/portal.db';
const resolvedPath = path.isAbsolute(DB_PATH)
  ? DB_PATH
  : path.join(__dirname, '..', '..', DB_PATH);

const dir = path.dirname(resolvedPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(resolvedPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Cria as tabelas se ainda não existirem (idempotente - roda toda vez que o servidor sobe)
db.exec(`
CREATE TABLE IF NOT EXISTS comerciantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  senha_hash TEXT NOT NULL,
  plano TEXT DEFAULT 'gratuito',
  status TEXT DEFAULT 'degustacao',
  data_criacao TEXT,
  data_inicio_degustacao TEXT,
  data_expiracao TEXT
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  icone_url TEXT,
  slug TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS anuncios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  fotos TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  id_comerciante INTEGER NOT NULL REFERENCES comerciantes(id),
  latitude REAL,
  longitude REAL,
  status TEXT DEFAULT 'pendente',
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_comerciante INTEGER REFERENCES comerciantes(id),
  tipo_plano TEXT,
  valor REAL,
  status TEXT DEFAULT 'pendente',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  data_pagamento TEXT DEFAULT (datetime('now'))
);
`);

// Popula categorias padrão automaticamente, só na primeira vez (tabela vazia)
const totalCategorias = db.prepare('SELECT COUNT(*) AS total FROM categorias').get().total;
if (totalCategorias === 0) {
  const categoriasPadrao = [
    ['Hotéis & Pousadas', '🏨', 'hoteis-pousadas'],
    ['Resorts', '🏝️', 'resorts'],
    ['Passeios de Barco', '🚤', 'passeios-de-barco'],
    ['Buggys & Traslados', '🏎️', 'buggys-traslados'],
    ['Restaurantes & Bares', '🍽️', 'restaurantes-bares'],
    ['Serviços de Praia', '🏖️', 'servicos-de-praia'],
    ['Pousadas', '🏨', 'pousadas'],
    ['Gastronomia', '🍽️', 'gastronomia'],
    ['Passeios Ecológicos', '🌿', 'passeios-ecologicos'],
    ['Artesanato Local', '🎨', 'artesanato-local'],
  ];
  const inserir = db.prepare('INSERT INTO categorias (nome, icone_url, slug) VALUES (?, ?, ?)');
  categoriasPadrao.forEach(([nome, icone_url, slug]) => inserir.run(nome, icone_url, slug));
  console.log(`[db] ${categoriasPadrao.length} categorias padrao criadas.`);
}

module.exports = db;
