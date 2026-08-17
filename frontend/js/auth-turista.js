(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const CHAVE_TOKEN = 'portal_pg_turista_token';
  const CHAVE_TURISTA = 'portal_pg_turista';

  function mostrarErro(mensagem) {
    const el = document.getElementById('mensagemErro');
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = 'block';
  }

  function salvarSessao(token, turista) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_TURISTA, JSON.stringify(turista));
  }

  function getToken() {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  function getTuristaLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_TURISTA) || 'null');
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_TURISTA);
  }

  function initToggleSenha() {
    document.querySelectorAll('.btn-toggle-senha').forEach((btn) => {
      btn.addEventListener('click', () => {
        const alvo = document.getElementById(btn.dataset.alvo);
        if (!alvo) return;
        const oculto = alvo.type === 'password';
        alvo.type = oculto ? 'text' : 'password';
        btn.setAttribute('aria-label', oculto ? 'Ocultar senha' : 'Mostrar senha');
      });
    });
  }

  // Depois de logar/cadastrar, se veio de um redirect de fanpage (parametro
  // "retorno" na URL), volta pra tela de assinatura pra concluir o pagamento
  // em vez de simplesmente ir pra tela padrao.
  function proximaUrl() {
    const params = new URLSearchParams(window.location.search);
    const retorno = params.get('retorno');
    return retorno ? `planos-turista.html?retorno=${encodeURIComponent(retorno)}` : 'planos-turista.html';
  }

  function initCadastro() {
    const form = document.getElementById('formCadastro');
    if (!form) return;
    initToggleSenha();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('campoNome').value.trim();
      const email = document.getElementById('campoEmail').value.trim();
      const senha = document.getElementById('campoSenha').value;

      try {
        const resp = await fetch(`${API}/api/turistas/cadastro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          mostrarErro(data.erro || 'Erro ao cadastrar.');
          return;
        }
        salvarSessao(data.token, data.turista);
        window.location.href = proximaUrl();
      } catch (err) {
        mostrarErro('Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.');
        console.error(err);
      }
    });
  }

  function initLogin() {
    const form = document.getElementById('formLogin');
    if (!form) return;
    initToggleSenha();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('campoEmail').value.trim();
      const senha = document.getElementById('campoSenha').value;

      try {
        const resp = await fetch(`${API}/api/turistas/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          mostrarErro(data.erro || 'Credenciais invalidas.');
          return;
        }
        salvarSessao(data.token, data.turista);
        window.location.href = proximaUrl();
      } catch (err) {
        mostrarErro('Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.');
        console.error(err);
      }
    });
  }

  window.authTurista = { initCadastro, initLogin, getToken, getTuristaLocal, logout, salvarSessao, initToggleSenha, proximaUrl };
})();
