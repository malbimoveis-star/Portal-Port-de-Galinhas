(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const CHAVE_TOKEN = 'portal_pg_afiliado_token';
  const CHAVE_AFILIADO = 'portal_pg_afiliado';

  function mostrarErro(mensagem) {
    const el = document.getElementById('mensagemErro');
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = 'block';
  }

  function salvarSessao(token, afiliado) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_AFILIADO, JSON.stringify(afiliado));
  }

  function getToken() {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  function getAfiliadoLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_AFILIADO) || 'null');
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_AFILIADO);
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

  const TAMANHO_MAXIMO_DOCUMENTO = 5 * 1024 * 1024; // 5 MB

  function lerArquivoComoBase64(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => {
        // dataURL vem como "data:<mime>;base64,<dados>" - guardamos so a
        // parte depois da virgula.
        const partes = String(leitor.result || '').split(',');
        resolve(partes.length > 1 ? partes[1] : '');
      };
      leitor.onerror = () => reject(new Error('Nao foi possivel ler o arquivo.'));
      leitor.readAsDataURL(arquivo);
    });
  }

  function cpfValidoNoNavegador(cpfBruto) {
    const cpf = String(cpfBruto || '').replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    function calcularDigito(base) {
      let soma = 0;
      let peso = base.length + 1;
      for (let i = 0; i < base.length; i++) { soma += Number(base[i]) * peso; peso--; }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    }
    const d1 = calcularDigito(cpf.slice(0, 9));
    const d2 = calcularDigito(cpf.slice(0, 9) + String(d1));
    return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
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
      const rg = document.getElementById('campoRg').value.trim();
      const cpf = document.getElementById('campoCpf').value.trim();
      const telefone = document.getElementById('campoTelefone').value.trim();
      const campoDocumento = document.getElementById('campoDocumento');
      const arquivo = campoDocumento && campoDocumento.files ? campoDocumento.files[0] : null;
      const aceiteTermos = document.getElementById('campoAceiteTermos');

      if (!cpfValidoNoNavegador(cpf)) {
        mostrarErro('CPF invalido. Confira o numero digitado.');
        return;
      }
      if (!arquivo) {
        mostrarErro('Anexe uma foto ou PDF do seu documento (RG ou CPF).');
        return;
      }
      if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) {
        mostrarErro('O documento deve ter no maximo 5 MB.');
        return;
      }
      if (!aceiteTermos || !aceiteTermos.checked) {
        mostrarErro('E preciso aceitar o Termo de Afiliado para concluir o cadastro.');
        return;
      }

      try {
        const documento_base64 = await lerArquivoComoBase64(arquivo);
        const resp = await fetch(`${API}/api/afiliados/cadastro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome, email, senha, rg, cpf, telefone,
            documento_base64,
            documento_nome: arquivo.name,
            documento_tipo: arquivo.type,
            aceite_termos: true,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          mostrarErro(data.erro || 'Erro ao cadastrar.');
          return;
        }
        salvarSessao(data.token, data.afiliado);
        window.location.href = 'painel-afiliado.html';
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
        const resp = await fetch(`${API}/api/afiliados/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          mostrarErro(data.erro || 'Credenciais invalidas.');
          return;
        }
        salvarSessao(data.token, data.afiliado);
        window.location.href = 'painel-afiliado.html';
      } catch (err) {
        mostrarErro('Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.');
        console.error(err);
      }
    });
  }

  window.authAfiliado = { initCadastro, initLogin, getToken, getAfiliadoLocal, logout, salvarSessao, initToggleSenha };
})();
