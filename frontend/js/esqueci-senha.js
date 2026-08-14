(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formEsqueciSenha');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('campoEmail').value.trim();
      const erroEl = document.getElementById('mensagemErro');
      const sucessoEl = document.getElementById('mensagemSucesso');
      erroEl.style.display = 'none';
      sucessoEl.style.display = 'none';

      try {
        const resp = await fetch(`${API}/api/comerciantes/esqueci-senha`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          erroEl.textContent = data.erro || 'Nao foi possivel processar o pedido.';
          erroEl.style.display = 'block';
          return;
        }
        sucessoEl.textContent = data.mensagem || 'Se este e-mail estiver cadastrado, voce recebera um link em instantes.';
        sucessoEl.style.display = 'block';
        form.reset();
      } catch (err) {
        erroEl.textContent = 'Nao foi possivel conectar ao servidor.';
        erroEl.style.display = 'block';
        console.error(err);
      }
    });
  });
})();
