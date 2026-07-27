/**
 * FANPAGE.JS
 * Carrega dinamicamente os dados do anunciante/comerciante
 * a partir dos parâmetros da URL e das rotas da API.
 */

// ============================================
// CONFIGURAÇÃO
// ============================================
const API_BASE = '/api'; // ajuste se necessário

// ============================================
// HELPERS
// ============================================

/**
 * Extrai parâmetros da URL
 * Ex: fanpage.html?id=123&tipo=anuncio
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get('id'),
    tipo: params.get('tipo') || 'anuncio', // 'anuncio' ou 'comerciante'
    comercianteId: params.get('comercianteId')
  };
}

/**
 * Formata telefone para link WhatsApp
 */
function formatWhatsAppLink(telefone) {
  if (!telefone) return '#';
  const numero = telefone.replace(/\D/g, '');
  return `https://wa.me/55${numero}`;
}

/**
 * Formata telefone para link de ligação
 */
function formatTelLink(telefone) {
  if (!telefone) return '#';
  const numero = telefone.replace(/\D/g, '');
  return `tel:+55${numero}`;
}

/**
 * Formata data relativa (há X dias)
 */
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  return `Há ${Math.floor(diffDays / 30)} meses`;
}

/**
 * Gera URL do Google Maps a partir de endereço
 */
function getMapUrl(endereco) {
  if (!endereco) return '#';
  const encoded = encodeURIComponent(endereco);
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

/**
 * Gera iframe do Google Maps (embed)
 */
function getMapEmbed(endereco) {
  if (!endereco) return '';
  const encoded = encodeURIComponent(endereco);
  return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d0!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0!2s${encoded}!5e0!3m2!1spt-BR!2sbr!4v1`;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza a fanpage completa
 */
function renderFanpage(data) {
  const container = document.getElementById('fanpage-container');
  
  // Determina ícone e cor baseado na categoria
  const categoryConfig = getCategoryConfig(data.categoria);
  
  const html = `
    <!-- Cover -->
    <div class="fanpage-cover" style="background: ${categoryConfig.gradient}">
      ${data.capa ? `<img src="${data.capa}" alt="Capa" class="fanpage-cover-img">` : ''}
      <div class="fanpage-cover-overlay"></div>
      <div class="fanpage-cover-content">
        <div class="fanpage-avatar">
          ${data.logo 
            ? `<img src="${data.logo}" alt="${data.nome}">` 
            : categoryConfig.icon}
        </div>
        <div class="fanpage-title-group">
          <h1 class="fanpage-title">${escapeHtml(data.nome)}</h1>
          <span class="fanpage-category-badge">${escapeHtml(data.categoria || 'Anunciante')}</span>
        </div>
      </div>
    </div>

    <!-- Botões de Ação -->
    <div class="fanpage-actions">
      <button class="fanpage-btn fanpage-btn-primary" onclick="handleReservar('${data.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Reservar
      </button>
      <button class="fanpage-btn" onclick="window.location.href='${formatTelLink(data.telefone)}'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
        Ligar
      </button>
      <button class="fanpage-btn" onclick="window.open('${formatWhatsAppLink(data.whatsapp || data.telefone)}', '_blank')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9Z"/>
        </svg>
        Mensagem
      </button>
    </div>

    <!-- Informações -->
    <div class="fanpage-info">
      ${data.endereco ? `
      <div class="fanpage-info-item">
        <svg class="fanpage-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${escapeHtml(data.endereco)}</span>
      </div>` : ''}
      
      ${data.telefone ? `
      <div class="fanpage-info-item">
        <svg class="fanpage-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
        <a href="${formatTelLink(data.telefone)}">${escapeHtml(data.telefone)}</a>
      </div>` : ''}
      
      ${data.whatsapp ? `
      <div class="fanpage-info-item">
        <svg class="fanpage-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9Z"/>
        </svg>
        <a href="${formatWhatsAppLink(data.whatsapp)}" target="_blank">${escapeHtml(data.whatsapp)} (WhatsApp)</a>
      </div>` : ''}
      
      ${data.email ? `
      <div class="fanpage-info-item">
        <svg class="fanpage-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <a href="mailto:${data.email}">${escapeHtml(data.email)}</a>
      </div>` : ''}
      
      ${data.site ? `
      <div class="fanpage-info-item">
        <svg class="fanpage-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        <a href="${data.site}" target="_blank" rel="noopener">${escapeHtml(data.site)}</a>
      </div>` : ''}

      ${data.endereco ? `
      <div class="fanpage-map">
        <iframe 
          src="${getMapEmbed(data.endereco)}" 
          allowfullscreen="" 
          loading="lazy" 
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </div>` : ''}
    </div>

    <!-- Fotos Destacadas -->
    ${data.fotos && data.fotos.length > 0 ? `
    <div class="fanpage-photos">
      <h2 class="fanpage-section-title">Fotos</h2>
      <div class="fanpage-gallery">
        ${data.fotos.slice(0, 5).map((foto, i) => `
          <div class="fanpage-gallery-item" onclick="openLightbox(${i})">
            <img src="${foto.url || foto}" alt="${foto.legenda || 'Foto'}">
            ${i === 4 && data.fotos.length > 5 ? `<div class="fanpage-gallery-more">+${data.fotos.length - 5}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- Posts Recentes -->
    ${data.posts && data.posts.length > 0 ? `
    <div class="fanpage-posts">
      <h2 class="fanpage-section-title">Posts recentes</h2>
      ${data.posts.map(post => `
        <article class="fanpage-post">
          <div class="fanpage-post-header">
            <div class="fanpage-post-avatar">
              ${data.logo ? `<img src="${data.logo}" alt="">` : categoryConfig.icon}
            </div>
            <div class="fanpage-post-meta">
              <div class="fanpage-post-author">${escapeHtml(data.nome)}</div>
              <div class="fanpage-post-date">${timeAgo(post.data)}</div>
            </div>
          </div>
          <div class="fanpage-post-content">${escapeHtml(post.conteudo)}</div>
          ${post.imagem ? `
          <div class="fanpage-post-image">
            <img src="${post.imagem}" alt="Post">
          </div>` : ''}
          <div class="fanpage-post-actions">
            <span class="fanpage-post-action">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              ${post.curtidas || 0}
            </span>
            <span class="fanpage-post-action">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
              </svg>
              ${post.comentarios || 0}
            </span>
            <span class="fanpage-post-action">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Compartilhar
            </span>
          </div>
        </article>
      `).join('')}
    </div>` : ''}
  `;
  
  container.innerHTML = html;
}

/**
 * Configurações visuais por categoria
 */
function getCategoryConfig(categoria) {
  const configs = {
    'hotel': { 
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', 
      icon: '🏨' 
    },
    'pousada': { 
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
      icon: '🏡' 
    },
    'restaurante': { 
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
      icon: '🍽️' 
    },
    'gastronomia': { 
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
      icon: '🍴' 
    },
    'passeio': { 
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
      icon: '🚶' 
    },
    'passeio turístico': { 
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
      icon: '🗺️' 
    },
    'praia': { 
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', 
      icon: '🏖️' 
    },
    'default': { 
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
      icon: '🏢' 
    }
  };
  
  const key = (categoria || '').toLowerCase().trim();
  return configs[key] || configs['default'];
}

/**
 * Escapa HTML para evitar XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Mostra estado de erro
 */
function showError(message) {
  const container = document.getElementById('fanpage-container');
  container.innerHTML = `
    <div class="fanpage-error">
      <div class="fanpage-error-icon">😕</div>
      <h2>Não foi possível carregar</h2>
      <p>${escapeHtml(message)}</p>
      <button class="fanpage-btn" onclick="location.reload()" style="margin-top: 16px; display: inline-flex; padding: 10px 24px;">
        Tentar novamente
      </button>
    </div>
  `;
}

/**
 * Mostra estado de loading
 */
function showLoading() {
  const container = document.getElementById('fanpage-container');
  container.innerHTML = `
    <div class="fanpage-loading">
      <div class="fanpage-loading-spinner"></div>
      <p>Carregando perfil do anunciante...</p>
    </div>
  `;
}

// ============================================
// AÇÕES DOS BOTÕES
// ============================================

function handleReservar(anuncianteId) {
  // Redireciona para página de reserva ou abre modal
  // Ajuste conforme sua estrutura de reservas
  alert('Sistema de reservas em breve! ID: ' + anuncianteId);
  // window.location.href = `/reservar?id=${anuncianteId}`;
}

function openLightbox(index) {
  // Implementação básica — pode ser expandida com uma lib de lightbox
  console.log('Abrir lightbox na foto:', index);
}

// ============================================
// FETCH DE DADOS
// ============================================

async function carregarFanpage() {
  showLoading();
  
  const params = getUrlParams();
  
  if (!params.id) {
    showError('ID do anunciante não informado na URL.');
    return;
  }
  
  try {
    let data = null;
    
    // ESTRATÉGIA 1: Se tem comercianteId, busca direto em /api/comerciantes
    if (params.comercianteId) {
      const resp = await fetch(`${API_BASE}/comerciantes/${params.comercianteId}`);
      if (!resp.ok) throw new Error('Comerciante não encontrado');
      data = await resp.json();
    }
    // ESTRATÉGIA 2: Busca o anúncio e depois o comerciante associado
    else if (params.tipo === 'anuncio') {
      const respAnuncio = await fetch(`${API_BASE}/anuncios/${params.id}`);
      if (!respAnuncio.ok) throw new Error('Anúncio não encontrado');
      const anuncio = await respAnuncio.json();
      
      // Se o anúncio tem comercianteId, busca os dados completos
      if (anuncio.comercianteId) {
        const respComerciante = await fetch(`${API_BASE}/comerciantes/${anuncio.comercianteId}`);
        if (respComerciante.ok) {
          const comerciante = await respComerciante.json();
          // Merge: prioriza dados do comerciante, mas mantém dados do anúncio se não existirem
          data = { ...anuncio, ...comerciante };
        } else {
          data = anuncio;
        }
      } else {
        data = anuncio;
      }
    }
    // ESTRATÉGIA 3: Busca direto em comerciantes
    else if (params.tipo === 'comerciante') {
      const resp = await fetch(`${API_BASE}/comerciantes/${params.id}`);
      if (!resp.ok) throw new Error('Comerciante não encontrado');
      data = await resp.json();
    }
    
    if (!data) {
      throw new Error('Nenhum dado encontrado para este anunciante.');
    }
    
    renderFanpage(data);
    
  } catch (err) {
    console.error('Erro ao carregar fanpage:', err);
    showError(err.message || 'Erro ao carregar os dados. Tente novamente.');
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', carregarFanpage);
