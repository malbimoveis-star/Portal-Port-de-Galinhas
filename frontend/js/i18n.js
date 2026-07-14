// Modulo de internacionalizacao (i18n) - troca textos sem reload
(function () {
  const IDIOMAS_DISPONIVEIS = ['pt', 'en', 'es', 'fr'];
  const IDIOMA_PADRAO = 'pt';
  const CHAVE_STORAGE = 'portal_pg_idioma';

  const BANDEIRAS = {
    pt: '🇧🇷',
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
  };

  const NOMES_IDIOMA = {
    pt: 'Portugues',
    en: 'English',
    es: 'Espanol',
    fr: 'Francais',
  };

  function caminhoI18n() {
    // Detecta se estamos em /frontend/ (raiz) ou /frontend/pages/
    const emPagina = window.location.pathname.includes('/pages/');
    return emPagina ? '../i18n/' : 'i18n/';
  }

  function getIdiomaAtual() {
    return localStorage.getItem(CHAVE_STORAGE) || IDIOMA_PADRAO;
  }

  function setIdiomaAtual(idioma) {
    localStorage.setItem(CHAVE_STORAGE, idioma);
  }

  function buscarChave(obj, caminho) {
    return caminho.split('.').reduce((acc, parte) => (acc && acc[parte] !== undefined ? acc[parte] : null), obj);
  }

  async function carregarTraducoes(idioma) {
    const resp = await fetch(`${caminhoI18n()}${idioma}.json`);
    if (!resp.ok) throw new Error('Falha ao carregar traducoes de ' + idioma);
    return resp.json();
  }

  function aplicarTraducoes(dicionario) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const chave = el.getAttribute('data-i18n');
      const valor = buscarChave(dicionario, chave);
      if (valor !== null) {
        el.textContent = valor;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const chave = el.getAttribute('data-i18n-placeholder');
      const valor = buscarChave(dicionario, chave);
      if (valor !== null) {
        el.setAttribute('placeholder', valor);
      }
    });

    window.__i18nDict = dicionario;
    document.dispatchEvent(new CustomEvent('i18n:aplicado', { detail: dicionario }));
  }

  async function trocarIdioma(idioma) {
    if (!IDIOMAS_DISPONIVEIS.includes(idioma)) idioma = IDIOMA_PADRAO;
    setIdiomaAtual(idioma);
    document.documentElement.setAttribute('lang', idioma);
    const dicionario = await carregarTraducoes(idioma);
    aplicarTraducoes(dicionario);
    atualizarBotaoIdioma(idioma);
  }

  function atualizarBotaoIdioma(idioma) {
    const btn = document.querySelector('.lang-selector__btn .bandeira-atual');
    if (btn) btn.textContent = BANDEIRAS[idioma] || BANDEIRAS[IDIOMA_PADRAO];
  }

  function montarSeletorIdioma() {
    const containers = document.querySelectorAll('.lang-selector');
    containers.forEach((container) => {
      const btn = container.querySelector('.lang-selector__btn');
      const menu = container.querySelector('.lang-selector__menu');
      if (!btn || !menu) return;

      menu.innerHTML = IDIOMAS_DISPONIVEIS.map(
        (idioma) => `
          <div class="lang-selector__item" data-idioma="${idioma}">
            <span>${BANDEIRAS[idioma]}</span>
            <span>${NOMES_IDIOMA[idioma]}</span>
          </div>`
      ).join('');
if (container.dataset.i18nBound === 'true') return;
container.dataset.i18nBound = 'true';

btn.addEventListener('click', (e) => {
  e.stopPropagation();
  menu.classList.toggle('aberto');
});
            menu.querySelectorAll('.lang-selector__item').forEach((item) => {
        item.addEventListener('click', () => {
          trocarIdioma(item.getAttribute('data-idioma'));
          menu.classList.remove('aberto');
        });
      });

      document.addEventListener('click', () => menu.classList.remove('aberto'));
    });
  }

  window.i18nPortal = {
    init: async function () {
      montarSeletorIdioma();
      const idiomaAtual = getIdiomaAtual();
      document.documentElement.setAttribute('lang', idiomaAtual);
      const dicionario = await carregarTraducoes(idiomaAtual);
      aplicarTraducoes(dicionario);
      atualizarBotaoIdioma(idiomaAtual);
    },
    t: function (chave) {
      return buscarChave(window.__i18nDict || {}, chave) || chave;
    },
    getIdiomaAtual,
  };

  // OBS: a inicializacao e disparada por layout.js (window.layoutPortal.init),
  // que garante que o header/seletor de idioma ja foi injetado no DOM antes.
})();
