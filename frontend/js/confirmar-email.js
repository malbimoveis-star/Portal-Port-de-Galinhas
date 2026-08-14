(function () {
    const API = window.APP_CONFIG.API_BASE_URL;

   document.addEventListener('DOMContentLoaded', async () => {
         const el = document.getElementById('mensagemStatus');
         const params = new URLSearchParams(location.search);
         const token = params.get('token');

                                 if (!token) {
                                         el.textContent = 'Link invalido: token de confirmacao ausente.';
                                         return;
                                 }

                                 try {
                                         const resp = await fetch(`${API}/api/comerciantes/confirmar-email/${token}`);
                                         const data = await resp.json();
                                         if (!resp.ok) {
                                                   el.textContent = data.erro || 'Nao foi possivel confirmar o e-mail.';
                                                   return;
                                         }
                                         el.textContent = data.mensagem || 'E-mail confirmado com sucesso!';
                                 } catch (err) {
                                         el.textContent = 'Nao foi possivel conectar ao servidor.';
                                         console.error(err);
                                 }
   });
})();
