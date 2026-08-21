(function () {
  const API = window.APP_CONFIG.API_BASE_URL;
  const auth = window.authComerciante;

  const STATUS_LABEL = { ativo: 'Ativo', degustacao: 'Degustacao', expirado: 'Expirado' };
  const PLANO_LABEL = { gratuito: 'Gratuito', basico: 'Basico', premium: 'Premium' };

  function headersAuth() {
    return { Authorization: `Bearer ${auth.getToken()}` };
  }

  async function carregarPainel() {
    const resp = await fetch(`${API}/api/comerciantes/me`, { headers: headersAuth() });
    if (resp.status === 401) {
      window.location.href = 'login-comerciante.html';
      return null;
    }
    return resp.json();
  }

  function renderStats(data) {
    document.getElementById('statPlano').textContent = PLANO_LABEL[data.comerciante.plano] || data.comerciante.plano;
    document.getElementById('statStatus').textContent = STATUS_LABEL[data.comerciante.status] || data.comerciante.status;

    const alertaExpirado = document.getElementById('alertaExpirado');
    const degustacaoWrapper = document.getElementById('statDegustacaoWrapper');

    if (data.comerciante.status === 'expirado') {
      alertaExpirado.style.display = 'block';
    } else {
      alertaExpirado.style.display = 'none';
    }

    if (data.comerciante.status === 'degustacao' && data.degustacao) {
      degustacaoWrapper.style.display = 'block';
      document.getElementById('statDegustacao').textContent = `${data.degustacao.diasRestantes}d ${data.degustacao.horasRestantes}h`;
    } else {
      degustacaoWrapper.style.display = 'none';
    }
  }

  function preencherPerfil(comerciante) {
    document.getElementById('campoNomeNegocio').value = comerciante.nome || '';
    document.getElementById('campoSobre').value = comerciante.descricao || '';
    document.getElementById('campoTelefonePerfil').value = comerciante.telefone || '';
    document.getElementById('campoSite').value = comerciante.site || '';
    document.getElementById('campoHorarioAbertura').value = comerciante.horario_abertura || '';
    document.getElementById('campoHorarioFechamento').value = comerciante.horario_fechamento || '';

    document.getElementById('campoCidade').value = comerciante.cidade || '';
    document.getElementById('campoEndereco').value = comerciante.endereco || '';
    document.getElementById('campoLatitude').value = comerciante.latitude != null ? comerciante.latitude : '';
    document.getElementById('campoLongitude').value = comerciante.longitude != null ? comerciante.longitude : '';

    const selectCategoria = document.getElementById('campoCategoriaPerfil');
    if (comerciante.categoria) selectCategoria.value = comerciante.categoria;

    atualizarPreviewImagem('previewCapa', 'previewCapaVazio', comerciante.banner);
    atualizarPreviewImagem('previewLogo', null, comerciante.logo);
  }

  function atualizarPreviewImagem(idImg, idVazio, src) {
    const img = document.getElementById(idImg);
    const vazio = idVazio ? document.getElementById(idVazio) : null;
    if (src) {
      img.src = src;
      img.style.display = 'block';
      if (vazio) vazio.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (vazio) vazio.style.display = 'flex';
    }
  }

  // Fase 5: mapa clicavel para marcar a localizacao do negocio, no lugar de
  // exigir que o comerciante digite latitude/longitude manualmente (o campo
  // continua existindo, pro caso de quem prefere colar as coordenadas do
  // Google Maps direto - as duas formas ficam sincronizadas).
  const COORDS_PADRAO_PORTO_DE_GALINHAS = [-8.5083, -35.0067];
  let mapaLocalizacao = null;
  let marcadorLocalizacao = null;

  function coordenadaValida(valor) {
    return typeof valor === 'number' && !Number.isNaN(valor);
  }

  function lerCoordenadasDosCampos() {
    const lat = parseFloat((document.getElementById('campoLatitude').value || '').trim().replace(',', '.'));
    const lon = parseFloat((document.getElementById('campoLongitude').value || '').trim().replace(',', '.'));
    return { lat, lon };
  }

  function marcarLocalizacao(lat, lon, opts) {
    document.getElementById('campoLatitude').value = lat.toFixed(6);
    document.getElementById('campoLongitude').value = lon.toFixed(6);

    if (!mapaLocalizacao) return;

    if (marcadorLocalizacao) {
      marcadorLocalizacao.setLatLng([lat, lon]);
    } else {
      marcadorLocalizacao = L.marker([lat, lon], { draggable: true }).addTo(mapaLocalizacao);
      marcadorLocalizacao.on('dragend', () => {
        const pos = marcadorLocalizacao.getLatLng();
        marcarLocalizacao(pos.lat, pos.lng);
      });
    }

    if (opts && opts.centralizar) {
      mapaLocalizacao.setView([lat, lon], Math.max(mapaLocalizacao.getZoom(), 15));
    }
  }

  // Chamada de forma preguicosa (so na primeira vez que a aba "Perfil do
  // Negocio" e aberta) porque o Leaflet precisa que o container do mapa ja
  // esteja visivel (com largura/altura reais) pra desenhar os tiles direito.
  function initMapaLocalizacao() {
    if (mapaLocalizacao || typeof L === 'undefined') return;

    const { lat, lon } = lerCoordenadasDosCampos();
    const temCoordenadas = coordenadaValida(lat) && coordenadaValida(lon);
    const centroInicial = temCoordenadas ? [lat, lon] : COORDS_PADRAO_PORTO_DE_GALINHAS;

    mapaLocalizacao = L.map('mapaLocalizacao').setView(centroInicial, temCoordenadas ? 16 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapaLocalizacao);

    if (temCoordenadas) {
      marcarLocalizacao(lat, lon);
    }

    mapaLocalizacao.on('click', (e) => {
      marcarLocalizacao(e.latlng.lat, e.latlng.lng);
    });
  }

  // Mantem o mapa sincronizado quando o comerciante prefere colar as
  // coordenadas direto do Google Maps em vez de clicar.
  function initSincroniaCamposLocalizacao() {
    ['campoLatitude', 'campoLongitude'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => {
        if (!mapaLocalizacao) return;
        const { lat, lon } = lerCoordenadasDosCampos();
        if (coordenadaValida(lat) && coordenadaValida(lon)) {
          marcarLocalizacao(lat, lon, { centralizar: true });
        }
      });
    });
  }

  async function carregarCategoriasPerfil() {
    const select = document.getElementById('campoCategoriaPerfil');
    const resp = await fetch(`${API}/api/categorias`);
    const categorias = await resp.json();
    select.innerHTML = '<option value="">Selecione uma categoria</option>' +
      categorias.map((c) => `<option value="${c.nome}">${c.nome}</option>`).join('');
  }

  function initFormPerfil() {
    const form = document.getElementById('formPerfil');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('mensagemPerfil');

      const nome = document.getElementById('campoNomeNegocio').value.trim();
      const categoria = document.getElementById('campoCategoriaPerfil').value;
      const descricao = document.getElementById('campoSobre').value.trim();
      const telefone = document.getElementById('campoTelefonePerfil').value.trim();
      const site = document.getElementById('campoSite').value.trim();
      const horario_abertura = document.getElementById('campoHorarioAbertura').value;
      const horario_fechamento = document.getElementById('campoHorarioFechamento').value;
      const cidade = document.getElementById('campoCidade').value.trim();
      const endereco = document.getElementById('campoEndereco').value.trim();
      const latStr = document.getElementById('campoLatitude').value.trim();
      const lonStr = document.getElementById('campoLongitude').value.trim();
      const latitude = latStr ? parseFloat(latStr.replace(',', '.')) : null;
      const longitude = lonStr ? parseFloat(lonStr.replace(',', '.')) : null;

      const resp = await fetch(`${API}/api/comerciantes/me`, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headersAuth()),
        body: JSON.stringify({
          nome, categoria, descricao, telefone, site,
          horario_abertura, horario_fechamento,
          cidade, endereco, latitude, longitude,
        }),
      });

      msg.style.display = 'block';
      if (resp.ok) {
        msg.textContent = 'Perfil salvo com sucesso!';
        msg.style.color = 'var(--verde-escuro)';
      } else {
        msg.textContent = 'Erro ao salvar. Tente novamente.';
        msg.style.color = '#a12a2a';
      }
      setTimeout(() => { msg.style.display = 'none'; }, 4000);
    });
  }

  // Fase 2: envia o resultado ja recortado (um Blob vindo do canvas do
  // cropper) em vez do arquivo original - o usuario ja escolheu exatamente
  // qual parte da imagem quer mostrar, entao o servidor recebe a imagem
  // pronta no formato certo (4:1 pra capa, quadrada pra logo).
  async function enviarImagemRecortada(blob, botao, idImg, idVazio, endpoint, campoArquivo) {
    const msg = document.getElementById('mensagemFoto');
    const formData = new FormData();
    formData.append(campoArquivo, blob, campoArquivo === 'foto' ? 'foto-perfil.jpg' : 'capa.jpg');

    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = 'Enviando...';

    try {
      const resp = await fetch(`${API}${endpoint}`, {
        method: 'PUT',
        headers: headersAuth(),
        body: formData,
      });
      const data = await resp.json();

      msg.style.display = 'block';
      if (resp.ok) {
        atualizarPreviewImagem(idImg, idVazio, campoArquivo === 'foto' ? data.comerciante.logo : data.comerciante.banner);
        msg.textContent = 'Imagem atualizada com sucesso!';
        msg.style.color = 'var(--verde-escuro)';
      } else {
        msg.textContent = data.erro || 'Erro ao enviar imagem. Tente novamente.';
        msg.style.color = '#a12a2a';
      }
      setTimeout(() => { msg.style.display = 'none'; }, 4000);
    } catch (err) {
      console.error(err);
      msg.style.display = 'block';
      msg.textContent = 'Erro ao enviar imagem. Verifique sua conexao.';
      msg.style.color = '#a12a2a';
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }

  function initUploadFoto(idBotao, idInput, idImg, idVazio, endpoint, campoArquivo) {
    const botao = document.getElementById(idBotao);
    const input = document.getElementById(idInput);
    const tipo = campoArquivo === 'foto' ? 'logo' : 'capa';

    botao.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      if (!input.files || !input.files[0]) return;
      const arquivo = input.files[0];

      abrirCropModal(arquivo, tipo, async (blob) => {
        await enviarImagemRecortada(blob, botao, idImg, idVazio, endpoint, campoArquivo);
        input.value = '';
      }, () => { input.value = ''; });
    });
  }

  // ===== Fase 2: cropper de capa/logo (arrastar + zoom antes de enviar) =====
  // Sem biblioteca externa: a imagem fica posicionada de forma absoluta
  // dentro de uma janela com overflow:hidden (o "viewport"), o usuario
  // arrasta e ajusta o zoom, e no "Aplicar" desenhamos so a regiao visivel
  // num canvas do tamanho final (1600x400 pra capa, 800x800 pra logo).
  const cropState = {
    naturalW: 0, naturalH: 0, viewportW: 0, viewportH: 0,
    scale: 1, minScale: 1, offsetX: 0, offsetY: 0,
    arrastando: false, inicioX: 0, inicioY: 0, inicioOffsetX: 0, inicioOffsetY: 0,
    tipo: 'capa', onConfirm: null, onCancel: null,
  };

  function abrirCropModal(arquivo, tipo, onConfirm, onCancel) {
    const modal = document.getElementById('modalCrop');
    const viewport = document.getElementById('cropViewport');
    const img = document.getElementById('cropImg');
    const zoom = document.getElementById('cropZoom');
    const titulo = document.getElementById('tituloCrop');

    cropState.tipo = tipo;
    cropState.onConfirm = onConfirm;
    cropState.onCancel = onCancel;

    const larguraDisponivel = Math.min(440, window.innerWidth - 80);
    if (tipo === 'capa') {
      cropState.viewportW = larguraDisponivel;
      cropState.viewportH = Math.round(larguraDisponivel / 4);
      viewport.style.borderRadius = '8px';
      titulo.textContent = 'Ajustar capa';
    } else {
      cropState.viewportW = Math.min(260, larguraDisponivel);
      cropState.viewportH = cropState.viewportW;
      viewport.style.borderRadius = '50%';
      titulo.textContent = 'Ajustar foto de perfil';
    }
    viewport.style.width = cropState.viewportW + 'px';
    viewport.style.height = cropState.viewportH + 'px';

    const leitor = new FileReader();
    leitor.onload = () => {
      img.src = leitor.result;
      img.onload = () => {
        cropState.naturalW = img.naturalWidth;
        cropState.naturalH = img.naturalHeight;
        cropState.minScale = Math.max(cropState.viewportW / cropState.naturalW, cropState.viewportH / cropState.naturalH);
        cropState.scale = cropState.minScale;
        cropState.offsetX = (cropState.viewportW - cropState.naturalW * cropState.scale) / 2;
        cropState.offsetY = (cropState.viewportH - cropState.naturalH * cropState.scale) / 2;
        zoom.value = 100;
        renderizarCrop();
        modal.style.display = 'flex';
      };
    };
    leitor.readAsDataURL(arquivo);
  }

  function clampOffsetsCrop() {
    const largImg = cropState.naturalW * cropState.scale;
    const altImg = cropState.naturalH * cropState.scale;
    const minX = Math.min(0, cropState.viewportW - largImg);
    const minY = Math.min(0, cropState.viewportH - altImg);
    cropState.offsetX = Math.min(0, Math.max(minX, cropState.offsetX));
    cropState.offsetY = Math.min(0, Math.max(minY, cropState.offsetY));
  }

  function renderizarCrop() {
    const img = document.getElementById('cropImg');
    img.style.width = (cropState.naturalW * cropState.scale) + 'px';
    img.style.height = (cropState.naturalH * cropState.scale) + 'px';
    img.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`;
  }

  function fecharCropModal() {
    document.getElementById('modalCrop').style.display = 'none';
  }

  function initCropModal() {
    const modal = document.getElementById('modalCrop');
    const viewport = document.getElementById('cropViewport');
    const zoom = document.getElementById('cropZoom');

    viewport.addEventListener('pointerdown', (e) => {
      cropState.arrastando = true;
      cropState.inicioX = e.clientX;
      cropState.inicioY = e.clientY;
      cropState.inicioOffsetX = cropState.offsetX;
      cropState.inicioOffsetY = cropState.offsetY;
      viewport.setPointerCapture(e.pointerId);
      viewport.style.cursor = 'grabbing';
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!cropState.arrastando) return;
      cropState.offsetX = cropState.inicioOffsetX + (e.clientX - cropState.inicioX);
      cropState.offsetY = cropState.inicioOffsetY + (e.clientY - cropState.inicioY);
      clampOffsetsCrop();
      renderizarCrop();
    });
    const pararArrasto = () => { cropState.arrastando = false; viewport.style.cursor = 'grab'; };
    viewport.addEventListener('pointerup', pararArrasto);
    viewport.addEventListener('pointerleave', pararArrasto);

    zoom.addEventListener('input', () => {
      const centroX = cropState.viewportW / 2;
      const centroY = cropState.viewportH / 2;
      // Mantem o ponto central do viewport fixo na imagem ao mudar o zoom,
      // em vez de reancorar no canto (0,0), que faria a imagem "pular".
      const pontoImgX = (centroX - cropState.offsetX) / cropState.scale;
      const pontoImgY = (centroY - cropState.offsetY) / cropState.scale;
      cropState.scale = cropState.minScale * (zoom.value / 100);
      cropState.offsetX = centroX - pontoImgX * cropState.scale;
      cropState.offsetY = centroY - pontoImgY * cropState.scale;
      clampOffsetsCrop();
      renderizarCrop();
    });

    document.getElementById('btnCropCancelar').addEventListener('click', () => {
      fecharCropModal();
      if (cropState.onCancel) cropState.onCancel();
    });

    document.getElementById('btnCropAplicar').addEventListener('click', () => {
      const outW = cropState.tipo === 'capa' ? 1600 : 800;
      const outH = cropState.tipo === 'capa' ? 400 : 800;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      const sx = -cropState.offsetX / cropState.scale;
      const sy = -cropState.offsetY / cropState.scale;
      const sw = cropState.viewportW / cropState.scale;
      const sh = cropState.viewportH / cropState.scale;
      ctx.drawImage(document.getElementById('cropImg'), sx, sy, sw, sh, 0, 0, outW, outH);

      canvas.toBlob((blob) => {
        fecharCropModal();
        if (cropState.onConfirm && blob) cropState.onConfirm(blob);
      }, 'image/jpeg', 0.9);
    });
  }

  function initUploadsPerfil() {
    initUploadFoto('btnAlterarCapa', 'inputCapa', 'previewCapa', 'previewCapaVazio', '/api/comerciantes/me/banner', 'banner');
    initUploadFoto('btnAlterarLogo', 'inputLogo', 'previewLogo', null, '/api/comerciantes/me/foto', 'foto');
  }

  async function carregarCategorias() {
    const select = document.getElementById('campoCategoria');
    const resp = await fetch(`${API}/api/categorias`);
    const categorias = await resp.json();
    select.innerHTML = categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
  }

  async function carregarMeusAnuncios() {
    const resp = await fetch(`${API}/api/anuncios/meus/lista`, { headers: headersAuth() });
    const anuncios = await resp.json();
    const lista = document.getElementById('listaMeusAnuncios');

    if (anuncios.length === 0) {
      lista.innerHTML = '<p>Voce ainda nao possui anuncios cadastrados.</p>';
      return;
    }

    lista.innerHTML = anuncios
      .map(
        (a) => `
      <div class="anuncio-card">
        <h3>${a.titulo}</h3>
        <p>${a.descricao || ''}</p>
        <div class="anuncio-card__tags">${a.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="btn btn--laranja" data-editar="${a.id}" data-i18n="painel.editar">Editar</button>
          <button class="btn btn--vermelho" data-excluir="${a.id}" data-i18n="painel.excluir">Excluir</button>
        </div>
      </div>`
      )
      .join('');

    lista.querySelectorAll('[data-editar]').forEach((btn) => {
      btn.addEventListener('click', () => iniciarEdicao(anuncios.find((a) => a.id == btn.dataset.editar)));
    });
    lista.querySelectorAll('[data-excluir]').forEach((btn) => {
      btn.addEventListener('click', () => excluirAnuncio(btn.dataset.excluir));
    });
  }

  function iniciarEdicao(anuncio) {
    document.getElementById('anuncioId').value = anuncio.id;
    document.getElementById('campoTitulo').value = anuncio.titulo;
    document.getElementById('campoDescricao').value = anuncio.descricao || '';
    document.getElementById('campoCategoria').value = anuncio.categoria_id || '';
    document.getElementById('campoTags').value = (anuncio.tags || []).join(', ');
    // Publicacoes existentes de video (sem fotos) reabrem no modo Video, o resto
    // reabre no modo Foto - so afeta qual campo de upload fica visivel, o
    // conteudo ja enviado nao muda so por reabrir o formulario.
    const temVideo = (anuncio.videos || []).length > 0 && (anuncio.fotos || []).length === 0;
    setTipoMidia(temVideo ? 'video' : 'foto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Alterna entre "Foto" e "Video" no composer de publicacoes (estilo Facebook:
  // voce escolhe o tipo de midia antes de postar). So o campo de upload
  // correspondente fica visivel, e o outro e limpo pra nao mandar arquivo do
  // tipo errado junto por engano.
  function setTipoMidia(tipo) {
    const btnFoto = document.getElementById('btnTipoFoto');
    const btnVideo = document.getElementById('btnTipoVideo');
    const grupoFotos = document.getElementById('grupoCampoFotos');
    const grupoVideos = document.getElementById('grupoCampoVideos');
    const campoFotos = document.getElementById('campoFotos');
    const campoVideos = document.getElementById('campoVideos');

    const ativo = { border: '2px solid var(--azul-primario)', background: 'var(--azul-primario)', color: '#fff' };
    const inativo = { border: '2px solid #ccc', background: '#fff', color: '#333' };

    if (tipo === 'video') {
      Object.assign(btnVideo.style, ativo);
      Object.assign(btnFoto.style, inativo);
      grupoVideos.style.display = 'block';
      grupoFotos.style.display = 'none';
      campoFotos.value = '';
    } else {
      Object.assign(btnFoto.style, ativo);
      Object.assign(btnVideo.style, inativo);
      grupoFotos.style.display = 'block';
      grupoVideos.style.display = 'none';
      campoVideos.value = '';
    }
  }

  function initTipoMidia() {
    document.getElementById('btnTipoFoto').addEventListener('click', () => setTipoMidia('foto'));
    document.getElementById('btnTipoVideo').addEventListener('click', () => setTipoMidia('video'));
  }

  async function excluirAnuncio(id) {
    if (!confirm('Deseja realmente excluir este anuncio?')) return;
    await fetch(`${API}/api/anuncios/${id}`, { method: 'DELETE', headers: headersAuth() });
    carregarMeusAnuncios();
  }

  function initFormAnuncio() {
    const form = document.getElementById('formAnuncio');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('anuncioId').value;
      const formData = new FormData();
      formData.append('titulo', document.getElementById('campoTitulo').value);
      formData.append('descricao', document.getElementById('campoDescricao').value);
      formData.append('categoria_id', document.getElementById('campoCategoria').value);
      formData.append('tags', document.getElementById('campoTags').value);

      const fotosInput = document.getElementById('campoFotos');
      const videosInput = document.getElementById('campoVideos');

      if (fotosInput.files.length > 25) {
        alert('Voce pode enviar no maximo 25 fotos por anuncio.');
        return;
      }
      if (videosInput.files.length > 25) {
        alert('Voce pode enviar no maximo 25 videos por anuncio.');
        return;
      }

      Array.from(fotosInput.files).forEach((file) => formData.append('fotos', file));
      Array.from(videosInput.files).forEach((file) => formData.append('videos', file));

      const url = id ? `${API}/api/anuncios/${id}` : `${API}/api/anuncios`;
      const method = id ? 'PUT' : 'POST';

      await fetch(url, { method, headers: headersAuth(), body: formData });

      form.reset();
      document.getElementById('anuncioId').value = '';
      setTipoMidia('foto');
      carregarMeusAnuncios();
    });

    document.getElementById('btnCancelarEdicao').addEventListener('click', () => {
      form.reset();
      document.getElementById('anuncioId').value = '';
      setTipoMidia('foto');
    });
  }

  function initTabs() {
    document.querySelectorAll('.tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        const tab = btn.dataset.tab;
        document.getElementById('tabAnuncios').style.display = tab === 'anuncios' ? 'block' : 'none';
        document.getElementById('tabPerfil').style.display = tab === 'perfil' ? 'block' : 'none';
        document.getElementById('tabPlanos').style.display = tab === 'planos' ? 'block' : 'none';

        // O mapa so pode ser criado/redimensionado com o container ja
        // visivel - por isso o pequeno atraso, so na aba Perfil.
        if (tab === 'perfil') {
          setTimeout(() => {
            initMapaLocalizacao();
            if (mapaLocalizacao) mapaLocalizacao.invalidateSize();
          }, 50);
        }
      });
    });
  }

  async function carregarPlanos(idComerciante) {
    const resp = await fetch(`${API}/api/pagamentos/planos`);
    const planos = await resp.json();
    const grid = document.getElementById('planosGrid');

    grid.innerHTML = planos
      .filter((p) => p.id !== 'turista')
      .map(
        (p) => `
      <div class="plano-card">
        <h3>${p.nome}</h3>
        <div class="preco">R$ ${p.valor.toFixed(2)}<small style="font-size:0.9rem;" data-i18n="planos.mes">/mes</small></div>
        <p>${p.descricao}</p>
        <button class="btn btn--verde" data-plano="${p.id}" style="width:100%;">Assinar</button>
      </div>`
      )
      .join('');

    grid.querySelectorAll('[data-plano]').forEach((btn) => {
      btn.addEventListener('click', () => iniciarCheckout(btn.dataset.plano, idComerciante));
    });
  }

  async function iniciarCheckout(tipoPlano, idComerciante) {
    const resp = await fetch(`${API}/api/pagamentos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_plano: tipoPlano, id_comerciante: idComerciante }),
    });
    const data = await resp.json();

    if (data.simulado) {
      alert('MP_ACCESS_TOKEN nao configurado. Simulando checkout de teste.');
      window.location.href = data.init_point;
      return;
    }

    window.location.href = data.init_point;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.getToken()) {
      window.location.href = 'login-comerciante.html';
      return;
    }

    document.getElementById('btnSair').addEventListener('click', () => {
      auth.logout();
      window.location.href = '../index.html';
    });

    const data = await carregarPainel();
    if (!data) return;

    renderStats(data);
    preencherPerfil(data.comerciante);
    initFormPerfil();
    initSincroniaCamposLocalizacao();
    await carregarCategoriasPerfil();
    initCropModal();
    initUploadsPerfil();
    await carregarCategorias();
    await carregarMeusAnuncios();
    initTipoMidia();
    initFormAnuncio();
    initTabs();
    await carregarPlanos(data.comerciante.id);

    if (window.i18nPortal) window.i18nPortal.init();
  });
})();
