(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

  function getParam(nome) {
    return new URLSearchParams(window.location.search).get(nome);
  }

  async function init() {
    const categoriaId = getParam('id');
    const slug = getParam('slug');
    const titulo = document.getElementById('categoriaTitulo');
    const lista = document.getElementById('listaAnuncios');

    if (titulo && slug) {
      titulo.setAttribute('data-i18n', `categorias.${slug}`);
    }

    if (!categoriaId) {
      lista.innerHTML = '<p>Categoria nao especificada.</p>';
      return;
    }

    try {
      const resp = await fetch(`${API}/api/anuncios?categoria_id=${categoriaId}`);
      const anuncios = await resp.json();

      if (anuncios.length === 0) {
        lista.innerHTML = '<p>Nenhum anuncio disponivel nesta categoria no momento.</p>';
        return;
      }

      lista.innerHTML = anuncios
        .map(
          (a) => `
        <a class="anuncio-card" href="comerciante.html?id=${a.id_comerciante}" style="display:block;">
          <img src="${API}${a.fotos[0] || '/assets/img/placeholder-anuncio.svg'}" alt="${a.titulo}" loading="lazy" style="width:100%; height:160px; object-fit:cover; border-radius:8px; margin-bottom:10px;" />
          <h3 style="margin: 0 0 6px; color: var(--azul-escuro);">${a.titulo}</h3>
          <p style="font-size: 0.9rem; color: #555;">${(a.descricao || '').slice(0, 100)}${a.descricao && a.descricao.length > 100 ? '...' : ''}</p>
          <div class="anuncio-card__tags">
            ${a.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
          </div>
        </a>`
        )
        .join('');
    } catch (err) {
      lista.innerHTML = '<p>Erro ao carregar anuncios. Verifique se o backend esta rodando.</p>';
      console.error(err);
    }

    if (window.i18nPortal) window.i18nPortal.init();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
