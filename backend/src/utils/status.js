'use strict';

const db = require('../db/connection');
const { DIAS_DEGUSTACAO } = require('./planos');

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÃO
|--------------------------------------------------------------------------
|
| O período padrão de degustação continua sendo definido em:
|
| backend/src/utils/planos.js
|
| Exemplo:
|
| DIAS_DEGUSTACAO = 5
|
| O administrador poderá posteriormente conceder um prazo personalizado
| para cada comerciante através da coluna:
|
| data_expiracao
|
| A regra será:
|
| 1. Comerciante em degustação:
|    - usa data_expiracao se ela existir;
|    - caso contrário, usa os 5 dias padrão.
|
| 2. Comerciante ativo:
|    - usa data_expiracao.
|
| 3. Comerciante expirado:
|    - não fica visível publicamente.
|
|--------------------------------------------------------------------------
*/


// =========================================================
// AUXILIAR - CONVERTER DATA
// =========================================================

function converterData(data) {
  if (!data) {
    return null;
  }

  const resultado = new Date(data);

  if (Number.isNaN(resultado.getTime())) {
    return null;
  }

  return resultado;
}


// =========================================================
// OBTER DATA DE EXPIRAÇÃO DA DEGUSTAÇÃO
// =========================================================
//
// Se o administrador definiu uma data_expiracao,
// ela terá prioridade.
//
// Caso contrário,
// calcula automaticamente:
//
// data_inicio_degustacao + DIAS_DEGUSTACAO
//
// Isso permite:
//
// - degustação padrão de 5 dias;
// - prorrogação manual pelo administrador;
// - prazo personalizado.
//
// =========================================================

function obterDataExpiracao(comerciante) {
  if (!comerciante) {
    return null;
  }

  // -------------------------------------------------------
  // PRAZO PERSONALIZADO DEFINIDO PELO ADMIN
  // -------------------------------------------------------

  if (comerciante.data_expiracao) {
    const expiracaoPersonalizada =
      converterData(
        comerciante.data_expiracao
      );

    if (expiracaoPersonalizada) {
      return expiracaoPersonalizada;
    }
  }

  // -------------------------------------------------------
  // PRAZO PADRÃO DA DEGUSTAÇÃO
  // -------------------------------------------------------

  if (
    comerciante.status === 'degustacao' &&
    comerciante.data_inicio_degustacao
  ) {

    const inicio =
      converterData(
        comerciante.data_inicio_degustacao
      );

    if (!inicio) {
      return null;
    }

    return new Date(
      inicio.getTime() +
      DIAS_DEGUSTACAO *
      24 *
      60 *
      60 *
      1000
    );
  }

  return null;
}


// =========================================================
// VERIFICAR E ATUALIZAR STATUS
// =========================================================
//
// Regras:
//
// DEGUSTAÇÃO
// -----------
// Enquanto estiver dentro do prazo:
//
// status = degustacao
//
// Quando o prazo acabar:
//
// status = expirado
//
//
// ATIVO
// -----
// Enquanto data_expiracao não tiver passado:
//
// status = ativo
//
// Depois da expiração:
//
// status = expirado
//
//
// IMPORTANTE
// ----------
// A função NÃO altera automaticamente um comerciante
// expirado para ativo.
//
// A ativação será feita através do pagamento aprovado
// ou através do painel administrativo.
//
// NOTA (migração Postgres): esta função faz um UPDATE no banco quando o
// status muda, entao virou assíncrona (`async function` + `await db.run`).
// Todo lugar que a chamava precisou ganhar `await`.
//
// =========================================================

async function verificarEAtualizarStatus(comerciante) {

  if (!comerciante) {
    return comerciante;
  }

  const agora =
    new Date();

  let novoStatus =
    comerciante.status;

  const dataExpiracao =
    obterDataExpiracao(
      comerciante
    );


  // =======================================================
  // DEGUSTAÇÃO
  // =======================================================

  if (
    comerciante.status === 'degustacao'
  ) {

    // -----------------------------------------------------
    // Sem data de expiração válida
    // -----------------------------------------------------

    if (!dataExpiracao) {

      console.warn(
        '[STATUS] Comerciante em degustação sem data de expiração:',
        comerciante.id
      );

      return comerciante;
    }


    // -----------------------------------------------------
    // DEGUSTAÇÃO EXPIRADA
    // -----------------------------------------------------

    if (
      agora.getTime() >
      dataExpiracao.getTime()
    ) {

      novoStatus =
        'expirado';
    }
  }


  // =======================================================
  // COMERCIANTE ATIVO
  // =======================================================

  else if (
    comerciante.status === 'ativo'
  ) {

    // -----------------------------------------------------
    // Se possui data de expiração
    // -----------------------------------------------------

    if (
      dataExpiracao &&
      agora.getTime() >
      dataExpiracao.getTime()
    ) {

      novoStatus =
        'expirado';
    }
  }


  // =======================================================
  // ATUALIZAR BANCO
  // =======================================================

  if (
    novoStatus !==
    comerciante.status
  ) {

    await db.run(`
      UPDATE comerciantes
      SET status = ?
      WHERE id = ?
    `, [

      novoStatus,

      comerciante.id
    ]);

    comerciante.status =
      novoStatus;
  }


  return comerciante;
}


// =========================================================
// CALCULAR TEMPO RESTANTE DA DEGUSTAÇÃO
// =========================================================
//
// Retorna:
//
// {
//   expirado: false,
//   diasRestantes: 4,
//   horasRestantes: 12,
//   msRestantes: ...,
//   dataLimite: "..."
// }
//
// O cálculo considera:
//
// 1. data_expiracao personalizada do admin;
// 2. caso não exista,
//    calcula o prazo padrão da degustação.
//
// NOTA: esta função não acessa o banco (só le campos do objeto
// `comerciante` já carregado), entao continua síncrona.
//
// =========================================================

function calcularTempoRestanteDegustacao(
  comerciante
) {

  if (
    !comerciante
  ) {

    return null;
  }


  if (
    comerciante.status !==
    'degustacao'
  ) {

    return null;
  }


  const limite =
    obterDataExpiracao(
      comerciante
    );


  if (
    !limite
  ) {

    return {
      expirado: true,

      diasRestantes: 0,

      horasRestantes: 0,

      msRestantes: 0,

      dataLimite: null,

      erro:
        'Não foi possível calcular a data de expiração.'
    };
  }


  const agora =
    new Date();


  const diffMs =
    limite.getTime() -
    agora.getTime();


  // =======================================================
  // JÁ EXPIROU
  // =======================================================

  if (
    diffMs <= 0
  ) {

    return {

      expirado: true,

      diasRestantes: 0,

      horasRestantes: 0,

      msRestantes: 0,

      dataLimite:
        limite.toISOString()
    };
  }


  // =======================================================
  // DIAS RESTANTES
  // =======================================================

  const diasRestantes =
    Math.floor(
      diffMs /
      (
        24 *
        60 *
        60 *
        1000
      )
    );


  // =======================================================
  // HORAS RESTANTES
  // =======================================================

  const horasRestantes =
    Math.floor(
      (
        diffMs %
        (
          24 *
          60 *
          60 *
          1000
        )
      ) /
      (
        60 *
        60 *
        1000
      )
    );


  return {

    expirado: false,

    diasRestantes,

    horasRestantes,

    msRestantes:
      diffMs,

    dataLimite:
      limite.toISOString()
  };
}


// =========================================================
// VISIBILIDADE PÚBLICA DO COMERCIANTE
// =========================================================
//
// Um comerciante pode aparecer publicamente quando:
//
// - está em degustação válida;
// - está com plano ativo e dentro do prazo.
//
// Comerciante expirado:
//
// - não aparece publicamente;
// - seus anúncios também não aparecem publicamente.
//
// NOTA (migração Postgres): chama verificarEAtualizarStatus, que agora e
// assíncrona, entao esta função também virou async/await. Todo lugar que
// a chamava (inclusive dentro de .filter()) precisou ser ajustado.
//
// =========================================================

async function comercianteVisivelPublicamente(
  comerciante
) {

  if (
    !comerciante
  ) {

    return false;
  }


  // -------------------------------------------------------
  // ATUALIZA STATUS ANTES DE VERIFICAR
  // -------------------------------------------------------

  await verificarEAtualizarStatus(
    comerciante
  );


  // -------------------------------------------------------
  // DEGUSTAÇÃO VÁLIDA
  // -------------------------------------------------------

  if (
    comerciante.status ===
    'degustacao'
  ) {

    return true;
  }


  // -------------------------------------------------------
  // PLANO ATIVO
  // -------------------------------------------------------

  if (
    comerciante.status ===
    'ativo'
  ) {

    return true;
  }


  // -------------------------------------------------------
  // EXPIRADO OU OUTRO STATUS
  // -------------------------------------------------------

  return false;
}


// =========================================================
// CONCEDER PRAZO PERSONALIZADO
// =========================================================
//
// Esta função será usada pelo painel administrativo.
//
// Exemplo:
//
// concederPrazo(comercianteId, '2026-08-30T23:59:59.000Z')
//
// O administrador poderá:
//
// - aumentar o prazo de degustação;
// - prorrogar um comerciante expirado;
// - definir uma data específica para expiração.
//
// Por segurança,
// esta função não ativa automaticamente o comerciante.
//
// O admin poderá escolher:
//
// status = degustacao
//
// ou:
//
// status = ativo
//
// separadamente.
//
// =========================================================

async function concederPrazo(
  comercianteId,
  dataExpiracao
) {

  if (
    !comercianteId
  ) {

    throw new Error(
      'ID do comerciante é obrigatório.'
    );
  }


  const expiracao =
    converterData(
      dataExpiracao
    );


  if (
    !expiracao
  ) {

    throw new Error(
      'Data de expiração inválida.'
    );
  }


  const comerciante =
    await db.get(`
      SELECT *
      FROM comerciantes
      WHERE id = ?
    `, [
      comercianteId
    ]);


  if (
    !comerciante
  ) {

    throw new Error(
      'Comerciante não encontrado.'
    );
  }


  await db.run(`
    UPDATE comerciantes
    SET data_expiracao = ?
    WHERE id = ?
  `, [

    expiracao.toISOString(),

    comercianteId
  ]);


  return db.get(`
    SELECT *
    FROM comerciantes
    WHERE id = ?
  `, [
    comercianteId
  ]);
}


// =========================================================
// REMOVER PRAZO PERSONALIZADO
// =========================================================
//
// Ao remover data_expiracao:
//
// - se estiver em degustação,
//   volta a usar os 5 dias padrão;
//
// - se estiver ativo,
//   ficará sem prazo personalizado.
//
// Esta função será útil caso o administrador queira
// voltar à regra padrão.
//
// =========================================================

async function removerPrazoPersonalizado(
  comercianteId
) {

  if (
    !comercianteId
  ) {

    throw new Error(
      'ID do comerciante é obrigatório.'
    );
  }


  const comerciante =
    await db.get(`
      SELECT *
      FROM comerciantes
      WHERE id = ?
    `, [
      comercianteId
    ]);


  if (
    !comerciante
  ) {

    throw new Error(
      'Comerciante não encontrado.'
    );
  }


  await db.run(`
    UPDATE comerciantes
    SET data_expiracao = NULL
    WHERE id = ?
  `, [
    comercianteId
  ]);


  return db.get(`
    SELECT *
    FROM comerciantes
    WHERE id = ?
  `, [
    comercianteId
  ]);
}


// =========================================================
// EXPORTAR
// =========================================================

module.exports = {

  verificarEAtualizarStatus,

  calcularTempoRestanteDegustacao,

  comercianteVisivelPublicamente,

  obterDataExpiracao,

  concederPrazo,

  removerPrazoPersonalizado

};
