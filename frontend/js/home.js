// Logica especifica da pagina Home: destaques + carrossel de categorias
(function () {
  const API = window.APP_CONFIG.API_BASE_URL;

  const DESTAQUES_FIXOS = [
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

  function renderDestaques() {
    const grid = document.getElementById('destaquesGrid');
    if (!grid) return;
    grid.innerHTML = DESTAQUES_FIXOS.map(
      (d) => `
        <div class="card-destaque">
          <img src="${d.img}" alt="${d.alt}" loading="lazy" />
          <div class="card-destaque__body">
            <h3>${d.titulo}</h3>
            <a class="btn btn--laranja" href="pages/planos-turista.html" data-i18n="home.saiba_mais">Saiba mais</a>
          </div>
        </div>`
    ).join('');
  }

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
          <img src="${API}${c.icone_url}" alt="${c.nome}" />
          <span data-i18n="categorias.${c.slug}">${c.nome}</span>
        </a>`
        )
        .join('');
    } catch (err) {
      track.innerHTML = '<p style="padding: 10px;">Nao foi possivel carregar as categorias. Verifique se o backend esta rodando.</p>';
      console.error('Erro ao carregar categorias:', err);
    }
  }

  function ativarSetas() {
    const track = document.getElementById('categoriasTrack');
    const esquerda = document.getElementById('setaEsquerda');
    const direita = document.getElementById('setaDireita');
    if (!track || !esquerda || !direita) return;
    esquerda.addEventListener('click', () => track.scrollBy({ left: -300, behavior: 'smooth' }));
    direita.addEventListener('click', () => track.scrollBy({ left: 300, behavior: 'smooth' }));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    renderDestaques();
    await renderCategorias();
    ativarSetas();
    if (window.i18nPortal) window.i18nPortal.init();
  });
})();
