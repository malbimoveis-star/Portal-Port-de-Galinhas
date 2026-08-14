'use strict';

// =========================================================
// CONEXAO POSTGRESQL (Render.com)
// =========================================================
//
// O Render.com (plano gratuito) nao oferece disco persistente,
// entao nao da pra usar SQLite em producao. Este arquivo troca
// o antigo `node:sqlite` (DatabaseSync) por um pool de conexoes
// Postgres via `pg`, mas expõe uma API de compatibilidade
// (get/all/run/exec) parecida com a API sincrona anterior, para
// minimizar mudancas nos arquivos de rotas (que so precisam
// trocar `db.prepare(sql).metodo(a, b)` por `await db.metodo(sql, [a, b])`).
//
// =========================================================

const { Pool } = require('pg');

// SSL: o Postgres gratuito do Render exige conexao TLS, mas usa um
// certificado que o Node nao valida por padrao contra uma CA publica
// conhecida, entao usamos `rejectUnauthorized: false`. Fora do Render
// (ex.: Postgres local em dev), nao forcamos SSL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

// Erros em clientes ociosos do pool emitem o evento 'error' do próprio
// objeto Pool; sem um listener aqui, um erro de rede assíncrono (fora de
// qualquer query em andamento) derrubaria o processo inteiro (unhandled
// 'error' event). Apenas logamos e seguimos.
pool.on('error', (err) => {
  console.error('[db] Erro inesperado em cliente ocioso do pool Postgres:', err);
});

// ---------------------------------------------------------
// Converte "?" (estilo SQLite) para "$1, $2, $3..." (estilo Postgres),
// na ordem em que aparecem. Ignora "?" dentro de strings entre aspas
// simples, para nao quebrar SQL que eventualmente contenha um literal
// com "?".
// ---------------------------------------------------------
function convertPlaceholders(sql) {
  let resultado = '';
  let contador = 0;
  let dentroDeString = false;

  for (let i = 0; i < sql.length; i += 1) {
    const caractere = sql[i];

    if (caractere === "'") {
      dentroDeString = !dentroDeString;
      resultado += caractere;
    } else if (caractere === '?' && !dentroDeString) {
      contador += 1;
      resultado += `$${contador}`;
    } else {
      resultado += caractere;
    }
  }

  return resultado;
}

// ---------------------------------------------------------
// Remove espacos em branco e comentarios SQL ("--" e "/* */") do
// inicio da string, para permitir detectar corretamente se a
// instrucao comeca com INSERT mesmo que venha precedida de
// identacao/comentarios.
// ---------------------------------------------------------
function removerRuidoInicial(sql) {
  let atual = sql;
  let mudou = true;

  while (mudou) {
    mudou = false;

    const semEspacos = atual.replace(/^\s+/, '');
    if (semEspacos !== atual) {
      atual = semEspacos;
      mudou = true;
    }

    if (atual.startsWith('--')) {
      const fimDeLinha = atual.indexOf('\n');
      atual = fimDeLinha === -1 ? '' : atual.slice(fimDeLinha + 1);
      mudou = true;
    }

    if (atual.startsWith('/*')) {
      const fimComentario = atual.indexOf('*/');
      atual = fimComentario === -1 ? '' : atual.slice(fimComentario + 2);
      mudou = true;
    }
  }

  return atual;
}

function comecaComInsert(sql) {
  return /^INSERT\b/i.test(removerRuidoInicial(sql));
}

function temReturning(sql) {
  return /\bRETURNING\b/i.test(sql);
}

async function get(sql, params = []) {
  const sqlConvertido = convertPlaceholders(sql);
  const resultado = await pool.query(sqlConvertido, params);
  return resultado.rows[0];
}

async function all(sql, params = []) {
  const sqlConvertido = convertPlaceholders(sql);
  const resultado = await pool.query(sqlConvertido, params);
  return resultado.rows;
}

async function run(sql, params = []) {
  const sqlConvertido = convertPlaceholders(sql);
  const isInsert = comecaComInsert(sqlConvertido);
  const jaTemReturning = temReturning(sqlConvertido);

  let sqlFinal = sqlConvertido;
  if (isInsert && !jaTemReturning) {
    sqlFinal = `${sqlConvertido.replace(/;\s*$/, '')} RETURNING id`;
  }

  try {
    const resultado = await pool.query(sqlFinal, params);
    return {
      lastInsertRowid: resultado.rows[0] ? resultado.rows[0].id : undefined,
      changes: resultado.rowCount,
    };
  } catch (err) {
    // Algumas tabelas (ex.: foto_curtidas) nao tem coluna "id" - usam
    // outra coluna como chave primaria. Se acrescentamos "RETURNING id"
    // especulativamente e o Postgres reclamar que a coluna nao existe
    // (42703 = undefined_column), refazemos a query sem o RETURNING.
    if (isInsert && !jaTemReturning && err.code === '42703') {
      const resultado = await pool.query(sqlConvertido, params);
      return { lastInsertRowid: undefined, changes: resultado.rowCount };
    }
    throw err;
  }
}

// exec roda uma ou mais instrucoes diretamente (CREATE TABLE, ALTER TABLE,
// CREATE INDEX, DELETE simples). O driver `pg` aceita multiplas instrucoes
// separadas por ";" numa unica chamada de query, desde que nao haja parametros.
async function exec(sql) {
  await pool.query(sql);
}

module.exports = { get, all, run, exec, pool };
