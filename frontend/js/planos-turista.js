(function () {
  var API = window.APP_CONFIG.API_BASE_URL;

  function retornoAtual() {
    var params = new URLSearchParams(window.location.search);
    return params.get('retorno') || '';
  }

  async function init() {
    var resp = await fetch(API + '/api/pagamentos/planos');
    var planos = await resp.json();
    var plano = planos.find(function (p) { return p.id === 'turista'; });
    var grid = document.getElementById('planoTuristaGrid');

    if (!plano) return;

    var turista = window.authTurista ? window.authTurista.getTuristaLocal() : null;
    var token = window.authTurista ? window.authTurista.getToken() : null;
    var retorno = retornoAtual();
    var sufixoRetorno = retorno ? ('?retorno=' + encodeURIComponent(retorno)) : '';

    if (!turista || !token) {
      grid.innerHTML =
        '<div class="plano-card">' +
        '<h3 data-i18n="planos.turista">' + plano.nome + '</h3>' +
        '<div class="preco">R$ ' + plano.valor.toFixed(2) + '<small style="font-size:0.9rem;" data-i18n="planos.mes">/mes</small></div>' +
        '<p>' + plano.descricao + '</p>' +
        '<p style="color:#888;font-size:.88em;">Faca login ou cadastre-se para assinar o plano turista.</p>' +
        '<a class="btn btn--verde" style="width:100%;display:block;text-align:center;margin-bottom:8px;" href="login-turista.html' + sufixoRetorno + '">Entrar</a>' +
        '<a class="btn" style="width:100%;display:block;text-align:center;border:1px solid var(--verde);color:var(--verde);" href="cadastro-turista.html' + sufixoRetorno + '">Criar conta</a>' +
        '</div>';
      if (window.i18nPortal) window.i18nPortal.init();
      return;
    }

    grid.innerHTML =
      '<div class="plano-card">' +
      '<h3 data-i18n="planos.turista">' + plano.nome + '</h3>' +
      '<div class="preco">R$ ' + plano.valor.toFixed(2) + '<small style="font-size:0.9rem;" data-i18n="planos.mes">/mes</small></div>' +
      '<p>' + plano.descricao + '</p>' +
      '<p style="color:#888;font-size:.85em;">Logado como ' + (turista.nome || turista.email) + '</p>' +
      '<button class="btn btn--verde" id="btnAssinarTurista" style="width:100%;">Assinar</button>' +
      '</div>';

    document.getElementById('btnAssinarTurista').addEventListener('click', async function () {
      if (retorno) localStorage.setItem('portal_pg_retorno_fanpage', retorno);

      var respCheckout = await fetch(API + '/api/pagamentos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_plano: 'turista', id_turista: turista.id, email_pagador: turista.email }),
      });
      var data = await respCheckout.json();
      if (data.simulado) {
        alert('MP_ACCESS_TOKEN nao configurado. Simulando checkout de teste.');
      }
      window.location.href = data.init_point;
    });

    if (window.i18nPortal) window.i18nPortal.init();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
