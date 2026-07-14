// Logica especifica da pagina Home: destaques premium (carrossel Swiper) + carrossel de categorias
(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

  // Fallback estatico, usado apenas se a API estiver indisponivel (ex: backend offline).
  const DESTAQUES_FALLBACK = [
    {
      titulo: 'Passeio de Lancha',
      img: '../assets/comerciantes/passeio-lancha.jpg',
      alt: 'Lancha navegando pelas piscinas naturais de Porto de Galinhas em dia de sol',
    },
    {
      titulo: 'Buggy pelas Dunas',
      img: '../assets/comerciantes/buggy-dunas.jpg',
      alt: 'Buggy amarelo passeando pelas dunas de areia branca proximas a praia',
    },
    {
      titulo: 'Mergulho nos Corais',
      img: '../assets/comerciantes/mergulho-corais.jpg',
      alt: 'Mergulhador explorando os corais e a vida marinha nas piscinas naturais',
    },
  ];

  // Renderiza TODOS os anuncios/destaques premium retornados pela API (sem limite fixo),
  // permitindo adicionar mais destaques via backend sem alterar este arquivo.
  async function renderDestaques() {
    const grid = document.getElementById('destaquesGrid');
    if (!grid) return;

    let itens = [];
    try {
      const resp = await fetch(`${API}/api/anuncios`);
      const anuncios = await resp.json();
      itens = anuncios.map((a) => ({
        titulo: a.titulo,
        img: a.fotos && a.fotos[0] ? `${API}${a.fotos[0]}` : '../assets/img/placeholder-anuncio.svg',
        alt: a.titulo,
        id: a.id,
      }));
    } catch (err) {
      console.error('Erro ao carregar destaques/anuncios:', err);
    }

    if (itens.length === 0) itens = DESTAQUES_FALLBACK;

    grid.innerHTML = itens
      .map(
        (d) => `
        <div class="swiper-slide">
          <div class="card-destaque">
            <img src="${d.img}" alt="${d.alt}" loading="lazy" />
            <div class="card-destaque__body">
              <h3>${d.titulo}</h3>
              <a class="btn btn--laranja" href="pages/planos-turista.html" data-i18n="home.saiba_mais">Saiba mais</a>
            </div>
          </div>
        </div>`
      )
      .join('');

    if (window.Swiper) {
      new window.Swiper('#destaquesSwiper', {
        loop: itens.length > 1,
        slidesPerView: 1,
        spaceBetween: 20,
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        autoplay: { delay: 4000, disableOnInteraction: false },
        breakpoints: {
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        },
      });
    }
  }

  // Consome /api/categorias dinamicamente (sem limite/hardcode) e alimenta o carrossel de categorias.
  async function renderCategorias() {
    const track = document.getElementById('categoriasTrack');
    if (!track) return;
    try {
      const resp = await fetch(`${API}/api/categorias`);
      const categorias = await resp.json();
      track.innerHTML = categorias
        .map(
          (c) => `
        <a class="carousel__item" href="pages/categoria.html?slug=${c.slug}&id=${c.id}">
          <img src="${API}${c.icone_url}" alt="${c.nome}" loading="lazy" />
          <span data-i18n="categorias.${c.slug}">${c.nome}</span>
        </a>`
        )
        .join('');
    } catch (err) {
      track.innerHTML = '<p style="padding: 10px;">Nao foi possivel carregar as categorias. Verifique se o backend esta rodando.</p>';
      console.error('Erro ao carregar categorias:', err);
    }
  }

  // Setas de navegacao do carrossel de categorias: scroll suave item a item.
  function ativarSetas() {
    const track = document.getElementById('categoriasTrack');
    const esquerda = document.getElementById('setaEsquerda');
    const direita = document.getElementById('setaDireita');
    if (!track || !esquerda || !direita) return;

    function larguraItem() {
      const item = track.querySelector('.carousel__item');
      if (!item) return 300;
      return item.getBoundingClientRect().width + 18; // + gap definido no CSS
    }

    esquerda.addEventListener('click', () => track.scrollBy({ left: -larguraItem(), behavior: 'smooth' }));
    direita.addEventListener('click', () => track.scrollBy({ left: larguraItem(), behavior: 'smooth' }));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([renderDestaques(), renderCategorias()]);
    ativarSetas();
    if (window.i18nPortal) window.i18nPortal.init();
  });
})();
