// frontend/js/home.js

document.addEventListener("DOMContentLoaded", async () => {

  const baseURL = "https://portal-port-de-galinhas-production.up.railway.app";

  const destaquesGrid = document.getElementById("destaquesGrid");
  const categoriasTrack = document.getElementById("categoriasTrack");

  try {

    // ==========================
    // CARREGA COMERCIANTES
    // ==========================

    const comerciantesRes = await fetch(`${baseURL}/api/comerciantes`);
    const comerciantes = await comerciantesRes.json();

    destaquesGrid.innerHTML = "";

    comerciantes.forEach(comerciante => {

      destaquesGrid.innerHTML += `
        <div class="swiper-slide">
          <a href="pages/comerciante.html?id=${comerciante.id}">

            <img
              src="https://placehold.co/500x300?text=${encodeURIComponent(comerciante.nome)}"
              alt="${comerciante.nome}"
            >

            <h3>${comerciante.nome}</h3>

            <p>${comerciante.categoria}</p>

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
    // CARREGA CATEGORIAS
    // ==========================

    const anunciosRes = await fetch(`${baseURL}/api/anuncios`);
    const anuncios = await anunciosRes.json();

    categoriasTrack.innerHTML = "";

    anuncios.forEach(anuncio => {

      categoriasTrack.innerHTML += `
        <div class="carousel__item">

          <a href="pages/comerciante.html?id=${anuncio.id}">

            <img
              src="${baseURL}${anuncio.capa}"
              alt="${anuncio.categoria}"
              onerror="this.src='https://placehold.co/250x180?text=${encodeURIComponent(anuncio.categoria)}'"
            >

            <p>${anuncio.categoria}</p>

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
