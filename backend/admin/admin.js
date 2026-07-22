(function () {
  'use strict';

  console.log('[ADMIN] admin.js iniciado');

  // =========================================================
  // CONFIGURAÇÃO
  // =========================================================

  const API = window.location.origin;
  const TOKEN_KEY = 'portal_admin_token';

  // =========================================================
  // AUXILIARES
  // =========================================================

  function escapeHtml(valor) {
    if (valor === null || valor === undefined) {
      return '';
    }

    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function salvarToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removerToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function mostrarErro(elemento, mensagem) {
    if (elemento) {
      elemento.textContent = mensagem || '';
    }
  }

  // =========================================================
  // ELEMENTOS
  // =========================================================

  const telaLogin =
    document.getElementById('telaLogin');

  const telaAdmin =
    document.getElementById('telaAdmin');

  const formLogin =
    document.getElementById('formLogin');

  const erroLogin =
    document.getElementById('erroLogin');

  const btnSair =
    document.getElementById('btnSair');

  const blogEditor =
    document.getElementById('blogConteudo');

  const btnSalvarArtigo =
    document.getElementById('btnSalvarArtigo');

  const erroBlog =
    document.getElementById('erroBlog');

  const editorContextMenu =
    document.getElementById('editorContextMenu');

  // =========================================================
  // CONTROLE DE EDIÇÃO DO BLOG
  // =========================================================

  let artigoEmEdicaoId = null;

  // =========================================================
  // LOGIN / LOGOUT
  // =========================================================

  function mostrarLogin() {
    if (telaLogin) {
      telaLogin.classList.remove('escondido');
    }

    if (telaAdmin) {
      telaAdmin.classList.add('escondido');
    }
  }

  async function mostrarAdmin() {
    if (telaLogin) {
      telaLogin.classList.add('escondido');
    }

    if (telaAdmin) {
      telaAdmin.classList.remove('escondido');
    }

    try {
      await carregarPendentes();
      await carregarTodos();
      await carregarCategorias();
      await carregarArtigos();
    } catch (erro) {
      console.error(
        '[ADMIN] Erro ao carregar painel:',
        erro
      );
    }
  }

  // =========================================================
  // API
  // =========================================================

  async function apiFetch(url, options = {}) {
    const token = getToken();

    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization =
        'Bearer ' + token;
    }

    console.log(
      '[API]',
      options.method || 'GET',
      url
    );

    const resposta =
      await fetch(
        API + url,
        {
          ...options,
          headers
        }
      );

    let data = {};

    const texto =
      await resposta.text();

    if (texto) {
      try {
        data = JSON.parse(texto);
      } catch (erro) {
        data = {
          mensagem: texto
        };
      }
    }

    console.log(
      '[API RESPONSE]',
      resposta.status,
      data
    );

    if (
      resposta.status === 401 ||
      resposta.status === 403
    ) {
      removerToken();
      mostrarLogin();

      throw new Error(
        data.erro ||
        data.error ||
        'Sessão expirada.'
      );
    }

    if (!resposta.ok) {
      throw new Error(
        data.erro ||
        data.error ||
        data.mensagem ||
        `Erro HTTP ${resposta.status}`
      );
    }

    return data;
  }

  // =========================================================
  // LOGIN
  // =========================================================

  if (formLogin) {
    formLogin.addEventListener(
      'submit',
      async function (event) {
        event.preventDefault();

        mostrarErro(
          erroLogin,
          ''
        );

        const campoUsuario =
          document.getElementById('usuario');

        const campoSenha =
          document.getElementById('senha');

        const usuario =
          campoUsuario
            ? campoUsuario.value.trim()
            : '';

        const senha =
          campoSenha
            ? campoSenha.value
            : '';

        if (!usuario || !senha) {
          mostrarErro(
            erroLogin,
            'Digite usuário e senha.'
          );

          return;
        }

        try {
          const resposta =
            await fetch(
              API + '/api/login',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({
                    usuario,
                    senha
                  })
              }
            );

          const data =
            await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              data.erro ||
              'Usuário ou senha inválidos.'
            );
          }

          if (!data.token) {
            throw new Error(
              'O servidor não retornou o token.'
            );
          }

          salvarToken(
            data.token
          );

          await mostrarAdmin();

        } catch (erro) {
          console.error(
            '[LOGIN ERROR]',
            erro
          );

          mostrarErro(
            erroLogin,
            erro.message
          );
        }
      }
    );
  }

  // =========================================================
  // SAIR
  // =========================================================

  if (btnSair) {
    btnSair.addEventListener(
      'click',
      function () {
        removerToken();
        mostrarLogin();
      }
    );
  }

  // =========================================================
  // ABAS
  // =========================================================

  document
    .querySelectorAll('.tabs button')
    .forEach(
      function (botao) {
        botao.addEventListener(
          'click',
          async function () {

            document
              .querySelectorAll('.tabs button')
              .forEach(
                function (b) {
                  b.classList.remove('ativa');
                }
              );

            botao.classList.add('ativa');

            document
              .querySelectorAll('main section')
              .forEach(
                function (section) {
                  section.classList.add('escondido');
                }
              );

            const nomeTab =
              botao.dataset.tab;

            const idTab =
              'tab' +
              nomeTab.charAt(0).toUpperCase() +
              nomeTab.slice(1);

            const tab =
              document.getElementById(idTab);

            if (tab) {
              tab.classList.remove('escondido');
            }

            if (nomeTab === 'pendentes') {
              await carregarPendentes();
            }

            if (nomeTab === 'todos') {
              await carregarTodos();
            }

            if (nomeTab === 'categorias') {
              await carregarCategorias();
            }

            if (nomeTab === 'blog') {
              await carregarArtigos();
            }
          }
        );
      }
    );

  // =========================================================
  // ANÚNCIOS PENDENTES
  // =========================================================

  async function carregarPendentes() {
    const container =
      document.getElementById(
        'listaPendentes'
      );

    if (!container) {
      return;
    }

    try {
      const anuncios =
        await apiFetch(
          '/api/admin/anuncios'
        );

      if (
        !Array.isArray(anuncios) ||
        anuncios.length === 0
      ) {
        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;
      }

      container.innerHTML =
        anuncios.map(
          function (anuncio) {
            return `
              <div
                style="
                  padding:15px;
                  border-bottom:1px solid #ddd;
                "
              >

                <strong>
                  ${escapeHtml(anuncio.titulo || '')}
                </strong>

                <br><br>

                Status:
                ${escapeHtml(anuncio.status || '-')}

                <br><br>

                <button
                  type="button"
                  class="btn btn--aprovar"
                  data-acao="aprovar"
                  data-id="${escapeHtml(anuncio.id)}"
                >
                  Aprovar
                </button>

                <button
                  type="button"
                  class="btn btn--rejeitar"
                  data-acao="rejeitar"
                  data-id="${escapeHtml(anuncio.id)}"
                >
                  Rejeitar
                </button>

              </div>
            `;
          }
        ).join('');

      container
        .querySelectorAll('[data-acao]')
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.id;

                const acao =
                  botao.dataset.acao;

                try {

                  botao.disabled = true;

                  await apiFetch(
                    `/api/admin/anuncios/${id}/${acao}`,
                    {
                      method: 'PUT'
                    }
                  );

                  await carregarPendentes();
                  await carregarTodos();

                } catch (erro) {

                  alert(
                    erro.message
                  );

                  botao.disabled = false;
                }
              }
            );
          }
        );

    } catch (erro) {

      console.error(
        erro
      );

      container.innerHTML =
        `<p class="erro">
          ${escapeHtml(erro.message)}
        </p>`;
    }
  }

  // =========================================================
  // TODOS OS ANÚNCIOS
  // =========================================================

  async function carregarTodos() {
    const tbody =
      document.getElementById(
        'listaTodos'
      );

    if (!tbody) {
      return;
    }

    try {

      const anuncios =
        await apiFetch(
          '/api/admin/anuncios/todos'
        );

      if (
        !Array.isArray(anuncios) ||
        anuncios.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

        return;
      }

      tbody.innerHTML =
        anuncios.map(
          function (anuncio) {

            return `
              <tr>

                <td>
                  ${escapeHtml(anuncio.id)}
                </td>

                <td>
                  ${escapeHtml(anuncio.titulo || '')}
                </td>

                <td>
                  ${escapeHtml(anuncio.status || '')}
                </td>

                <td>
                  ${escapeHtml(anuncio.latitude ?? '-')}
                  ,
                  ${escapeHtml(anuncio.longitude ?? '-')}
                </td>

                <td>

                  <button
                    type="button"
                    class="btn btn--excluir"
                    data-id="${escapeHtml(anuncio.id)}"
                  >
                    Excluir
                  </button>

                </td>

              </tr>
            `;
          }
        ).join('');

      tbody
        .querySelectorAll('.btn--excluir')
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                if (
                  !confirm(
                    'Excluir este anúncio?'
                  )
                ) {
                  return;
                }

                try {

                  botao.disabled = true;

                  await apiFetch(
                    `/api/admin/anuncios/${botao.dataset.id}`,
                    {
                      method: 'DELETE'
                    }
                  );

                  await carregarTodos();
                  await carregarPendentes();

                } catch (erro) {

                  alert(
                    erro.message
                  );

                  botao.disabled = false;
                }
              }
            );
          }
        );

    } catch (erro) {

      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            ${escapeHtml(erro.message)}
          </td>
        </tr>`;
    }
  }

  // =========================================================
  // CATEGORIAS
  // =========================================================

  async function carregarCategorias() {
    const tbody =
      document.getElementById(
        'listaCategorias'
      );

    if (!tbody) {
      return;
    }

    try {

      const categorias =
        await apiFetch(
          '/api/admin/categorias'
        );

      if (
        !Array.isArray(categorias) ||
        categorias.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

        return;
      }

      tbody.innerHTML =
        categorias.map(
          function (categoria) {

            return `
              <tr>

                <td>
                  ${escapeHtml(categoria.id)}
                </td>

                <td>
                  ${escapeHtml(categoria.nome || '')}
                </td>

                <td>
                  ${escapeHtml(categoria.icone_url || '-')}
                </td>

                <td>
                  ${escapeHtml(categoria.slug || '-')}
                </td>

                <td>

                  <button
                    type="button"
                    class="btn btn--excluir"
                    data-id="${escapeHtml(categoria.id)}"
                  >
                    Excluir
                  </button>

                </td>

              </tr>
            `;
          }
        ).join('');

      tbody
        .querySelectorAll('.btn--excluir')
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                if (
                  !confirm(
                    'Excluir esta categoria?'
                  )
                ) {
                  return;
                }

                try {

                  await apiFetch(
                    `/api/admin/categorias/${botao.dataset.id}`,
                    {
                      method: 'DELETE'
                    }
                  );

                  await carregarCategorias();

                } catch (erro) {

                  alert(
                    erro.message
                  );
                }
              }
            );
          }
        );

    } catch (erro) {

      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            ${escapeHtml(erro.message)}
          </td>
        </tr>`;
    }
  }

  // =========================================================
  // ADICIONAR CATEGORIA
  // =========================================================

  const btnAddCategoria =
    document.getElementById(
      'btnAddCategoria'
    );

  if (btnAddCategoria) {

    btnAddCategoria.addEventListener(
      'click',
      async function () {

        const campoNome =
          document.getElementById(
            'novaCategoriaNome'
          );

        const campoIcone =
          document.getElementById(
            'novaCategoriaIcone'
          );

        const nome =
          campoNome
            ? campoNome.value.trim()
            : '';

        const icone_url =
          campoIcone
            ? campoIcone.value.trim()
            : '';

        if (!nome) {

          alert(
            'Digite o nome da categoria.'
          );

          return;
        }

        try {

          btnAddCategoria.disabled = true;

          await apiFetch(
            '/api/admin/categorias',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  nome,
                  icone_url
                })
            }
          );

          campoNome.value = '';
          campoIcone.value = '';

          await carregarCategorias();

        } catch (erro) {

          alert(
            erro.message
          );

        } finally {

          btnAddCategoria.disabled = false;
        }
      }
    );
  }

  // =========================================================
  // EDITOR DO BLOG
  // =========================================================

  let ultimaSelecao = null;

  function editorEstaAtivo() {
    return (
      blogEditor &&
      document.activeElement === blogEditor
    );
  }

  function salvarSelecao() {

    if (!blogEditor) {
      return;
    }

    const selecao =
      window.getSelection();

    if (
      selecao &&
      selecao.rangeCount > 0 &&
      blogEditor.contains(
        selecao.anchorNode
      )
    ) {

      ultimaSelecao =
        selecao
          .getRangeAt(0)
          .cloneRange();
    }
  }

  function restaurarSelecao() {

    if (!ultimaSelecao) {
      return;
    }

    try {

      const selecao =
        window.getSelection();

      selecao.removeAllRanges();

      selecao.addRange(
        ultimaSelecao
      );

    } catch (erro) {

      console.warn(
        '[EDITOR] Não foi possível restaurar seleção.',
        erro
      );
    }
  }

  function focarEditor() {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();
  }

  function comandoEditor(
    comando,
    valor = null
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    focarEditor();

    try {

      document.execCommand(
        comando,
        false,
        valor
      );

      salvarSelecao();

    } catch (erro) {

      console.error(
        '[EDITOR]',
        erro
      );
    }
  }

  function formatar(tipo) {

    restaurarSelecao();

    focarEditor();

    try {

      document.execCommand(
        'formatBlock',
        false,
        tipo
      );

      salvarSelecao();

    } catch (erro) {

      console.error(
        '[EDITOR FORMAT]',
        erro
      );
    }
  }

  // =========================================================
  // TAMANHO DO TEXTO
  // =========================================================

  function alterarTamanhoTexto(tamanho) {

    restaurarSelecao();

    focarEditor();

    try {

      document.execCommand(
        'fontSize',
        false,
        String(tamanho)
      );

      salvarSelecao();

    } catch (erro) {

      console.error(
        '[EDITOR FONT SIZE]',
        erro
      );
    }
  }

  // =========================================================
  // IMAGENS
  // =========================================================

  const inputImagem =
    document.createElement('input');

  inputImagem.type =
    'file';

  inputImagem.accept =
    'image/*';

  inputImagem.multiple =
    true;

  inputImagem.style.display =
    'none';

  document.body.appendChild(
    inputImagem
  );

  function inserirImagem(
    src,
    alt
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    focarEditor();

    const imagem =
      document.createElement('img');

    imagem.src =
      src;

    imagem.alt =
      alt || 'Imagem do artigo';

    imagem.className =
      'editor-imagem';

    imagem.style.maxWidth =
      '100%';

    imagem.style.width =
      'auto';

    imagem.style.height =
      'auto';

    imagem.style.display =
      'block';

    imagem.style.margin =
      '15px 0';

    const selecao =
      window.getSelection();

    if (
      selecao &&
      selecao.rangeCount > 0 &&
      blogEditor.contains(
        selecao.anchorNode
      )
    ) {

      const range =
        selecao.getRangeAt(0);

      range.deleteContents();

      range.insertNode(
        imagem
      );

      range.setStartAfter(
        imagem
      );

      range.collapse(
        true
      );

      selecao.removeAllRanges();

      selecao.addRange(
        range
      );

    } else {

      blogEditor.appendChild(
        imagem
      );
    }

    salvarSelecao();
  }

  function escolherImagemComputador() {

    salvarSelecao();

    inputImagem.value =
      '';

    inputImagem.click();
  }

  inputImagem.addEventListener(
    'change',
    function () {

      const arquivos =
        Array.from(
          inputImagem.files || []
        );

      if (
        arquivos.length === 0
      ) {
        return;
      }

      arquivos.forEach(
        function (arquivo) {

          if (
            !arquivo.type.startsWith(
              'image/'
            )
          ) {
            return;
          }

          const leitor =
            new FileReader();

          leitor.onload =
            function (evento) {

              inserirImagem(
                evento.target.result,
                arquivo.name
              );
            };

          leitor.readAsDataURL(
            arquivo
          );
        }
      );
    }
  );

  function inserirImagemURL() {

    salvarSelecao();

    const url =
      prompt(
        'Digite ou cole a URL da imagem:'
      );

    if (!url) {
      return;
    }

    inserirImagem(
      url,
      'Imagem do artigo'
    );
  }

  // =========================================================
  // LINK
  // =========================================================

  function inserirLink() {

    salvarSelecao();

    restaurarSelecao();

    const url =
      prompt(
        'Digite a URL do link:'
      );

    if (!url) {
      return;
    }

    comandoEditor(
      'createLink',
      url
    );
  }

  // =========================================================
  // BOTÕES DO EDITOR
  // =========================================================

  document
    .querySelectorAll(
      '[data-editor-action]'
    )
    .forEach(
      function (botao) {

        botao.addEventListener(
          'mousedown',
          function (event) {

            event.preventDefault();

            salvarSelecao();
          }
        );

        botao.addEventListener(
          'click',
          function () {

            const acao =
              botao.dataset.editorAction;

            if (acao === 'h1') {
              formatar('H1');
            }

            if (acao === 'h2') {
              formatar('H2');
            }

            if (acao === 'h3') {
              formatar('H3');
            }

            if (acao === 'bold') {
              comandoEditor('bold');
            }

            if (acao === 'italic') {
              comandoEditor('italic');
            }

            if (acao === 'link') {
              inserirLink();
            }

            if (acao === 'image') {
              inserirImagemURL();
            }

            if (acao === 'imageMultiple') {
              escolherImagemComputador();
            }

            if (acao === 'paragraph') {
              formatar('P');
            }

            if (acao === 'quote') {
              formatar('BLOCKQUOTE');
            }

            if (acao === 'fontSmall') {
              alterarTamanhoTexto(2);
            }

            if (acao === 'fontNormal') {
              alterarTamanhoTexto(3);
            }

            if (acao === 'fontLarge') {
              alterarTamanhoTexto(5);
            }

            if (acao === 'fontHuge') {
              alterarTamanhoTexto(7);
            }
          }
        );
      }
    );

  // =========================================================
  // MENU DO BOTÃO DIREITO
  // =========================================================

  function mostrarMenu(
    x,
    y
  ) {

    if (!editorContextMenu) {
      return;
    }

    editorContextMenu.classList.remove(
      'escondido'
    );

    editorContextMenu.style.display =
      'block';

    editorContextMenu.style.position =
      'fixed';

    editorContextMenu.style.left =
      x + 'px';

    editorContextMenu.style.top =
      y + 'px';

    editorContextMenu.style.zIndex =
      '999999';

    const largura =
      editorContextMenu.offsetWidth;

    const altura =
      editorContextMenu.offsetHeight;

    if (
      x + largura >
      window.innerWidth
    ) {

      editorContextMenu.style.left =
        (
          window.innerWidth -
          largura -
          10
        ) + 'px';
    }

    if (
      y + altura >
      window.innerHeight
    ) {

      editorContextMenu.style.top =
        (
          window.innerHeight -
          altura -
          10
        ) + 'px';
    }
  }

  function esconderMenu() {

    if (!editorContextMenu) {
      return;
    }

    editorContextMenu.classList.add(
      'escondido'
    );

    editorContextMenu.style.display =
      'none';
  }

  if (
    blogEditor &&
    editorContextMenu
  ) {

    blogEditor.addEventListener(
      'contextmenu',
      function (event) {

        event.preventDefault();

        salvarSelecao();

        mostrarMenu(
          event.clientX,
          event.clientY
        );
      }
    );
  }

  if (editorContextMenu) {

    editorContextMenu
      .querySelectorAll(
        '[data-context-action]'
      )
      .forEach(
        function (botao) {

          botao.addEventListener(
            'mousedown',
            function (event) {

              event.preventDefault();

              salvarSelecao();
            }
          );

          botao.addEventListener(
            'click',
            function (event) {

              event.preventDefault();

              const acao =
                botao.dataset.contextAction;

              esconderMenu();

              if (acao === 'h1') {
                formatar('H1');
              }

              if (acao === 'h2') {
                formatar('H2');
              }

              if (acao === 'h3') {
                formatar('H3');
              }

              if (acao === 'bold') {
                comandoEditor('bold');
              }

              if (acao === 'italic') {
                comandoEditor('italic');
              }

              if (acao === 'link') {
                inserirLink();
              }

              if (acao === 'image') {
                inserirImagemURL();
              }

              if (acao === 'imageMultiple') {
                escolherImagemComputador();
              }

              if (acao === 'paragraph') {
                formatar('P');
              }

              if (acao === 'quote') {
                formatar('BLOCKQUOTE');
              }

              if (acao === 'fontSmall') {
                alterarTamanhoTexto(2);
              }

              if (acao === 'fontNormal') {
                alterarTamanhoTexto(3);
              }

              if (acao === 'fontLarge') {
                alterarTamanhoTexto(5);
              }

              if (acao === 'fontHuge') {
                alterarTamanhoTexto(7);
              }
            }
          );
        }
      );
  }

  // =========================================================
  // FECHAR MENU
  // =========================================================

  document.addEventListener(
    'click',
    function (event) {

      if (
        editorContextMenu &&
        !editorContextMenu.contains(
          event.target
        )
      ) {

        esconderMenu();
      }
    }
  );

  window.addEventListener(
    'scroll',
    esconderMenu
  );

  window.addEventListener(
    'resize',
    esconderMenu
  );

  // =========================================================
  // SALVAR SELEÇÃO DO EDITOR
  // =========================================================

  if (blogEditor) {

    blogEditor.addEventListener(
      'mouseup',
      salvarSelecao
    );

    blogEditor.addEventListener(
      'keyup',
      salvarSelecao
    );

    blogEditor.addEventListener(
      'focus',
      salvarSelecao
    );
  }

  // =========================================================
  // CANCELAR EDIÇÃO
  // =========================================================

  function cancelarEdicaoArtigo() {

    artigoEmEdicaoId = null;

    const campoTitulo =
      document.getElementById(
        'blogTitulo'
      );

    const campoResumo =
      document.getElementById(
        'blogResumo'
      );

    const campoPublicado =
      document.getElementById(
        'blogPublicado'
      );

    if (campoTitulo) {
      campoTitulo.value = '';
    }

    if (campoResumo) {
      campoResumo.value = '';
    }

    if (blogEditor) {
      blogEditor.innerHTML = '';
    }

    if (campoPublicado) {
      campoPublicado.checked = true;
    }

    ultimaSelecao = null;

    if (btnSalvarArtigo) {
      btnSalvarArtigo.textContent =
        'Salvar artigo';

      btnSalvarArtigo.dataset.mode =
        'create';
    }

    const btnCancelarEdicao =
      document.getElementById(
        'btnCancelarEdicao'
      );

    if (btnCancelarEdicao) {
      btnCancelarEdicao.classList.add(
        'escondido'
      );
    }

    mostrarErro(
      erroBlog,
      ''
    );

    esconderMenu();

    console.log(
      '[BLOG] Edição cancelada.'
    );
  }

  // =========================================================
  // BOTÃO CANCELAR EDIÇÃO
  // =========================================================

  const btnCancelarEdicao =
    document.getElementById(
      'btnCancelarEdicao'
    );

  if (btnCancelarEdicao) {

    btnCancelarEdicao.addEventListener(
      'click',
      function (event) {

        event.preventDefault();

        cancelarEdicaoArtigo();
      }
    );
  }

  // =========================================================
  // CARREGAR ARTIGO PARA EDIÇÃO
  // =========================================================

  async function editarArtigo(id) {

    try {

      console.log(
        '[BLOG] Carregando artigo para edição:',
        id
      );

      const artigo =
        await apiFetch(
          `/api/blog/admin/${id}`
        );

      const campoTitulo =
        document.getElementById(
          'blogTitulo'
        );

      const campoResumo =
        document.getElementById(
          'blogResumo'
        );

      const campoPublicado =
        document.getElementById(
          'blogPublicado'
        );

      if (campoTitulo) {
        campoTitulo.value =
          artigo.titulo || '';
      }

      if (campoResumo) {
        campoResumo.value =
          artigo.resumo || '';
      }

      if (blogEditor) {
        blogEditor.innerHTML =
          artigo.conteudo || '';
      }

      if (campoPublicado) {
        campoPublicado.checked =
          Boolean(
            artigo.publicado
          );
      }

      artigoEmEdicaoId =
        artigo.id;

      if (btnSalvarArtigo) {

        btnSalvarArtigo.textContent =
          'Atualizar artigo';

        btnSalvarArtigo.dataset.mode =
          'edit';
      }

      if (btnCancelarEdicao) {

        btnCancelarEdicao.classList.remove(
          'escondido'
        );
      }

      mostrarErro(
        erroBlog,
        ''
      );

      ultimaSelecao = null;

      // Tenta levar o usuário para o editor
      if (blogEditor) {

        blogEditor.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        setTimeout(
          function () {

            blogEditor.focus();

          },
          500
        );
      }

      console.log(
        '[BLOG] Artigo carregado para edição.'
      );

    } catch (erro) {

      console.error(
        '[BLOG EDITAR]',
        erro
      );

      alert(
        'Não foi possível carregar o artigo para edição.\n\n' +
        erro.message
      );
    }
  }

  // =========================================================
  // SALVAR / ATUALIZAR ARTIGO
  // =========================================================

  if (btnSalvarArtigo) {

    console.log(
      '[BLOG] Botão Salvar artigo encontrado.'
    );

    btnSalvarArtigo.addEventListener(
      'click',
      async function (event) {

        event.preventDefault();

        console.log(
          '[BLOG] BOTÃO SALVAR CLICADO'
        );

        mostrarErro(
          erroBlog,
          ''
        );

        const campoTitulo =
          document.getElementById(
            'blogTitulo'
          );

        const campoResumo =
          document.getElementById(
            'blogResumo'
          );

        const campoPublicado =
          document.getElementById(
            'blogPublicado'
          );

        const titulo =
          campoTitulo
            ? campoTitulo.value.trim()
            : '';

        const resumo =
          campoResumo
            ? campoResumo.value.trim()
            : '';

        const publicado =
          campoPublicado
            ? campoPublicado.checked
            : true;

        const conteudo =
          blogEditor
            ? blogEditor.innerHTML.trim()
            : '';

        console.log(
          '[BLOG] Dados enviados:',
          {
            titulo,
            resumo,
            publicado,
            artigoEmEdicaoId,
            tamanhoConteudo:
              conteudo.length
          }
        );

        // =====================================================
        // VALIDAÇÕES
        // =====================================================

        if (!titulo) {

          mostrarErro(
            erroBlog,
            'Digite o título do artigo.'
          );

          return;
        }

        if (
          !conteudo ||
          conteudo === '<br>' ||
          conteudo === '<div><br></div>'
        ) {

          mostrarErro(
            erroBlog,
            'Digite o conteúdo do artigo.'
          );

          return;
        }

        // =====================================================
        // BOTÃO SALVANDO
        // =====================================================

        btnSalvarArtigo.disabled =
          true;

        const textoOriginal =
          btnSalvarArtigo.textContent;

        btnSalvarArtigo.textContent =
          artigoEmEdicaoId
            ? 'Atualizando...'
            : 'Salvando...';

        try {

          let resultado;

          // ===================================================
          // EDITAR ARTIGO EXISTENTE
          // ===================================================

          if (artigoEmEdicaoId) {

            console.log(
              '[BLOG] Atualizando artigo:',
              artigoEmEdicaoId
            );

            resultado =
              await apiFetch(
                `/api/blog/${artigoEmEdicaoId}`,
                {
                  method: 'PUT',

                  headers: {
                    'Content-Type':
                      'application/json'
                  },

                  body:
                    JSON.stringify({
                      titulo:
                        titulo,

                      resumo:
                        resumo,

                      conteudo:
                        conteudo,

                      publicado:
                        publicado
                    })
                }
              );

            console.log(
              '[BLOG] ARTIGO ATUALIZADO:',
              resultado
            );

            alert(
              'Artigo atualizado com sucesso!'
            );

          } else {

            // =================================================
            // CRIAR NOVO ARTIGO
            // =================================================

            console.log(
              '[BLOG] Criando novo artigo.'
            );

            resultado =
              await apiFetch(
                '/api/blog',
                {
                  method: 'POST',

                  headers: {
                    'Content-Type':
                      'application/json'
                  },

                  body:
                    JSON.stringify({
                      titulo:
                        titulo,

                      resumo:
                        resumo,

                      conteudo:
                        conteudo,

                      publicado:
                        publicado
                    })
                }
              );

            console.log(
              '[BLOG] ARTIGO SALVO:',
              resultado
            );

            alert(
              'Artigo salvo com sucesso!'
            );
          }

          // ===================================================
          // LIMPAR FORMULÁRIO
          // ===================================================

          cancelarEdicaoArtigo();

          await carregarArtigos();

        } catch (erro) {

          console.error(
            '[BLOG] ERRO AO SALVAR/ATUALIZAR:',
            erro
          );

          mostrarErro(
            erroBlog,
            'Erro ao salvar artigo: ' +
            erro.message
          );

          alert(
            'Não foi possível salvar o artigo.\n\n' +
            erro.message
          );

        } finally {

          btnSalvarArtigo.disabled =
            false;

          btnSalvarArtigo.textContent =
            artigoEmEdicaoId
              ? 'Atualizar artigo'
              : textoOriginal;
        }
      }
    );

  } else {

    console.error(
      '[BLOG] ERRO: botão #btnSalvarArtigo não encontrado!'
    );
  }

  // =========================================================
  // CARREGAR ARTIGOS
  // =========================================================

  async function carregarArtigos() {

    const tbody =
      document.getElementById(
        'listaArtigos'
      );

    if (!tbody) {
      return;
    }

    try {

      const artigos =
        await apiFetch(
          '/api/blog/admin/todos'
        );

      if (
        !Array.isArray(artigos) ||
        artigos.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum artigo cadastrado.</td></tr>';

        return;
      }

      tbody.innerHTML =
        artigos.map(
          function (artigo) {

            return `
              <tr>

                <td>
                  ${escapeHtml(artigo.id)}
                </td>

                <td>
                  ${escapeHtml(artigo.titulo || '')}
                </td>

                <td>
                  ${
                    artigo.publicado
                      ? 'Publicado'
                      : 'Rascunho'
                  }
                </td>

                <td>
                  ${escapeHtml(
                    artigo.criado_em ||
                    artigo.created_at ||
                    '-'
                  )}
                </td>

                <td>

                  <button
                    type="button"
                    class="btn btn--editar"
                    data-blog-editar="${escapeHtml(artigo.id)}"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    class="btn btn--excluir"
                    data-blog-id="${escapeHtml(artigo.id)}"
                  >
                    Excluir
                  </button>

                </td>

              </tr>
            `;
          }
        ).join('');

      // =====================================================
      // BOTÕES EDITAR
      // =====================================================

      tbody
        .querySelectorAll(
          '[data-blog-editar]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.blogEditar;

                if (!id) {
                  return;
                }

                botao.disabled =
                  true;

                try {

                  await editarArtigo(
                    id
                  );

                } finally {

                  botao.disabled =
                    false;
                }
              }
            );
          }
        );

      // =====================================================
      // BOTÕES EXCLUIR
      // =====================================================

      tbody
        .querySelectorAll(
          '[data-blog-id]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.blogId;

                if (!id) {
                  return;
                }

                if (
                  !confirm(
                    'Excluir este artigo?'
                  )
                ) {
                  return;
                }

                try {

                  botao.disabled =
                    true;

                  await apiFetch(
                    `/api/blog/${id}`,
                    {
                      method: 'DELETE'
                    }
                  );

                  // Se o artigo excluído
                  // estava sendo editado,
                  // limpa o editor.

                  if (
                    String(
                      artigoEmEdicaoId
                    ) === String(id)
                  ) {

                    cancelarEdicaoArtigo();
                  }

                  await carregarArtigos();

                } catch (erro) {

                  alert(
                    erro.message
                  );

                  botao.disabled =
                    false;
                }
              }
            );
          }
        );

    } catch (erro) {

      console.error(
        '[BLOG LISTA]',
        erro
      );

      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            Erro ao carregar artigos:
            ${escapeHtml(erro.message)}
          </td>
        </tr>`;
    }
  }

  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  console.log(
    '[ADMIN] Inicialização concluída.'
  );

  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();
  }

})();
