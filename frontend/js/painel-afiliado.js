(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const auth = window.authAfiliado;

  const STATUS_COMISSAO_LABEL = { pendente: 'Pendente', pago: 'Pago' };

  function headersAuth() {
    return { Authorization: `Bearer ${auth.getToken()}` };
  }

  function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
  }

  function formatarMoeda(valor) {
    return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function mostrarErro(mensagem) {
    const el = document.getElementById('mensagemErro');
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = 'block';
  }

  async function carregarPainel() {
    const resp = await fetch(`${API}/api/afiliados/me`, { headers: headersAuth() });
    if (resp.status === 401) {
      auth.logout();
      window.location.href = 'login-afiliado.html';
      return null;
    }
    return resp.json();
  }

  async function carregarComissoes() {
    const resp = await fetch(`${API}/api/afiliados/me/comissoes`, { headers: headersAuth() });
    if (!resp.ok) return [];
    return resp.json();
  }

  function renderStats(data) {
    document.getElementById('campoLinkIndicacao').value = data.link_indicacao;
    document.getElementById('statCliques').textContent = data.estatisticas.cliques;
    document.getElementById('statIndicacoes').textContent = data.estatisticas.indicacoes_total;
    document.getElementById('statComissaoPendente').textContent = formatarMoeda(data.estatisticas.comissao_pendente);
    document.getElementById('statComissaoPaga').textContent = formatarMoeda(data.estatisticas.comissao_paga);

    const infoTermos = document.getElementById('infoTermos');
    if (infoTermos && data.afiliado && data.afiliado.termos_aceitos_em) {
      const data_ = new Date(data.afiliado.termos_aceitos_em);
      const dataFormatada = isNaN(data_.getTime()) ? data.afiliado.termos_aceitos_em : data_.toLocaleDateString('pt-BR');
      const chavePix = data.afiliado.chave_pix ? ` Chave Pix cadastrada para pagamento: ${data.afiliado.chave_pix}.` : '';
      infoTermos.textContent = `Termo de Afiliado (v${data.afiliado.termos_versao || '1.0'}) aceito em ${dataFormatada}. Comissão de 50%, fechamento no último dia do mês e pagamento até o 5º dia útil do mês seguinte.${chavePix}`;
    }
  }

  function renderComissoes(comissoes) {
    const container = document.getElementById('listaComissoes');
    if (!container) return;
    if (!comissoes.length) {
      container.innerHTML = '<div class="vazio">Nenhuma comissao gerada ainda. Compartilhe seu link para comecar a indicar comerciantes.</div>';
      return;
    }
    const linhas = comissoes.map((c) => `
      <tr>
        <td>${escapeHtml(c.nome_comerciante || 'Comerciante removido')}</td>
        <td>${escapeHtml(c.mes_referencia)}</td>
        <td>${formatarMoeda(c.valor_comissao)}</td>
        <td><span class="status-badge status-badge--${c.status === 'pago' ? 'ativo' : 'degustacao'}">${STATUS_COMISSAO_LABEL[c.status] || c.status}</span></td>
      </tr>
    `).join('');
    container.innerHTML = `
      <table class="tabela-simples">
        <thead><tr><th>Comerciante indicado</th><th>Mes</th><th>Comissao</th><th>Status</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    `;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.getToken()) {
      window.location.href = 'login-afiliado.html';
      return;
    }

    document.getElementById('btnSair').addEventListener('click', () => {
      auth.logout();
      window.location.href = '../index.html';
    });

    document.getElementById('btnCopiarLink').addEventListener('click', async () => {
      const campo = document.getElementById('campoLinkIndicacao');
      try {
        await navigator.clipboard.writeText(campo.value);
        const btn = document.getElementById('btnCopiarLink');
        const textoOriginal = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = textoOriginal; }, 1500);
      } catch (e) {
        campo.select();
        document.execCommand('copy');
      }
    });

    try {
      const data = await carregarPainel();
      if (!data) return;
      if (!data.afiliado || !data.afiliado.perfil_completo) {
        // Cadastro ainda nao foi concluido (falta confirmar e-mail e/ou
        // enviar RG/CPF/documento/aceite do termo) - o painel completo so
        // libera depois disso.
        window.location.href = 'completar-cadastro-afiliado.html';
        return;
      }
      renderStats(data);
      const comissoes = await carregarComissoes();
      renderComissoes(comissoes);
    } catch (err) {
      mostrarErro('Nao foi possivel carregar seu painel. Tente novamente em instantes.');
      console.error(err);
    }
  });
})();
