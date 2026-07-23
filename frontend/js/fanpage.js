(() => {

const API = window.APP_CONFIG?.API_BASE_URL || "";

function getId() {
    return new URLSearchParams(window.location.search).get("id");
}

async function carregarFanpage() {

    const id = getId();

    if (!id) {
        alert("ID do comerciante não informado.");
        return;
    }

    try {

        const resposta = await fetch(`${API}/api/comerciantes/${id}`);

        if (!resposta.ok)
            throw new Error("Comerciante não encontrado.");

        const dados = await resposta.json();

        const comerciante = dados.comerciante || dados;

        // Banner
        if (document.getElementById("bannerImagem")) {

            document.getElementById("bannerImagem").src =
                comerciante.banner
                ? API + comerciante.banner
                : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

        }

        // Logo
        if (document.getElementById("logoImagem")) {

            document.getElementById("logoImagem").src =
                comerciante.logo
                ? API + comerciante.logo
                : "https://via.placeholder.com/180";

        }

        // Nome
        if (document.getElementById("nomeEmpresa"))
            document.getElementById("nomeEmpresa").textContent =
                comerciante.nome || "";

        // Categoria + Cidade
        if (document.getElementById("categoriaCidade"))
            document.getElementById("categoriaCidade").textContent =
                `${comerciante.categoria || ""} • ${comerciante.cidade || ""}`;

        // Cidade
        if (document.getElementById("cidade"))
            document.getElementById("cidade").innerHTML =
                "📍 " + (comerciante.cidade || "");

        // Telefone
        if (document.getElementById("telefone"))
            document.getElementById("telefone").innerHTML =
                "📞 " + (comerciante.telefone || "");

        // Site
        if (document.getElementById("site"))
            document.getElementById("site").innerHTML =
                comerciante.site
                ? `🌐 <a href="${comerciante.site}" target="_blank">${comerciante.site}</a>`
                : "";

        // WhatsApp
        if (document.getElementById("whatsapp") && comerciante.telefone) {

            const numero = comerciante.telefone.replace(/\D/g, "");

            document.getElementById("whatsapp").innerHTML = `
                <br>
                <a href="https://wa.me/${numero}" target="_blank">
                    💬 Falar no WhatsApp
                </a>
            `;

        }

        // Carregar anúncios

        const respostaAnuncios = await fetch(`${API}/api/anuncios/comerciante/${id}`);

        if (respostaAnuncios.ok) {

            const anuncios = await respostaAnuncios.json();

            const feed = document.getElementById("feed");

            feed.innerHTML = "";

            anuncios.anuncios.forEach(anuncio => {

                let foto = "https://images.unsplash.com/photo-1540541338287-41700207dee6";

                if (anuncio.fotos && anuncio.fotos.length > 0)
                    foto = API + anuncio.fotos[0];

                feed.innerHTML += `

                    <div class="post">

                        <div class="post-header">

                            ${anuncio.titulo}

                        </div>

                        <img src="${foto}" alt="Foto">

                        <div class="post-footer">

                            ${anuncio.descricao || ""}

                        </div>

                    </div>

                `;

            });

        }

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao carregar a fanpage.");

    }

}

document.addEventListener("DOMContentLoaded", carregarFanpage);

})();
