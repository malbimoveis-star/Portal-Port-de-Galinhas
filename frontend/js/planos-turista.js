(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

  async function init() {
    const resp = await fetch(`${API}/api/pagamentos/planos`);
    const planos = await resp.json();
    const plano = planos.find((p) => p.id === 'turista');
    const grid = document.getElementById('planoTuristaGrid');

    if (!plano) return;

    grid.innerHTML = `
      <div class="plano-card">
        <h3 data-i18n="planos.turista">${plano.nome}</h3>
        <div class="preco">R$ ${plano.valor.toFixed(2)}<small style="font-size:0.9rem;" data-i18n="planos.mes">/mes</small></div>
        <p>${plano.descricao}</p>
        <button class="btn btn--verde" id="btnAssinarTurista" style="width:100%;">Assinar</button>
      </div>
    `;

    document.getElementById('btnAssinarTurista').addEventListener('click', async () => {
      const respCheckout = await fetch(`${API}/api/pagamentos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_plano: 'turista' }),
      });
      const data = await respCheckout.json();
      if (data.simulado) {
        alert('MP_ACCESS_TOKEN nao configurado. Simulando checkout de teste.');
      }
      window.location.href = data.init_point;
    });

    if (window.i18nPortal) window.i18nPortal.init();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
