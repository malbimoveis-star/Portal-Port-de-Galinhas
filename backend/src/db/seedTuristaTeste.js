'use strict';

// =========================================================
// CONTA DE TESTE PARA O DONO DO SITE NAVEGAR COMO TURISTA
// =========================================================
//
// Cria (ou reativa, se ja existir) uma conta de turista com assinatura
// sempre ativa, sem passar pelo fluxo de pagamento. Serve para o dono
// do projeto navegar como um turista assinante e testar o site, sem
// precisar pagar o checkout de verdade.
//
// E idempotente e roda a cada boot do servidor: se a conta ja existe e
// esta ativa, nao faz nada; se expirou, renova a data de expiracao.
// Nao mexe em nenhuma outra tabela.
//
// =========================================================

const bcrypt = require('bcryptjs');
const db = require('./connection');

const EMAIL_TURISTA_TESTE = process.env.TURISTA_TESTE_EMAIL || 'teste.turista@portalportodegalinhas.com.br';
const SENHA_TURISTA_TESTE = process.env.TURISTA_TESTE_SENHA || 'PortoTeste2026!';
const DIAS_VALIDADE = 365;

async function garantirTuristaTeste() {
  const existente = await db.get('SELECT * FROM turistas WHERE email = ?', [EMAIL_TURISTA_TESTE]);
  const expiracao = new Date(Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000).toISOString();

  if (!existente) {
    const senha_hash = await bcrypt.hash(SENHA_TURISTA_TESTE, 10);
    await db.run(
      `INSERT INTO turistas (nome, email, senha_hash, status, data_expiracao)
       VALUES (?, ?, ?, 'ativo', ?)`,
      ['Conta de Teste (dono do site)', EMAIL_TURISTA_TESTE, senha_hash, expiracao]
    );
    console.log('[seed] Conta de turista de teste criada:', EMAIL_TURISTA_TESTE);
    return;
  }

  const precisaRenovar = existente.status !== 'ativo' || !existente.data_expiracao || new Date(existente.data_expiracao).getTime() < Date.now();
  if (precisaRenovar) {
    await db.run('UPDATE turistas SET status = ?, data_expiracao = ? WHERE id = ?', ['ativo', expiracao, existente.id]);
    console.log('[seed] Conta de turista de teste renovada:', EMAIL_TURISTA_TESTE);
  }
}

module.exports = { garantirTuristaTeste };
