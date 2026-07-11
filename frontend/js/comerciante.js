(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

  function getParam(nome) {
    return new URLSearchParams(window.location.search).get(nome);
  }

  const STATUS_LABELS = {
    ativo: { classe: 'status-badge--ativo', chave: 'comerciante_pagina.status_ativo' },
    degustacao: { classe: 'status-badge--degustacao', chave: 'comerciante_pagina.status_degustacao' },
    expirado: { classe: 'status-badge--expirado', chave: 'comerciante_pagina.status_expirado' },
  };

  async function init() {
    const id = getParam('id');
    if (!id) {
      document.getElementById('paginaComerciante').innerHTML = '<p>Comerciante nao especificado.</p>';
      return;
    }

    try {
      const respComerciante = await fetch(`${API}/api/comerciantes/${id}`);
      if (!respComerciante.ok) throw new Error('Comerciante nao encontrado');
      const { comerciante } = await respComerciante.json();

      document.getElementById('nomeComerciante').textContent = comerciante.nome;
      document.title = `${comerciante.nome} - Portal Porto de Galinhas`;

      const statusInfo = STATUS_LABELS[comerciante.status] || STATUS_LABELS.expirado;
      const badge = document.getElementById('statusBadge');
      badge.classList.add('status-badge', statusInfo.classe);
      badge.setAttribute('data-i18n', statusInfo.chave);

      document.getElementById('comercianteInfo').innerHTML = `
        Telefone: ${comerciante.telefone || 'nao informado'}<br/>
        E-mail: ${comerciante.email}
      `;

      const contatoWrapper = document.getElementById('contatoWrapper');
      if (comerciante.status === 'ativo' || comerciante.status === 'degustacao') {
        const numeroLimpo = (comerciante.telefone || '').replace(/\D/g, '');
        contatoWrapper.innerHTML = numeroLimpo
          ? `<a class="btn btn--verde" href="https://wa.me/${numeroLimpo}" target="_blank" rel="noopener" data-i18n="comerciante_pagina.whatsapp">WhatsApp</a>`
          : '';
      } else {
        contatoWrapper.innerHTML = `<p style="color:#a12a2a;" data-i18n="comerciante_pagina.sem_whatsapp"></p>`;
      }

      // Anuncios do comerciante (respeitando visibilidade no backend)
      const respAnuncios = await fetch(`${API}/api/anuncios/comerciante/${id}`);
      const dataAnuncios = await respAnuncios.json();

      const galeria = document.getElementById('galeriaAnuncios');
      const listaWrapper = document.getElementById('listaAnunciosComerciante');

      if (!dataAnuncios.visivel_publicamente || dataAnuncios.anuncios.length === 0) {
        galeria.innerHTML = '<p>Nenhuma foto disponivel no momento.</p>';
        listaWrapper.innerHTML = '';
      } else {
        const todasFotos = dataAnuncios.anuncios.flatMap((a) =>
          a.fotos.map((f) => ({ url: f, titulo: a.titulo }))
        );
        galeria.innerHTML = todasFotos.length
          ? todasFotos
              .map(
                (f) =>
                  `<img src="${API}${f.url}" alt="Foto de ${f.titulo} - ${comerciante.nome}" loading="lazy" />`
              )
              .join('')
          : '<p>Nenhuma foto disponivel no momento.</p>';

        listaWrapper.innerHTML = dataAnuncios.anuncios
          .map(
            (a) => `
          <div class="card">
            <h3>${a.titulo}</h3>
            <p>${a.descricao || ''}</p>
            <div class="anuncio-card__tags">
              ${a.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>`
          )
          .join('');
      }

      if (window.i18nPortal) window.i18nPortal.init();
    } catch (err) {
      document.getElementById('paginaComerciante').innerHTML = '<p>Nao foi possivel carregar os dados deste comerciante.</p>';
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
