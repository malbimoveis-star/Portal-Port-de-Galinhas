(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

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

  document.addEventListener('DOMContentLoaded', () => {
    initToggleSenha();

    const form = document.getElementById('formRedefinirSenha');
    if (!form) return;

    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const erroEl = document.getElementById('mensagemErro');
    const sucessoEl = document.getElementById('mensagemSucesso');

    if (!token) {
      erroEl.textContent = 'Link invalido: token de redefinicao ausente.';
      erroEl.style.display = 'block';
      form.style.display = 'none';
      return;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erroEl.style.display = 'none';
      sucessoEl.style.display = 'none';

      const senha = document.getElementById('campoSenha').value;
      const senhaConfirma = document.getElementById('campoSenhaConfirma').value;

      if (senha !== senhaConfirma) {
        erroEl.textContent = 'As senhas nao coincidem.';
        erroEl.style.display = 'block';
        return;
      }

      try {
        const resp = await fetch(`${API}/api/comerciantes/redefinir-senha`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, novaSenha: senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          erroEl.textContent = data.erro || 'Nao foi possivel redefinir a senha.';
          erroEl.style.display = 'block';
          return;
        }
        sucessoEl.textContent = data.mensagem || 'Senha redefinida com sucesso.';
        sucessoEl.style.display = 'block';
        form.style.display = 'none';
      } catch (err) {
        erroEl.textContent = 'Nao foi possivel conectar ao servidor.';
        erroEl.style.display = 'block';
        console.error(err);
      }
    });
  });
})();
