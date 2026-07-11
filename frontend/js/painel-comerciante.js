(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const auth = window.authComerciante;

  const STATUS_LABEL = { ativo: 'Ativo', degustacao: 'Degustacao', expirado: 'Expirado' };
  const PLANO_LABEL = { gratuito: 'Gratuito', basico: 'Basico', premium: 'Premium' };

  function headersAuth() {
    return { Authorization: `Bearer ${auth.getToken()}` };
  }

  async function carregarPainel() {
    const resp = await fetch(`${API}/api/comerciantes/me`, { headers: headersAuth() });
    if (resp.status === 401) {
      window.location.href = 'login-comerciante.html';
      return null;
    }
    return resp.json();
  }

  function renderStats(data) {
    document.getElementById('statPlano').textContent = PLANO_LABEL[data.comerciante.plano] || data.comerciante.plano;
    document.getElementById('statStatus').textContent = STATUS_LABEL[data.comerciante.status] || data.comerciante.status;

    const alertaExpirado = document.getElementById('alertaExpirado');
    const degustacaoWrapper = document.getElementById('statDegustacaoWrapper');

    if (data.comerciante.status === 'expirado') {
      alertaExpirado.style.display = 'block';
    } else {
      alertaExpirado.style.display = 'none';
    }

    if (data.comerciante.status === 'degustacao' && data.degustacao) {
      degustacaoWrapper.style.display = 'block';
      document.getElementById('statDegustacao').textContent = `${data.degustacao.diasRestantes}d ${data.degustacao.horasRestantes}h`;
    } else {
      degustacaoWrapper.style.display = 'none';
    }
  }

  async function carregarCategorias() {
    const select = document.getElementById('campoCategoria');
    const resp = await fetch(`${API}/api/categorias`);
    const categorias = await resp.json();
    select.innerHTML = categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
  }

  async function carregarMeusAnuncios() {
    const resp = await fetch(`${API}/api/anuncios/meus/lista`, { headers: headersAuth() });
    const anuncios = await resp.json();
    const lista = document.getElementById('listaMeusAnuncios');

    if (anuncios.length === 0) {
      lista.innerHTML = '<p>Voce ainda nao possui anuncios cadastrados.</p>';
      return;
    }

    lista.innerHTML = anuncios
      .map(
        (a) => `
      <div class="anuncio-card">
        <h3>${a.titulo}</h3>
        <p>${a.descricao || ''}</p>
        <div class="anuncio-card__tags">${a.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="btn btn--laranja" data-editar="${a.id}" data-i18n="painel.editar">Editar</button>
          <button class="btn btn--vermelho" data-excluir="${a.id}" data-i18n="painel.excluir">Excluir</button>
        </div>
      </div>`
      )
      .join('');

    lista.querySelectorAll('[data-editar]').forEach((btn) => {
      btn.addEventListener('click', () => iniciarEdicao(anuncios.find((a) => a.id == btn.dataset.editar)));
    });
    lista.querySelectorAll('[data-excluir]').forEach((btn) => {
      btn.addEventListener('click', () => excluirAnuncio(btn.dataset.excluir));
    });
  }

  function iniciarEdicao(anuncio) {
    document.getElementById('anuncioId').value = anuncio.id;
    document.getElementById('campoTitulo').value = anuncio.titulo;
    document.getElementById('campoDescricao').value = anuncio.descricao || '';
    document.getElementById('campoCategoria').value = anuncio.categoria_id || '';
    document.getElementById('campoTags').value = (anuncio.tags || []).join(', ');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluirAnuncio(id) {
    if (!confirm('Deseja realmente excluir este anuncio?')) return;
    await fetch(`${API}/api/anuncios/${id}`, { method: 'DELETE', headers: headersAuth() });
    carregarMeusAnuncios();
  }

  function initFormAnuncio() {
    const form = document.getElementById('formAnuncio');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('anuncioId').value;
      const formData = new FormData();
      formData.append('titulo', document.getElementById('campoTitulo').value);
      formData.append('descricao', document.getElementById('campoDescricao').value);
      formData.append('categoria_id', document.getElementById('campoCategoria').value);
      formData.append('tags', document.getElementById('campoTags').value);

      const fotosInput = document.getElementById('campoFotos');
      Array.from(fotosInput.files).forEach((file) => formData.append('fotos', file));

      const url = id ? `${API}/api/anuncios/${id}` : `${API}/api/anuncios`;
      const method = id ? 'PUT' : 'POST';

      await fetch(url, { method, headers: headersAuth(), body: formData });

      form.reset();
      document.getElementById('anuncioId').value = '';
      carregarMeusAnuncios();
    });

    document.getElementById('btnCancelarEdicao').addEventListener('click', () => {
      form.reset();
      document.getElementById('anuncioId').value = '';
    });
  }

  function initTabs() {
    document.querySelectorAll('.tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        const tab = btn.dataset.tab;
        document.getElementById('tabAnuncios').style.display = tab === 'anuncios' ? 'block' : 'none';
        document.getElementById('tabPlanos').style.display = tab === 'planos' ? 'block' : 'none';
      });
    });
  }

  async function carregarPlanos(idComerciante) {
    const resp = await fetch(`${API}/api/pagamentos/planos`);
    const planos = await resp.json();
    const grid = document.getElementById('planosGrid');

    grid.innerHTML = planos
      .filter((p) => p.id !== 'turista')
      .map(
        (p) => `
      <div class="plano-card">
        <h3>${p.nome}</h3>
        <div class="preco">R$ ${p.valor.toFixed(2)}<small style="font-size:0.9rem;" data-i18n="planos.mes">/mes</small></div>
        <p>${p.descricao}</p>
        <button class="btn btn--verde" data-plano="${p.id}" style="width:100%;">Assinar</button>
      </div>`
      )
      .join('');

    grid.querySelectorAll('[data-plano]').forEach((btn) => {
      btn.addEventListener('click', () => iniciarCheckout(btn.dataset.plano, idComerciante));
    });
  }

  async function iniciarCheckout(tipoPlano, idComerciante) {
    const resp = await fetch(`${API}/api/pagamentos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_plano: tipoPlano, id_comerciante: idComerciante }),
    });
    const data = await resp.json();

    if (data.simulado) {
      // Ambiente sem credenciais reais de Mercado Pago: simula aprovacao automatica para fins de teste local
      alert('MP_ACCESS_TOKEN nao configurado. Simulando checkout de teste.');
      window.location.href = data.init_point;
      return;
    }

    window.location.href = data.init_point;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.getToken()) {
      window.location.href = 'login-comerciante.html';
      return;
    }

    document.getElementById('btnSair').addEventListener('click', () => {
      auth.logout();
      window.location.href = '../index.html';
    });

    const data = await carregarPainel();
    if (!data) return;

    renderStats(data);
    await carregarCategorias();
    await carregarMeusAnuncios();
    initFormAnuncio();
    initTabs();
    await carregarPlanos(data.comerciante.id);

    if (window.i18nPortal) window.i18nPortal.init();
  });
})();
