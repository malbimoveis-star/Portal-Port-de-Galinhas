// frontend/js/home.js

document.addEventListener("DOMContentLoaded", async () => {

  const baseURL = window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : "";

  const destaquesGrid = document.getElementById("destaquesGrid");
  const categoriasTrack = document.getElementById("categoriasTrack");

  try {

    // ==========================
    // CARREGA COMERCIANTES (Destaques Premium)
    // ==========================

    const comerciantesRes = await fetch(`${baseURL}/api/comerciantes`);
    const comerciantes = await comerciantesRes.json();

    destaquesGrid.innerHTML = "";

    comerciantes.forEach(comerciante => {

      const imagem = comerciante.logo || comerciante.banner || `https://placehold.co/500x300?text=${encodeURIComponent(comerciante.nome)}`;

      destaquesGrid.innerHTML += `
        <div class="swiper-slide">
          <a href="pages/comerciante.html?id=${comerciante.id}">

            <img
              src="${imagem}"
              alt="${comerciante.nome}"
              onerror="this.onerror=null;this.src='https://placehold.co/500x300?text=${encodeURIComponent(comerciante.nome)}'"
            >

            <h3>${comerciante.nome}</h3>

            <p>${comerciante.categoria || ''}</p>

          </a>
        </div>
      `;

    });

    new Swiper("#destaquesSwiper", {

      loop: true,

      pagination: {
        el: ".swiper-pagination",
        clickable: true
      },

      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev"
      }

    });


    // ==========================
    // CARREGA CATEGORIAS (lista real, gerenciada pelo admin)
    // ==========================

    const categoriasRes = await fetch(`${baseURL}/api/categorias`);
    const categorias = await categoriasRes.json();

    categoriasTrack.innerHTML = "";

    categorias.forEach(categoria => {

      const icone = categoria.icone_url
        ? `<img src="${categoria.icone_url}" alt="${categoria.nome}" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=${encodeURIComponent(categoria.nome)}'">`
        : `<img src="https://placehold.co/100x100?text=${encodeURIComponent(categoria.nome)}" alt="${categoria.nome}">`;

      categoriasTrack.innerHTML += `
        <div class="carousel__item">

          <a href="pages/categoria.html?id=${categoria.id}&slug=${encodeURIComponent(categoria.slug || '')}">

            ${icone}

            <p>${categoria.nome}</p>

          </a>

        </div>
      `;

    });

  }

  catch (erro) {

    console.error(erro);

    destaquesGrid.innerHTML = `
      <h3>Erro ao carregar comerciantes.</h3>
    `;

    categoriasTrack.innerHTML = `
      <h3>Erro ao carregar categorias.</h3>
    `;

  }

});
