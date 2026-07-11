'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const migrate = require('./migrate');
const db = require('./connection');

migrate();

function limparTabelas() {
  db.exec('DELETE FROM anuncios;');
  db.exec('DELETE FROM pagamentos;');
  db.exec('DELETE FROM comerciantes;');
  db.exec('DELETE FROM categorias;');
}

function seed() {
  limparTabelas();

  const categorias = [
    { nome: 'Hoteis & Pousadas', icone_url: '/assets/icons/hoteis.svg', slug: 'hoteis-pousadas' },
    { nome: 'Resorts', icone_url: '/assets/icons/resorts.svg', slug: 'resorts' },
    { nome: 'Passeios de Barco', icone_url: '/assets/icons/passeios-barco.svg', slug: 'passeios-de-barco' },
    { nome: 'Buggys & Traslados', icone_url: '/assets/icons/buggys.svg', slug: 'buggys-traslados' },
    { nome: 'Restaurantes & Bares', icone_url: '/assets/icons/restaurantes.svg', slug: 'restaurantes-bares' },
    { nome: 'Comercios Regionais', icone_url: '/assets/icons/comercios-regionais.svg', slug: 'comercios-regionais' },
    { nome: 'Mergulho', icone_url: '/assets/icons/mergulho.svg', slug: 'mergulho' },
    { nome: 'Jet Ski', icone_url: '/assets/icons/jetski.svg', slug: 'jet-ski' },
    { nome: 'Servicos de Praia', icone_url: '/assets/icons/servicos-praia.svg', slug: 'servicos-de-praia' },
  ];

  const insertCategoria = db.prepare('INSERT INTO categorias (nome, icone_url, slug) VALUES (?, ?, ?)');
  const categoriaIds = {};
  for (const c of categorias) {
    const info = insertCategoria.run(c.nome, c.icone_url, c.slug);
    categoriaIds[c.slug] = info.lastInsertRowid;
  }

  const senhaHashPadrao = bcrypt.hashSync('senha123', 10);
  const agora = new Date();

  const insertComerciante = db.prepare(`
    INSERT INTO comerciantes
      (nome, email, telefone, senha_hash, plano, status, data_criacao, data_inicio_degustacao, data_expiracao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Comerciante 1: ativo (plano premium, ja pago)
  const dataExpiracao1 = new Date(agora.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString();
  const com1 = insertComerciante.run(
    'Passeios Recife Mar',
    'contato@recifemar.com.br',
    '5581999990001',
    senhaHashPadrao,
    'premium',
    'ativo',
    agora.toISOString(),
    agora.toISOString(),
    dataExpiracao1
  );

  // Comerciante 2: em degustacao (dentro dos 5 dias)
  const inicioDegustacao2 = new Date(agora.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(); // comecou ha 1 dia
  const com2 = insertComerciante.run(
    'Buggy Tour Porto',
    'contato@buggytourporto.com.br',
    '5581999990002',
    senhaHashPadrao,
    'gratuito',
    'degustacao',
    inicioDegustacao2,
    inicioDegustacao2,
    null
  );

  // Comerciante 3: expirado (degustacao ha mais de 5 dias, sem pagamento)
  const inicioDegustacao3 = new Date(agora.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const com3 = insertComerciante.run(
    'Restaurante Sabor do Mar',
    'contato@sabordomar.com.br',
    '5581999990003',
    senhaHashPadrao,
    'gratuito',
    'expirado',
    inicioDegustacao3,
    inicioDegustacao3,
    null
  );

  // Comerciante 4: ativo (plano premium) - Pousada Mar Azul, com fotos reais
  const dataExpiracao4 = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const com4 = insertComerciante.run(
    'Pousada Mar Azul',
    'contato@pousadamarazul.com.br',
    '5581999990004',
    senhaHashPadrao,
    'premium',
    'ativo',
    agora.toISOString(),
    agora.toISOString(),
    dataExpiracao4
  );

  const insertAnuncio = db.prepare(`
    INSERT INTO anuncios (titulo, descricao, categoria_id, fotos, tags, id_comerciante)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAnuncio.run(
    'Passeio de Lancha pelas Piscinas Naturais',
    'Explore as piscinas naturais de Porto de Galinhas em uma lancha confortavel com guia local. Duracao de 2 horas, saidas pela manha e tarde.',
    categoriaIds['passeios-de-barco'],
    JSON.stringify(['/assets/img/destaque-lancha.svg', '/assets/img/placeholder-anuncio.svg']),
    JSON.stringify(['lancha', 'piscinas naturais', 'passeio']),
    com1.lastInsertRowid
  );

  insertAnuncio.run(
    'Mergulho Guiado nos Corais',
    'Mergulho com snorkel acompanhado por instrutor certificado. Equipamento incluso.',
    categoriaIds['mergulho'],
    JSON.stringify(['/assets/img/destaque-mergulho.svg']),
    JSON.stringify(['mergulho', 'snorkel', 'corais']),
    com1.lastInsertRowid
  );

  insertAnuncio.run(
    'Buggy pelas Dunas com Paradas para Banho',
    'Tour de buggy pelas dunas e praias proximas, com paradas em piscinas naturais e praias desertas.',
    categoriaIds['buggys-traslados'],
    JSON.stringify(['/assets/img/destaque-buggy.svg']),
    JSON.stringify(['buggy', 'dunas', 'aventura']),
    com2.lastInsertRowid
  );

  insertAnuncio.run(
    'Frutos do Mar Frescos a Beira-Mar',
    'Restaurante especializado em frutos do mar, com vista para o mar e ambiente familiar.',
    categoriaIds['restaurantes-bares'],
    JSON.stringify(['/assets/img/placeholder-anuncio.svg']),
    JSON.stringify(['restaurante', 'frutos do mar']),
    com3.lastInsertRowid
  );

  insertAnuncio.run(
    'Pousada Mar Azul - Piscina e Conforto em Frente ao Mar',
    'Pousada aconchegante com piscina, poucos passos da praia, cafe da manha regional e wi-fi gratuito.',
    categoriaIds['hoteis-pousadas'],
    JSON.stringify(['/assets/comerciantes/pousada-mar-azul-piscina.jpg']),
    JSON.stringify(['pousada', 'piscina', 'hospedagem']),
    com4.lastInsertRowid
  );

  insertAnuncio.run(
    'Restaurante Mar Azul - Sabores Locais a Beira-Mar',
    'Culinaria regional e frutos do mar frescos, com vista privilegiada para o litoral de Porto de Galinhas.',
    categoriaIds['restaurantes-bares'],
    JSON.stringify(['/assets/comerciantes/restaurante-mar-azul.jpg']),
    JSON.stringify(['restaurante', 'frutos do mar', 'gastronomia']),
    com4.lastInsertRowid
  );

  insertAnuncio.run(
    'Artesanato e Comercio Local da Vila',
    'Rua de comercio com artesanato regional, lembrancas e produtos locais de Porto de Galinhas.',
    categoriaIds['comercios-regionais'],
    JSON.stringify(['/assets/comerciantes/rua-comercio-artesanato.jpg']),
    JSON.stringify(['artesanato', 'comercio local', 'lembrancas']),
    com4.lastInsertRowid
  );

  console.log('[seed] Dados de exemplo inseridos com sucesso:');
  console.log(`  - ${categorias.length} categorias`);
  console.log('  - 4 comerciantes (ativo, degustacao, expirado, ativo)');
  console.log('  - 7 anuncios de exemplo');
  console.log('');
  console.log('Login de teste (senha para todos: senha123):');
  console.log('  - contato@recifemar.com.br (ativo)');
  console.log('  - contato@buggytourporto.com.br (degustacao)');
  console.log('  - contato@sabordomar.com.br (expirado)');
  console.log('  - contato@pousadamarazul.com.br (ativo, fotos reais)');
}

seed();
