'use strict';

const db = require('../db/connection');
const { DIAS_DEGUSTACAO } = require('./planos');

/**
 * Verifica e atualiza o status de um comerciante com base nas datas.
 * Regra:
 * - Se status == 'degustacao' e passaram mais de DIAS_DEGUSTACAO dias desde
 *   data_inicio_degustacao sem pagamento aprovado -> status vira 'expirado'.
 * - Se status == 'ativo' e existe data_expiracao no passado -> status vira 'expirado'.
 * Retorna o registro do comerciante ja atualizado.
 */
function verificarEAtualizarStatus(comerciante) {
  if (!comerciante) return comerciante;

  const agora = new Date();
  let novoStatus = comerciante.status;

  if (comerciante.status === 'degustacao') {
    const inicio = new Date(comerciante.data_inicio_degustacao);
    const limite = new Date(inicio.getTime() + DIAS_DEGUSTACAO * 24 * 60 * 60 * 1000);
    if (agora > limite) {
      novoStatus = 'expirado';
    }
  } else if (comerciante.status === 'ativo' && comerciante.data_expiracao) {
    const expiracao = new Date(comerciante.data_expiracao);
    if (agora > expiracao) {
      novoStatus = 'expirado';
    }
  }

  if (novoStatus !== comerciante.status) {
    db.prepare('UPDATE comerciantes SET status = ? WHERE id = ?').run(novoStatus, comerciante.id);
    comerciante.status = novoStatus;
  }

  return comerciante;
}

/** Retorna quantos dias/horas restam de degustacao (0 se ja expirou). */
function calcularTempoRestanteDegustacao(comerciante) {
  if (comerciante.status !== 'degustacao') return null;
  const inicio = new Date(comerciante.data_inicio_degustacao);
  const limite = new Date(inicio.getTime() + DIAS_DEGUSTACAO * 24 * 60 * 60 * 1000);
  const agora = new Date();
  const diffMs = limite.getTime() - agora.getTime();
  if (diffMs <= 0) {
    return { expirado: true, diasRestantes: 0, horasRestantes: 0, msRestantes: 0, dataLimite: limite.toISOString() };
  }
  const diasRestantes = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const horasRestantes = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return { expirado: false, diasRestantes, horasRestantes, msRestantes: diffMs, dataLimite: limite.toISOString() };
}

/** Um anuncio so pode aparecer publicamente se o comerciante estiver ativo ou em degustacao valida. */
function comercianteVisivelPublicamente(comerciante) {
  verificarEAtualizarStatus(comerciante);
  return comerciante.status === 'ativo' || comerciante.status === 'degustacao';
}

module.exports = {
  verificarEAtualizarStatus,
  calcularTempoRestanteDegustacao,
  comercianteVisivelPublicamente,
};
