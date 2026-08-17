'use strict';

const db = require('../db/connection');

// Assinatura de turista nao tem degustacao: fica ativa por 30 dias a
// partir da aprovacao do pagamento (ver ativarTurista em routes/pagamentos.js).
function turistaAtivo(idTurista) {
  if (!idTurista) return false;
  const turista = db.prepare('SELECT * FROM turistas WHERE id = ?').get(idTurista);
  if (!turista) return false;
  if (turista.status !== 'ativo') return false;
  if (!turista.data_expiracao) return false;
  return new Date(turista.data_expiracao).getTime() > Date.now();
}

module.exports = { turistaAtivo };
