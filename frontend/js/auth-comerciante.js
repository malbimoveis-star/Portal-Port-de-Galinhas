(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const CHAVE_TOKEN = 'portal_pg_token';
  const CHAVE_COMERCIANTE = 'portal_pg_comerciante';

  function mostrarErro(mensagem) {
    const el = document.getElementById('mensagemErro');
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = 'block';
  }

  function salvarSessao(token, comerciante) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_COMERCIANTE, JSON.stringify(comerciante));
  }

  function getToken() {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  function getComercianteLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_COMERCIANTE) || 'null');
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_COMERCIANTE);
  }

  function initCadastro() {
    const form = document.getElementById('formCadastro');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('campoNome').value.trim();
      const email = document.getElementById('campoEmail').value.trim();
      const telefone = document.getElementById('campoTelefone').value.trim();
      const senha = document.getElementById('campoSenha').value;

      try {
        const resp = await fetch(`${API}/api/comerciantes/cadastro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, telefone, senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          mostrarErro(data.erro || 'Erro ao cadastrar.');
          return;
        }
        salvarSessao(data.token, data.comerciante);
        window.location.href = 'painel-comerciante.html';
      } catch (err) {
        mostrarErro('Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.');
        console.error(err);
      }
    });
  }

  function initLogin() {
    const form = document.getElementById('formLogin');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('campoEmail').value.trim();
      const senha = document.getElementById('campoSenha').value;

      try {
        const resp = await fetch(`${API}/api/comerciantes/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          mostrarErro(data.erro || 'Credenciais invalidas.');
          return;
        }
        salvarSessao(data.token, data.comerciante);
        window.location.href = 'painel-comerciante.html';
      } catch (err) {
        mostrarErro('Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.');
        console.error(err);
      }
    });
  }

  window.authComerciante = { initCadastro, initLogin, getToken, getComercianteLocal, logout, salvarSessao };
})();
