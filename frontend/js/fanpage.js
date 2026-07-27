// frontend/js/fanpage.js

// Função utilitária para formatar telefone e WhatsApp
function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Função para calcular tempo relativo (ex: "há 2 horas", "há 3 dias")
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  const units = [
    { label: 'ano', seconds: 31536000 },
    { label: 'mês', seconds: 2592000 },
    { label: 'dia', seconds: 86400 },
    { label: 'hora', seconds: 3600 },
    { label: 'minuto', seconds: 60 },
  ];
  for (const unit of units) {
    const value = Math.floor(diff / unit.seconds);
    if (value >= 1) {
      return `há ${value} ${unit.label}${value > 1 ? 's' : ''}`;
    }
  }
  return 'agora mesmo';
}

// Função principal para renderizar a fanpage
async function renderFanpage(data) {
  // Capa e informações principais
  document.querySelector('#fanpage-logo').src = data.logo;
  document.querySelector('#fanpage-cover').src = data.capa;
  document.querySelector('#fanpage-nome').textContent = data.nome;
  document.querySelector('#fanpage-categoria').textContent = data.categoria;
  document.querySelector('#fanpage-endereco').textContent = data.endereco;
  document.querySelector('#fanpage-horario').textContent = data.horario;
  document.querySelector('#fanpage-email').textContent = data.email || '—';
  document.querySelector('#fanpage-telefone').textContent = formatPhone(data.telefone);
  document.querySelector('#fanpage-whatsapp').textContent = formatPhone(data.whatsapp);

  // Botões de ação
  document.querySelector('#btn-reservar').href = `tel:${data.telefone}`;
  document.querySelector('#btn-ligar').href = `tel:${data.telefone}`;
  document.querySelector('#btn-whatsapp').href = `https://wa.me/${data.whatsapp.replace(/\D/g, '')}`;

  // Galeria de fotos
  const galeria = document.querySelector('#fanpage-galeria');
  galeria.innerHTML = '';
  data.fotos.forEach(foto => {
    const img = document.createElement('img');
    img.src = foto;
    img.className = 'galeria-item';
    galeria.appendChild(img);
  });

  // Feed de posts
  const feed = document.querySelector('#fanpage-feed');
  feed.innerHTML = '';
  data.posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.innerHTML = `
      <div class="post-header">
        <img src="${data.logo}" class="post-logo" alt="${data.nome}">
        <div>
          <h4>${data.nome}</h4>
          <span>${timeAgo(post.data)}</span>
        </div>
      </div>
      <p>${post.texto}</p>
      <img src="${post.imagem}" class="post-imagem" alt="Post">
      <div class="post-actions">
        <span>❤️ ${post.likes}</span>
        <span>💬 ${post.comentarios}</span>
        <span>🔁 ${post.compartilhamentos}</span>
      </div>
    `;
    feed.appendChild(postEl);
  });

  // Avaliações
  const avaliacoes = document.querySelector('#fanpage-avaliacoes');
  avaliacoes.innerHTML = '';
  data.avaliacoes.forEach(av => {
    const avEl = document.createElement('div');
    avEl.className = 'avaliacao';
    avEl.innerHTML = `
      <strong>${av.usuario}</strong>
      <span>${'⭐'.repeat(av.nota)}</span>
      <p>${av.comentario}</p>
    `;
    avaliacoes.appendChild(avEl);
  });

  // Mapa integrado
  const mapa = document.querySelector('#fanpage-mapa');
  mapa.src = `https://www.google.com/maps?q=${encodeURIComponent(data.endereco)}&output=embed`;
}

// Função para buscar dados da API
async function loadFanpage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    console.error('ID do anunciante não encontrado na URL.');
    return;
  }

  try {
    const [anuncioRes, comercianteRes] = await Promise.all([
      fetch(`/api/anuncios/${id}`),
      fetch(`/api/comerciantes/${id}`)
    ]);
    const anuncio = await anuncioRes.json();
    const comerciante = await comercianteRes.json();

    // Combina dados das duas fontes
    const data = {
      nome: comerciante.nome,
      categoria: anuncio.categoria,
      endereco: comerciante.endereco,
      telefone: comerciante.telefone,
      whatsapp: comerciante.whatsapp,
      email: comerciante.email,
      horario: comerciante.horario,
      capa: anuncio.capa,
      logo: comerciante.logo,
      fotos: anuncio.fotos || [],
      posts: anuncio.posts || [],
      avaliacoes: comerciante.avaliacoes || []
    };

    renderFanpage(data);
  } catch (error) {
    console.error('Erro ao carregar dados da fanpage:', error);
  }
}

// Inicializa ao carregar a página
document.addEventListener('DOMContentLoaded', loadFanpage);
