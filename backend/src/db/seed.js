'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const migrate = require('./migrate');
const db = require('./connection');

async function limparTabelas() {
  await db.exec('DELETE FROM artigos;');
  await db.exec('DELETE FROM artigo_traducoes;');
  await db.exec('DELETE FROM anuncios;');
  await db.exec('DELETE FROM pagamentos;');
  await db.exec('DELETE FROM comerciantes;');
  await db.exec('DELETE FROM categorias;');
}

async function seed() {

  await limparTabelas();

  const categorias = [
    {
      nome: 'Hoteis & Pousadas',
      icone_url: '/assets/icons/hoteis.svg',
      slug: 'hoteis-pousadas'
    },
    {
      nome: 'Resorts',
      icone_url: '/assets/icons/resorts.svg',
      slug: 'resorts'
    },
    {
      nome: 'Passeios de Barco',
      icone_url: '/assets/icons/passeios-barco.svg',
      slug: 'passeios-de-barco'
    },
    {
      nome: 'Buggys & Traslados',
      icone_url: '/assets/icons/buggys.svg',
      slug: 'buggys-traslados'
    },
    {
      nome: 'Restaurantes & Bares',
      icone_url: '/assets/icons/restaurantes.svg',
      slug: 'restaurantes-bares'
    },
    {
      nome: 'Comercios Regionais',
      icone_url: '/assets/icons/comercios-regionais.svg',
      slug: 'comercios-regionais'
    },
    {
      nome: 'Mergulho',
      icone_url: '/assets/icons/mergulho.svg',
      slug: 'mergulho'
    },
    {
      nome: 'Jet Ski',
      icone_url: '/assets/icons/jetski.svg',
      slug: 'jet-ski'
    },
    {
      nome: 'Servicos de Praia',
      icone_url: '/assets/icons/servicos-praia.svg',
      slug: 'servicos-de-praia'
    }
  ];

  const categoriaIds = {};

  for (const categoria of categorias) {

    const resultado = await db.run(
      `INSERT INTO categorias
        (
          nome,
          icone_url,
          slug
        )
        VALUES (?, ?, ?)`,
      [categoria.nome, categoria.icone_url, categoria.slug]
    );

    categoriaIds[categoria.slug] = resultado.lastInsertRowid;
  }

  const senhaHashPadrao = bcrypt.hashSync('senha123', 10);

  const agora = new Date();

  const insertComercianteSql = `
      INSERT INTO comerciantes
      (
        nome,
        email,
        telefone,
        senha_hash,
        plano,
        status,
        data_criacao,
        data_inicio_degustacao,
        data_expiracao
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const expiracao =
    new Date(
      agora.getTime() +
      30 * 24 * 60 * 60 * 1000
    ).toISOString();

  const com1 = await db.run(insertComercianteSql, [
    'Passeios Recife Mar',
    'contato@recifemar.com.br',
    '5581999990001',
    senhaHashPadrao,
    'premium',
    'ativo',
    agora.toISOString(),
    agora.toISOString(),
    expiracao
  ]);

  const com2 = await db.run(insertComercianteSql, [
    'Buggy Tour Porto',
    'contato@buggytourporto.com.br',
    '5581999990002',
    senhaHashPadrao,
    'gratuito',
    'degustacao',
    agora.toISOString(),
    agora.toISOString(),
    null
  ]);

  const com3 = await db.run(insertComercianteSql, [
    'Restaurante Sabor do Mar',
    'contato@sabordomar.com.br',
    '5581999990003',
    senhaHashPadrao,
    'gratuito',
    'expirado',
    agora.toISOString(),
    agora.toISOString(),
    null
  ]);

  const com4 = await db.run(insertComercianteSql, [
    'Pousada Mar Azul',
    'contato@pousadamarazul.com.br',
    '5581999990004',
    senhaHashPadrao,
    'premium',
    'ativo',
    agora.toISOString(),
    agora.toISOString(),
    expiracao
  ]);

  const insertAnuncioSql = `
      INSERT INTO anuncios
      (
        titulo,
        descricao,
        categoria_id,
        fotos,
        tags,
        id_comerciante,
        latitude,
        longitude,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
    `;

  await db.run(insertAnuncioSql, [
    'Passeio de Lancha pelas Piscinas Naturais',
    'Passeio completo pelas piscinas naturais de Porto de Galinhas.',
    categoriaIds['passeios-de-barco'],
    JSON.stringify(['/assets/comerciantes/passeio-lancha.jpg']),
    JSON.stringify(['lancha', 'piscinas naturais']),
    com1.lastInsertRowid,
    -8.5057,
    -34.9976
  ]);

  await db.run(insertAnuncioSql, [
    'Mergulho Guiado nos Corais',
    'Mergulho com instrutor e equipamento incluso.',
    categoriaIds['mergulho'],
    JSON.stringify(['/assets/comerciantes/mergulho-corais.jpg']),
    JSON.stringify(['mergulho', 'corais']),
    com1.lastInsertRowid,
    -8.503,
    -34.9955
  ]);

  await db.run(insertAnuncioSql, [
    'Buggy pelas Dunas',
    'Passeio de buggy pelas praias e dunas próximas.',
    categoriaIds['buggys-traslados'],
    JSON.stringify(['/assets/comerciantes/buggy-dunas.jpg']),
    JSON.stringify(['buggy', 'aventura']),
    com2.lastInsertRowid,
    -8.4931,
    -35.0206
  ]);

  await db.run(insertAnuncioSql, [
    'Restaurante Sabor do Mar',
    'Frutos do mar frescos com vista para o oceano.',
    categoriaIds['restaurantes-bares'],
    JSON.stringify(['/assets/comerciantes/restaurante-mar-azul.jpg']),
    JSON.stringify(['restaurante', 'frutos do mar']),
    com3.lastInsertRowid,
    -8.5115,
    -35.0031
  ]);

  await db.run(insertAnuncioSql, [
    'Pousada Mar Azul',
    'Hospedagem confortável perto da praia.',
    categoriaIds['hoteis-pousadas'],
    JSON.stringify(['/assets/comerciantes/pousada-mar-azul-piscina.jpg']),
    JSON.stringify(['pousada', 'hospedagem']),
    com4.lastInsertRowid,
    -8.5121,
    -35.0042
  ]);

  // =========================================================
  // BLOG - ARTIGOS
  // =========================================================

  const insertArtigoSql = `
      INSERT INTO artigos
      (
        titulo,
        resumo,
        conteudo,
        capa_url,
        publicado
      )
      VALUES (?, ?, ?, ?, ?)
    `;

  await db.run(insertArtigoSql, [
    'As melhores piscinas naturais de Porto de Galinhas',
    'Conheça as águas cristalinas e os passeios mais procurados.',
    `
      <h2>Piscinas Naturais</h2>

      <p>
      Porto de Galinhas possui algumas das praias
      mais bonitas do Brasil.
      </p>

      <p>
      As piscinas naturais formadas pelos recifes
      são uma atração imperdível.
      </p>
    `,
    '/assets/comerciantes/passeio-lancha.jpg',
    1
  ]);

  await db.run(insertArtigoSql, [
    'Guia completo de Porto de Galinhas',
    'Dicas para aproveitar sua viagem ao litoral pernambucano.',
    `
      <h2>Planeje sua viagem</h2>

      <p>
      Descubra praias, restaurantes,
      passeios e hospedagens.
      </p>
    `,
    '/assets/comerciantes/pousada-mar-azul-piscina.jpg',
    1
  ]);

  console.log('[seed] Dados inseridos com sucesso:');
  console.log(` - ${categorias.length} categorias`);
  console.log(' - comerciantes criados');
  console.log(' - anúncios criados');
  console.log(' - artigos do blog criados');
}

// =========================================================
// EXECUTAR SE NECESSÁRIO
// =========================================================

async function seedSeNecessario() {

  await migrate();

  const resultado = await db.get(
    'SELECT COUNT(*) AS total FROM categorias'
  );

  // O driver `pg` retorna COUNT(*) como string (tipo bigint do Postgres
  // nao cabe com seguranca num Number do JS), entao convertemos antes
  // de comparar - ao contrario do node:sqlite, que ja devolvia number.
  const totalCategorias = Number(resultado.total);

  if (totalCategorias === 0) {

    console.log(
      '[seed] Banco vazio. Criando dados iniciais...'
    );

    await seed();

  } else {

    console.log(
      `[seed] Banco já possui dados (${totalCategorias} categorias).`
    );

  }

}

// =========================================================
// EXPORTAR
// =========================================================

module.exports = {
  seed,
  seedSeNecessario
};

// =========================================================
// EXECUTAR MANUALMENTE
// =========================================================

if (require.main === module) {

  (async () => {
    await migrate();
    await seed();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });

}
