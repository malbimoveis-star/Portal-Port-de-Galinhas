'use strict';

const PLANOS = {
  turista: {
    id: 'turista',
    nome: 'Turista',
    valor: 9.9,
    descricao: 'Acesso a mapa offline, cupons e promocoes exclusivas.',
  },
  comerciante_basico: {
    id: 'comerciante_basico',
    nome: 'Comerciante Basico',
    valor: 49.9,
    descricao: 'Cadastro simples do seu negocio no portal.',
  },
  comerciante_premium: {
    id: 'comerciante_premium',
    nome: 'Comerciante Premium',
    valor: 99.9,
    descricao: 'Destaque na home e beneficios extras de visibilidade.',
  },
};

const DIAS_DEGUSTACAO = Number(process.env.DIAS_DEGUSTACAO || 5);

module.exports = { PLANOS, DIAS_DEGUSTACAO };
