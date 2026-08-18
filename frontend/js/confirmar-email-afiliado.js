(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const CHAVE_TOKEN = 'portal_pg_afiliado_token';

  document.addEventListener('DOMContentLoaded', async () => {
    const el = document.getElementById('mensagemStatus');
    const acaoContinuar = document.getElementById('acaoContinuar');
    const acaoLogin = document.getElementById('acaoLogin');
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      el.textContent = 'Link invalido: token de confirmacao ausente.';
      acaoLogin.style.display = 'block';
      return;
    }

    try {
      const resp = await fetch(`${API}/api/afiliados/confirmar-email/${token}`);
      const data = await resp.json();
      if (!resp.ok) {
        el.textContent = data.erro || 'Nao foi possivel confirmar o e-mail.';
        acaoLogin.style.display = 'block';
        return;
      }
      el.textContent = data.mensagem || 'E-mail confirmado com sucesso!';
      // Se o cadastro foi feito neste mesmo navegador, ja temos a sessao
      // salva e podemos ir direto para completar o cadastro. Senao, manda
      // fazer login primeiro (o login ja redireciona pra ca de novo).
      if (localStorage.getItem(CHAVE_TOKEN)) {
        acaoContinuar.style.display = 'block';
      } else {
        acaoLogin.style.display = 'block';
      }
    } catch (err) {
      el.textContent = 'Nao foi possivel conectar ao servidor.';
      acaoLogin.style.display = 'block';
      console.error(err);
    }
  });
})();
