// frontend/js/fanpage.js
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const baseURL = 'https://portal-port-de-galinhas-production.up.railway.app';

  const comercianteContainer = document.getElementById('comerciante');
  const anunciosContainer = document.getElementById('anuncios');

  if (!id) {
    comercianteContainer.innerHTML = '<p>ID do comerciante não informado.</p>';
    return;
  }

  try {
    // Buscar dados do comerciante
    const comercianteRes = await fetch(`${baseURL}/api/comerciantes/${id}`);
    const comerciante = await comercianteRes.json();

    // Buscar dados do anúncio
    const anuncioRes = await fetch(`${baseURL}/api/anuncios/${id}`);
    const anuncio = await anuncioRes.json();

    // Renderizar dados do comerciante
    comercianteContainer.innerHTML = `
      <div class="perfil">
        <img src="${baseURL}${comerciante.logo}" alt="${comerciante.nome}" class="logo-comerciante">
        <h2>${comerciante.nome}</h2>
        <p><strong>Endereço:</strong> ${comerciante.endereco}</p>
        <p><strong>Telefone:</strong> ${comerciante.telefone}</p>
        <p><strong>WhatsApp:</strong> ${comerciante.whatsapp}</p>
        <p><strong>Email:</strong> ${comerciante.email}</p>
        <p><strong>Horário:</strong> ${comerciante.horario}</p>
      </div>
      <div class="avaliacoes">
        <h3>Avaliações</h3>
        ${comerciante.avaliacoes.map(av => `
          <div class="avaliacao">
            <p><strong>${av.usuario}</strong> (${av.nota}/5)</p>
            <p>${av.comentario}</p>
          </div>
        `).join('')}
      </div>
    `;

    // Renderizar dados do anúncio
    anunciosContainer.innerHTML = `
      <div class="anuncio">
        <img src="${baseURL}${anuncio.capa}" alt="Capa do anúncio" class="capa-anuncio">
        <h3>Categoria: ${anuncio.categoria}</h3>
        <div class="fotos">
          ${anuncio.fotos.map(foto => `<img src="${baseURL}${foto}" alt="Foto do anúncio">`).join('')}
        </div>
        <div class="posts">
          <h3>Posts</h3>
          ${anuncio.posts.map(post => `
            <div class="post">
              <p><strong>${new Date(post.data).toLocaleDateString('pt-BR')}</strong></p>
              <p>${post.texto}</p>
              <img src="${baseURL}${post.imagem}" alt="Imagem do post">
              <p>👍 ${post.likes} | 💬 ${post.comentarios} | 🔁 ${post.compartilhamentos}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    comercianteContainer.innerHTML = '<p>Não foi possível carregar os dados deste comerciante.</p>';
  }
});
