'use strict';

const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { autenticarAdmin } = require('../middleware/authAdmin');
const { PLANOS, DIAS_DEGUSTACAO } = require('../utils/planos');

const router = express.Router();

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

function getClient() {
  return new MercadoPagoConfig({ accessToken: ACCESS_TOKEN, options: { timeout: 5000 } });
}

// GET /api/pagamentos/planos - lista planos disponiveis (transparencia de valores)
router.get('/planos', (req, res) => {
  res.json(Object.values(PLANOS));
});

// POST /api/pagamentos/checkout - cria preferencia de pagamento (Checkout Pro)
// body: { tipo_plano: 'turista' | 'comerciante_basico' | 'comerciante_premium', id_comerciante? }
router.post('/checkout', async (req, res) => {
  const { tipo_plano, id_comerciante, id_turista, email_pagador } = req.body;
  const plano = PLANOS[tipo_plano];

  if (!plano) {
    return res.status(400).json({ erro: 'Plano invalido. Use turista, comerciante_basico ou comerciante_premium.' });
  }

  if (!ACCESS_TOKEN || ACCESS_TOKEN.startsWith('TEST-0000000000000000')) {
    const pagamentoSimulado = await db.run(
      `INSERT INTO pagamentos (id_comerciante, id_turista, tipo_plano, valor, status, mp_preference_id)
       VALUES (?, ?, ?, ?, 'pendente', ?)`,
      [id_comerciante || null, id_turista || null, tipo_plano, plano.valor, 'SIMULADO-' + Date.now()]
    );

    return res.status(200).json({
      aviso: 'MP_ACCESS_TOKEN nao configurado com um token real de sandbox. Retornando checkout simulado.',
      simulado: true,
      pagamento_id: pagamentoSimulado.lastInsertRowid,
      init_point: `${FRONTEND_URL}/pages/pagamento-pendente.html?plano=${tipo_plano}&simulado=1&pagamento_id=${pagamentoSimulado.lastInsertRowid}`,
      preference_id: 'SIMULADO-' + Date.now(),
    });
  }

  try {
    const pagamentoInfo = await db.run(
      `INSERT INTO pagamentos (id_comerciante, id_turista, tipo_plano, valor, status)
       VALUES (?, ?, ?, ?, 'pendente')`,
      [id_comerciante || null, id_turista || null, tipo_plano, plano.valor]
    );

    const externalReference = String(pagamentoInfo.lastInsertRowid);

    const client = getClient();
    const preference = new Preference(client);

    const resultado = await preference.create({
      body: {
        items: [
          {
            title: `Portal Porto de Galinhas - Plano ${plano.nome}`,
            description: plano.descricao,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: plano.valor,
          },
        ],
        payer: email_pagador ? { email: email_pagador } : undefined,
        back_urls: {
          success: `${FRONTEND_URL}/pages/pagamento-sucesso.html`,
          pending: `${FRONTEND_URL}/pages/pagamento-pendente.html`,
          failure: `${FRONTEND_URL}/pages/pagamento-erro.html`,
        },
        auto_return: 'approved',
        external_reference: externalReference,
        notification_url: `${BACKEND_URL}/api/pagamentos/webhook`,
        // Checkout restrito a cartao de credito e Pix (vale para os 3 planos:
        // turista, comerciante_basico e comerciante_premium, pois todos
        // passam por esta mesma criacao de preferencia). Exclui boleto, cartao
        // de debito, pre-pago, moeda digital e voucher.
        // OBS: "account_money" (saldo em conta do Mercado Pago) NAO pode ser
        // excluido via excluded_payment_methods - a API do MP retorna erro
        // "account_money cannot be excluded" e o checkout inteiro quebrava
        // (erro 500). Por isso esse item foi removido da lista.
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'debit_card' },
            { id: 'prepaid_card' },
            { id: 'digital_currency' },
            { id: 'voucher_card' },
          ],
        },
      },
    });

    await db.run('UPDATE pagamentos SET mp_preference_id = ? WHERE id = ?', [
      resultado.id,
      pagamentoInfo.lastInsertRowid
    ]);

    res.json({
      simulado: false,
      preference_id: resultado.id,
      init_point: resultado.init_point,
      sandbox_init_point: resultado.sandbox_init_point,
    });
  } catch (err) {
    console.error('[mercadopago] erro ao criar preferencia:', err.message);
    res.status(500).json({ erro: 'Falha ao criar preferencia de pagamento.', detalhe: err.message });
  }
});

// POST /api/pagamentos/webhook - recebe notificacoes do Mercado Pago
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type;
    const paymentId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    console.log('[webhook] recebido:', { topic, paymentId, query: req.query, body: req.body });

    if (topic === 'payment' && paymentId && ACCESS_TOKEN && !ACCESS_TOKEN.startsWith('TEST-0000000000000000')) {
      const client = getClient();
      const paymentApi = new Payment(client);
      const pagamentoMP = await paymentApi.get({ id: paymentId });

      const externalReference = pagamentoMP.external_reference;
      const statusMP = pagamentoMP.status; // approved | pending | rejected

      const statusInterno = statusMP === 'approved' ? 'aprovado' : statusMP === 'rejected' ? 'rejeitado' : 'pendente';

      const pagamentoLocal = await db.get('SELECT * FROM pagamentos WHERE id = ?', [externalReference]);

      if (pagamentoLocal) {
        await db.run('UPDATE pagamentos SET status = ?, mp_payment_id = ? WHERE id = ?', [
          statusInterno,
          String(paymentId),
          pagamentoLocal.id
        ]);

        if (statusInterno === 'aprovado' && pagamentoLocal.id_comerciante) {
          await ativarComerciante(pagamentoLocal.id_comerciante, pagamentoLocal.tipo_plano);
        }

                                          if (statusInterno === 'aprovado' && pagamentoLocal.id_turista) {
                                                      await ativarTurista(pagamentoLocal.id_turista);
                                          }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[webhook] erro ao processar notificacao:', err.message);
    res.sendStatus(200); // sempre 200 para o MP nao ficar reenviando indefinidamente
  }
});

// POST /api/pagamentos/simular-aprovacao - endpoint auxiliar para TESTES locais sem depender do MP real
// body: { pagamento_id }
// Protegida com login de admin: antes estava aberta e qualquer pessoa conseguia
// aprovar pagamentos de graca e ativar plano premium sem pagar nada.
router.post('/simular-aprovacao', autenticarAdmin, async (req, res) => {
  const { pagamento_id } = req.body;
  const pagamento = await db.get('SELECT * FROM pagamentos WHERE id = ?', [pagamento_id]);
  if (!pagamento) return res.status(404).json({ erro: 'Pagamento nao encontrado.' });

  await db.run('UPDATE pagamentos SET status = ?, mp_payment_id = ? WHERE id = ?', [
    'aprovado',
    'SIMULADO-' + Date.now(),
    pagamento.id
  ]);

  if (pagamento.id_comerciante) {
    await ativarComerciante(pagamento.id_comerciante, pagamento.tipo_plano);
  }

    if (pagamento.id_turista) {
          await ativarTurista(pagamento.id_turista);
    }

  res.json({ sucesso: true, mensagem: 'Pagamento simulado como aprovado.' });
});

async function ativarComerciante(idComerciante, tipoPlano) {
  const planoDb = tipoPlano === 'turista' ? 'turista' : tipoPlano.replace('comerciante_', '');
  const agora = new Date();
  const expiracao = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias de assinatura

  await db.run('UPDATE comerciantes SET status = ?, plano = ?, data_expiracao = ? WHERE id = ?', [
    'ativo',
    planoDb,
    expiracao.toISOString(),
    idComerciante
  ]);
}

// Assinatura de turista: R$9,90/mes, libera acesso as fanpages dos
// comerciantes por 30 dias a partir da aprovacao do pagamento.
async function ativarTurista(idTurista) {
    const agora = new Date();
    const expiracao = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.run('UPDATE turistas SET status = ?, data_expiracao = ? WHERE id = ?', [
          'ativo',
          expiracao.toISOString(),
          idTurista
        ]);
}

// GET /api/pagamentos/comerciante/:id - historico de pagamentos de um comerciante (painel)
router.get('/comerciante/:id', autenticar, async (req, res) => {
  if (Number(req.params.id) !== Number(req.comerciante.id)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  const pagamentos = await db.all('SELECT * FROM pagamentos WHERE id_comerciante = ? ORDER BY data_pagamento DESC', [req.params.id]);
  res.json(pagamentos);
});

module.exports = router;
