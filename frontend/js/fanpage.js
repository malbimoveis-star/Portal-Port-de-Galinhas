(() => {

const API = window.APP_CONFIG?.API_BASE_URL || "";

const PLACEHOLDER_BANNER =
"https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

const PLACEHOLDER_LOGO =
"https://via.placeholder.com/220";

function getId() {

    return new URLSearchParams(window.location.search).get("id");

}

function $(id){

    return document.getElementById(id);

}

function texto(valor){

    if(valor === null || valor === undefined)
        return "";

    return String(valor);

}

function imagem(caminho,padrao){

    if(!caminho)
        return padrao;

    if(caminho.startsWith("http"))
        return caminho;

    return API + caminho;

}

async function carregarFanpage(){

    const id = getId();

    if(!id){

        alert("ID do comerciante não informado.");

        return;

    }

    try{

        //---------------------------------------
        // COMERCIANTE
        //---------------------------------------

        const resposta = await fetch(

            `${API}/api/comerciantes/${id}`

        );

        if(!resposta.ok)
            throw new Error("Comerciante não encontrado.");

        const dados = await resposta.json();

        const comerciante =
            dados.comerciante || dados;

        //---------------------------------------
        // CAPA
        //---------------------------------------

        if($("bannerImagem")){

            $("bannerImagem").src = imagem(

                comerciante.banner,

                PLACEHOLDER_BANNER

            );

        }

        //---------------------------------------
        // FOTO PERFIL
        //---------------------------------------

        if($("logoImagem")){

            $("logoImagem").src = imagem(

                comerciante.logo,

                PLACEHOLDER_LOGO

            );

        }

        //---------------------------------------
        // FOTO DA PUBLICAÇÃO
        //---------------------------------------

        if($("logoPost")){

            $("logoPost").src = imagem(

                comerciante.logo,

                PLACEHOLDER_LOGO

            );

        }

        //---------------------------------------
        // NOME
        //---------------------------------------

        if($("nomeEmpresa"))
            $("nomeEmpresa").textContent =
                texto(comerciante.nome);

        if($("nomeEmpresaPost"))
            $("nomeEmpresaPost").textContent =
                texto(comerciante.nome);

        //---------------------------------------
        // CATEGORIA
        //---------------------------------------

        if($("categoriaCidade")){

            $("categoriaCidade").textContent =

                `${texto(comerciante.categoria)} • ${texto(comerciante.cidade)}`;

        }

        //---------------------------------------
        // CIDADE
        //---------------------------------------

        if($("cidade")){

            $("cidade").innerHTML =

            "📍 " +

            texto(comerciante.cidade);

        }

        //---------------------------------------
        // TELEFONE
        //---------------------------------------

        if($("telefone")){

            $("telefone").innerHTML =

            "📞 " +

            texto(comerciante.telefone);

        }

        //---------------------------------------
        // SITE
        //---------------------------------------

        if($("site")){

            if(comerciante.site){

                $("site").innerHTML =

                `🌐 <a href="${comerciante.site}" target="_blank">

                ${comerciante.site}

                </a>`;

            }else{

                $("site").innerHTML="";

            }

        }

        //---------------------------------------
        // CONTATO
        //---------------------------------------

        if($("contatoEmpresa")){

            $("contatoEmpresa").innerHTML=

            `
            <strong>${texto(comerciante.nome)}</strong>

            <br><br>

            📞 ${texto(comerciante.telefone)}

            <br>

            📍 ${texto(comerciante.cidade)}

            <br>

            🌐 ${texto(comerciante.site)}

            `;

        }

        //---------------------------------------
        // WHATSAPP
        //---------------------------------------

        if($("whatsapp")){

            if(comerciante.telefone){

                const numero=

                comerciante.telefone.replace(/\D/g,'');

                $("whatsapp").innerHTML=

                `

                <a

                class="btn btn--verde"

                target="_blank"

                href="https://wa.me/${numero}">

                💬 Falar no WhatsApp

                </a>

                `;

            }

        }

        //---------------------------------------
        // DAQUI PARA BAIXO
        // COMEÇA O FEED
        //---------------------------------------
            //---------------------------------------
        // CARREGAR ANÚNCIOS / PUBLICAÇÕES
        //---------------------------------------

        const respostaAnuncios = await fetch(

            `${API}/api/anuncios/comerciante/${id}`

        );

        if(respostaAnuncios.ok){

            const dadosAnuncios =
                await respostaAnuncios.json();

            const anuncios =
                dadosAnuncios.anuncios || [];

            const feed =
                $("feed");

            const lista =
                $("listaAnunciosComerciante");

            if(lista){

                lista.innerHTML="";

                anuncios.forEach(anuncio=>{

                    let foto =
                    "https://images.unsplash.com/photo-1540541338287-41700207dee6";

                    if(
                        anuncio.fotos &&
                        anuncio.fotos.length>0
                    ){

                        foto =
                        imagem(
                            anuncio.fotos[0],
                            foto
                        );

                    }

                    lista.innerHTML += `

                    <div class="post">

                        <div class="post-header">

                            <img
                                src="${imagem(comerciante.logo,PLACEHOLDER_LOGO)}"
                                alt="Logo">

                            <div>

                                <h4>

                                    ${texto(comerciante.nome)}

                                </h4>

                                <span>

                                    Publicado agora

                                </span>

                            </div>

                        </div>

                        <div class="post-texto">

                            <strong>

                            ${texto(anuncio.titulo)}

                            </strong>

                            <br><br>

                            ${texto(anuncio.descricao)}

                        </div>

                        <img
                            src="${foto}"
                            alt="Imagem">

                        <div class="post-footer">

                            <button>👍 Curtir</button>

                            <button>💬 Comentar</button>

                            <button>↗ Compartilhar</button>

                        </div>

                    </div>

                    `;

                });

            }

        }

        //---------------------------------------
        // GALERIA
        //---------------------------------------

        const galeria =
            $("galeriaAnuncios");

        if(galeria){

            galeria.innerHTML="";

            if(
                respostaAnuncios.ok &&
                dadosAnuncios.anuncios
            ){

                dadosAnuncios.anuncios.forEach(anuncio=>{

                    if(
                        anuncio.fotos &&
                        anuncio.fotos.length
                    ){

                        anuncio.fotos.forEach(foto=>{

                            galeria.innerHTML += `

                            <img
                                src="${imagem(foto,"")}"
                                alt="Foto">

                            `;

                        });

                    }

                });

            }

        }

        //---------------------------------------
        // MAPA
        //---------------------------------------

        const mapa =
            $("mapaComerciante");

        if(mapa){

            if(
                comerciante.latitude &&
                comerciante.longitude
            ){

                mapa.innerHTML = `

                <iframe

                    width="100%"

                    height="300"

                    frameborder="0"

                    style="border:0;border-radius:10px"

                    loading="lazy"

                    allowfullscreen

                    src="https://www.google.com/maps?q=${comerciante.latitude},${comerciante.longitude}&output=embed">

                </iframe>

                `;

            }else{

                mapa.innerHTML =

                "<p>Mapa ainda não cadastrado.</p>";

            }

        }

        //---------------------------------------
        // AVALIAÇÕES
        //---------------------------------------

        if($("listaAvaliacoes")){

            $("listaAvaliacoes").innerHTML =

            `

            <div class="card">

                ⭐⭐⭐⭐⭐

                <br><br>

                Ainda não existem avaliações para esta empresa.

            </div>

            `;

        }
                //---------------------------------------
        // ESTATÍSTICAS (PREPARADO)
        //---------------------------------------

        if(document.getElementById("totalCurtidas")){

            document.getElementById("totalCurtidas").textContent =
                comerciante.curtidas || 0;

        }

        if(document.getElementById("totalSeguidores")){

            document.getElementById("totalSeguidores").textContent =
                comerciante.seguidores || 0;

        }

        if(document.getElementById("mediaAvaliacoes")){

            document.getElementById("mediaAvaliacoes").textContent =
                comerciante.media_avaliacoes || "5,0";

        }

    }

    catch(erro){

        console.error(
            "[FANPAGE]",
            erro
        );

        alert(
            "Erro ao carregar a fanpage."
        );

    }

}

document.addEventListener(

    "DOMContentLoaded",

    carregarFanpage

);

})();
