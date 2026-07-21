'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const migrate = require('./migrate');
const db = require('./connection');

function limparTabelas() {
  db.exec('DELETE FROM artigos;');
  db.exec('DELETE FROM artigo_traducoes;');
  db.exec('DELETE FROM anuncios;');
  db.exec('DELETE FROM pagamentos;');
  db.exec('DELETE FROM comerciantes;');
  db.exec('DELETE FROM categorias;');
}

function seed() {

  limparTabelas();

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


  const insertCategoria = db.prepare(`
    INSERT INTO categorias
    (
      nome,
      icone_url,
      slug
    )
    VALUES (?, ?, ?)
  `);


  const categoriaIds = {};


  for (const categoria of categorias) {

    const resultado =
      insertCategoria.run(
        categoria.nome,
        categoria.icone_url,
        categoria.slug
      );

    categoriaIds[categoria.slug] =
      resultado.lastInsertRowid;
  }


  const senhaHashPadrao =
    bcrypt.hashSync(
      'senha123',
      10
    );


  const agora =
    new Date();


  const insertComerciante =
    db.prepare(`
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
    `);


  const expiracao =
    new Date(
      agora.getTime() +
      30 * 24 * 60 * 60 * 1000
    ).toISOString();


  const com1 =
    insertComerciante.run(
      'Passeios Recife Mar',
      'contato@recifemar.com.br',
      '5581999990001',
      senhaHashPadrao,
      'premium',
      'ativo',
      agora.toISOString(),
      agora.toISOString(),
      expiracao
    );


  const com2 =
    insertComerciante.run(
      'Buggy Tour Porto',
      'contato@buggytourporto.com.br',
      '5581999990002',
      senhaHashPadrao,
      'gratuito',
      'degustacao',
      agora.toISOString(),
      agora.toISOString(),
      null
    );
    const com3 =
    insertComerciante.run(
      'Restaurante Sabor do Mar',
      'contato@sabordomar.com.br',
      '5581999990003',
      senhaHashPadrao,
      'gratuito',
      'expirado',
      agora.toISOString(),
      agora.toISOString(),
      null
    );


  const com4 =
    insertComerciante.run(
      'Pousada Mar Azul',
      'contato@pousadamarazul.com.br',
      '5581999990004',
      senhaHashPadrao,
      'premium',
      'ativo',
      agora.toISOString(),
      agora.toISOString(),
      expiracao
    );


  const insertAnuncio =
    db.prepare(`
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
    `);


  insertAnuncio.run(
    'Passeio de Lancha pelas Piscinas Naturais',
    'Passeio completo pelas piscinas naturais de Porto de Galinhas.',
    categoriaIds['passeios-de-barco'],
    JSON.stringify([
      '/assets/comerciantes/passeio-lancha.jpg'
    ]),
    JSON.stringify([
      'lancha',
      'piscinas naturais'
    ]),
    com1.lastInsertRowid,
    -8.5057,
    -34.9976
  );


  insertAnuncio.run(
    'Mergulho Guiado nos Corais',
    'Mergulho com instrutor e equipamento incluso.',
    categoriaIds['mergulho'],
    JSON.stringify([
      '/assets/comerciantes/mergulho-corais.jpg'
    ]),
    JSON.stringify([
      'mergulho',
      'corais'
    ]),
    com1.lastInsertRowid,
    -8.503,
    -34.9955
  );


  insertAnuncio.run(
    'Buggy pelas Dunas',
    'Passeio de buggy pelas praias e dunas próximas.',
    categoriaIds['buggys-traslados'],
    JSON.stringify([
      '/assets/comerciantes/buggy-dunas.jpg'
    ]),
    JSON.stringify([
      'buggy',
      'aventura'
    ]),
    com2.lastInsertRowid,
    -8.4931,
    -35.0206
  );


  insertAnuncio.run(
    'Restaurante Sabor do Mar',
    'Frutos do mar frescos com vista para o oceano.',
    categoriaIds['restaurantes-bares'],
    JSON.stringify([
      '/assets/comerciantes/restaurante-mar-azul.jpg'
    ]),
    JSON.stringify([
      'restaurante',
      'frutos do mar'
    ]),
    com3.lastInsertRowid,
    -8.5115,
    -35.0031
  );


  insertAnuncio.run(
    'Pousada Mar Azul',
    'Hospedagem confortável perto da praia.',
    categoriaIds['hoteis-pousadas'],
    JSON.stringify([
      '/assets/comerciantes/pousada-mar-azul-piscina.jpg'
    ]),
    JSON.stringify([
      'pousada',
      'hospedagem'
    ]),
    com4.lastInsertRowid,
    -8.5121,
    -35.0042
  );


  // =========================================================
  // BLOG - ARTIGOS
  // =========================================================

  const insertArtigo =
    db.prepare(`
      INSERT INTO artigos
      (
        titulo,
        resumo,
        conteudo,
        capa_url,
        publicado
      )
      VALUES (?, ?, ?, ?, ?)
    `);


  insertArtigo.run(
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
  );


  insertArtigo.run(
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
  );
    console.log('[seed] Dados inseridos com sucesso:');
  console.log(` - ${categorias.length} categorias`);
  console.log(' - comerciantes criados');
  console.log(' - anúncios criados');
  console.log(' - artigos do blog criados');
}


// =========================================================
// EXECUTAR SE NECESSÁRIO
// =========================================================

function seedSeNecessario() {

  migrate();

  const resultado =
    db.prepare(
      'SELECT COUNT(*) AS total FROM categorias'
    ).get();


  if (resultado.total === 0) {

    console.log(
      '[seed] Banco vazio. Criando dados iniciais...'
    );

    seed();

  } else {

    console.log(
      `[seed] Banco já possui dados (${resultado.total} categorias).`
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

  migrate();

  seed();

}
