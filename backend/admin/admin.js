// Painel administrativo simples (login + CRUD categorias + moderacao de anuncios)
(function () {
  const API = window.location.origin; // mesmo host do backend (Railway / localhost:3000)
  const TOKEN_KEY = 'portal_admin_token';

  const telaLogin = document.getElementById('telaLogin');
  const telaAdmin = document.getElementById('telaAdmin');
  const formLogin = document.getElementById('formLogin');
  const erroLogin = document.getElementById('erroLogin');
  const btnSair = document.getElementById('btnSair');

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function limparToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function apiFetch(path, options = {}) {
    const resp = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (resp.status === 401 || resp.status === 403) {
      limparToken();
      mostrarLogin();
      throw new Error('Sessao expirada. Faca login novamente.');
    }
    return resp.json();
  }

  function mostrarLogin() {
    telaLogin.classList.remove('escondido');
    telaAdmin.classList.add('escondido');
  }

  function mostrarAdmin() {
    telaLogin.classList.add('escondido');
    telaAdmin.classList.remove('escondido');
    carregarPendentes();
    carregarTodos();
    carregarCategorias();
  }

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroLogin.textContent = '';
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    try {
      const resp = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        erroLogin.textContent = data.erro || 'Credenciais invalidas.';
        return;
      }
      setToken(data.token);
      mostrarAdmin();
    } catch (err) {
      erroLogin.textContent = 'Erro ao conectar com o servidor.';
      console.error(err);
    }
  });

  btnSair.addEventListener('click', () => {
    limparToken();
    mostrarLogin();
  });

  // ===== Tabs =====
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('ativa'));
      btn.classList.add('ativa');
      document.querySelectorAll('main section').forEach((s) => s.classList.add('escondido'));
      document.getElementById(`tab${capitalize(btn.dataset.tab)}`).classList.remove('escondido');
    });
  });

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ===== Anuncios pendentes =====
  async function carregarPendentes() {
    try {
      const pendentes = await apiFetch('/api/admin/anuncios');
      const tbody = document.getElementById('listaPendentes');
      tbody.innerHTML = pendentes
        .map(
          (a) => `
        <tr>
          <td>${a.id}</td>
          <td>${a.titulo}</td>
          <td>${a.id_comerciante}</td>
          <td><span class="badge badge--${a.status}">${a.status}</span></td>
          <td>
            <button class="btn btn--aprovar" data-acao="aprovar" data-id="${a.id}">Aprovar</button>
            <button class="btn btn--rejeitar" data-acao="rejeitar" data-id="${a.id}">Rejeitar</button>
          </td>
        </tr>`
        )
        .join('') || '<tr><td colspan="5">Nenhum anuncio pendente.</td></tr>';

      tbody.querySelectorAll('button[data-acao]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const { acao, id } = btn.dataset;
          await apiFetch(`/api/admin/anuncios/${id}/${acao}`, { method: 'PUT' });
          carregarPendentes();
          carregarTodos();
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ===== Todos os anuncios =====
  async function carregarTodos() {
    try {
      const todos = await apiFetch('/api/admin/anuncios/todos');
      const tbody = document.getElementById('listaTodos');
      tbody.innerHTML = todos
        .map(
          (a) => `
        <tr>
          <td>${a.id}</td>
          <td>${a.titulo}</td>
          <td><span class="badge badge--${a.status}">${a.status}</span></td>
          <td>${a.latitude ?? '-'}, ${a.longitude ?? '-'}</td>
          <td>
            <button class="btn btn--excluir" data-id="${a.id}">Excluir</button>
          </td>
        </tr>`
        )
        .join('') || '<tr><td colspan="5">Nenhum anuncio cadastrado.</td></tr>';

      tbody.querySelectorAll('button.btn--excluir').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir este anuncio?')) return;
          await apiFetch(`/api/admin/anuncios/${btn.dataset.id}`, { method: 'DELETE' });
          carregarTodos();
          carregarPendentes();
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ===== Categorias =====
  async function carregarCategorias() {
    try {
      const categorias = await apiFetch('/api/admin/categorias');
      const tbody = document.getElementById('listaCategorias');
      tbody.innerHTML = categorias
        .map(
          (c) => `
        <tr>
          <td>${c.id}</td>
          <td>${c.nome}</td>
          <td>${c.icone_url || '-'}</td>
          <td>${c.slug}</td>
          <td><button class="btn btn--excluir" data-id="${c.id}">Excluir</button></td>
        </tr>`
        )
        .join('') || '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

      tbody.querySelectorAll('button.btn--excluir').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir esta categoria?')) return;
          await apiFetch(`/api/admin/categorias/${btn.dataset.id}`, { method: 'DELETE' });
          carregarCategorias();
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('btnAddCategoria').addEventListener('click', async () => {
    const nome = document.getElementById('novaCategoriaNome').value.trim();
    const icone_url = document.getElementById('novaCategoriaIcone').value.trim();
    if (!nome) return;
    try {
      await apiFetch('/api/admin/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, icone_url }),
      });
      document.getElementById('novaCategoriaNome').value = '';
      document.getElementById('novaCategoriaIcone').value = '';
      carregarCategorias();
    } catch (err) {
      console.error(err);
    }
  });

  // ===== Inicializacao =====
  if (getToken()) {
    mostrarAdmin();
  } else {
    mostrarLogin();
  }
})();
