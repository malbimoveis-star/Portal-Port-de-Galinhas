// Injeta o header (menu superior) e os rodapes (geral + mobile) em todas as paginas
(function () {
  function caminhoBase() {
    const emPagina = window.location.pathname.includes('/pages/');
    return emPagina ? '../' : '';
  }

  function caminhoAssets() {
    const emPagina = window.location.pathname.includes('/pages/');
    return emPagina ? '../../assets/' : '../assets/';
  }

  function linkComerciante(id) {
    return `${caminhoBase()}pages/comerciante.html?id=${id}`;
  }

  function montarHeader() {
    const base = caminhoBase();
    return `
      <header class="header">
        <div class="header__inner">
          <a href="${base}index.html" class="header__logo">
            <img src="${caminhoAssets()}icons/logo-tucano.svg" data-logo-src alt="Portal Porto de Galinhas" />
            <span class="header__logo-text">PORTAL<span class="laranja">PORTO DE GALINHAS</span></span>
          </a>
          <nav class="header__nav" id="menuPrincipal">
            <a href="${base}index.html" data-i18n="menu.home">Home</a>
            <a href="${base}pages/blog.html" data-i18n="menu.blog">Blog</a>
            <a href="${base}pages/como-funciona.html" data-i18n="menu.como_funciona">Como Funciona</a>
            <a href="${base}pages/contato.html" data-i18n="menu.contato">Contato</a>
            <a href="${base}pages/cadastro-comerciante.html" data-i18n="menu.sou_comerciante">Sou Comerciante</a>
            <a href="${base}pages/planos-turista.html" data-i18n="menu.sou_turista">Sou Turista</a>
          </nav>
          <div class="header__actions">
            <div class="lang-selector">
              <button class="lang-selector__btn" type="button">
                <span class="bandeira-atual">🇧🇷</span>
                <span data-i18n="menu.idioma">Idioma</span>
              </button>
              <div class="lang-selector__menu"></div>
            </div>
            <button class="hamburguer" id="btnHamburguer" aria-label="Menu">&#9776;</button>
          </div>
        </div>
      </header>
    `;
  }

  function montarRodape() {
    const base = caminhoBase();
    return `
      <footer class="rodape">
        <div class="rodape__links">
          <a href="${base}pages/termos.html" data-i18n="rodape.termos">Termos de Uso</a>
          <a href="${base}pages/privacidade.html" data-i18n="rodape.privacidade">Politica de Privacidade</a>
          <a href="${base}pages/suporte.html" data-i18n="rodape.suporte">Suporte 24h</a>
        </div>
        <div class="rodape__contato">
          contato@portalportodegalinhas.com.br &nbsp;|&nbsp; +55 (81) 99999-0000
        </div>
        <div class="rodape__social">
          <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">📷</a>
          <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">👍</a>
        </div>
        <div class="rodape__copy">
          &copy; 2026 Portal Porto de Galinhas - <span data-i18n="rodape.direitos">Todos os direitos reservados</span>
        </div>
      </footer>

      <div class="rodape-mobile">
        <a class="btn btn--verde" href="${base}pages/cadastro-comerciante.html?plano=comerciante_basico" data-i18n="rodape_mobile.cadastre_negocio">Cadastre seu negocio</a>
        <a class="btn btn--primario" href="${base}pages/planos-turista.html" data-i18n="rodape_mobile.assine_ja" style="color: var(--azul-primario);">Assine ja</a>
      </div>
    `;
  }

  function ativarHamburguer() {
    const btn = document.getElementById('btnHamburguer');
    const menu = document.getElementById('menuPrincipal');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => menu.classList.toggle('aberto'));
  }

  window.layoutPortal = {
    montarHeader,
    montarRodape,
    caminhoBase,
    caminhoAssets,
    linkComerciante,
    init: function () {
      const headerEl = document.getElementById('layout-header');
      const rodapeEl = document.getElementById('layout-rodape');
      if (headerEl) headerEl.innerHTML = montarHeader();
      if (rodapeEl) rodapeEl.innerHTML = montarRodape();
      ativarHamburguer();
      if (window.i18nPortal) window.i18nPortal.init();
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.layoutPortal.init();
  });
})();
