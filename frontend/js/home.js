// frontend/js/home.js
document.addEventListener('DOMContentLoaded', async () => {
  const baseURL = 'https://portal-port-de-galinhas-production.up.railway.app';

  const destaquesGrid = document.getElementById('destaquesGrid');
  const categoriasTrack = document.getElementById('categoriasTrack');

  try {
    // Buscar comerciantes em destaque
    const comerciantesRes = await fetch(`${baseURL}/api/comerciantes`);
    const comerciantes = await comerciantesRes.json();

    // Preencher carrossel de destaques
    destaquesGrid.innerHTML = comerciantes.map(comerciante => `
      <div class="swiper-slide">
        <a href="pages/comerciante.html?id=${comerciante.id}">
          <img src="${baseURL}${comerciante.logo}" alt="${comerciante.nome}">
          <h3>${comerciante.nome}</h3>
        </a>
      </div>
    `).join('');

    // Inicializar Swiper
    new Swiper('#destaquesSwiper', {
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    });

    // Buscar categorias (exemplo: restaurantes, hotéis, passeios)
    const categoriasRes = await fetch(`${baseURL}/api/anuncios`);
    const anuncios = await categoriasRes.json();

    categoriasTrack.innerHTML = anuncios.map(anuncio => `
      <div class="carousel__item">
        <a href="pages/comerciante.html?id=${anuncio.id}">
          <img src="${baseURL}${anuncio.capa}" alt="${anuncio.categoria}">
          <p>${anuncio.categoria}</p>
        </a>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar dados da Home:', error);
    destaquesGrid.innerHTML = '<p>Não foi possível carregar os destaques.</p>';
    categoriasTrack.innerHTML = '<p>Não foi possível carregar as categorias.</p>';
  }
});
