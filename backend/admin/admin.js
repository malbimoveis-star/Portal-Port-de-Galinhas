(function () {
  'use strict';

  // =========================================================
  // CONFIGURAÇÃO
  // =========================================================

  const API = window.location.origin;
  const TOKEN_KEY = 'portal_admin_token';

  // =========================================================
  // ELEMENTOS PRINCIPAIS
  // =========================================================

  const telaLogin = document.getElementById('telaLogin');
  const telaAdmin = document.getElementById('telaAdmin');
  const formLogin = document.getElementById('formLogin');
  const erroLogin = document.getElementById('erroLogin');
  const btnSair = document.getElementById('btnSair');

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function limparToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function mostrarLogin() {
    if (telaLogin) {
      telaLogin.classList.remove('escondido');
    }

    if (telaAdmin) {
      telaAdmin.classList.add('escondido');
    }
  }

  function mostrarAdmin() {
    if (telaLogin) {
      telaLogin.classList.add('escondido');
    }

    if (telaAdmin) {
      telaAdmin.classList.remove('escondido');
    }

    carregarPendentes();
    carregarTodos();
    carregarCategorias();
    carregarArtigos();
  }

  // =========================================================
  // API
  // =========================================================

  async function apiFetch(path, options = {}) {
    const token = getToken();

    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(`${API}${path}`, {
      ...options,
      headers
    });

    let data = {};

    try {
      data = await resp.json();
    } catch (e) {
      data = {};
    }

    if (resp.status === 401 || resp.status === 403) {
      limparToken();
      mostrarLogin();

      throw new Error(
        data.erro ||
        'Sessão expirada. Faça login novamente.'
      );
    }

    if (!resp.ok) {
      throw new Error(
        data.erro ||
        data.error ||
        `Erro HTTP ${resp.status}`
      );
    }

    return data;
  }

  // =========================================================
  // LOGIN
  // =========================================================

  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (erroLogin) {
        erroLogin.textContent = '';
      }

      const usuarioElement =
        document.getElementById('usuario');

      const senhaElement =
        document.getElementById('senha');

      const usuario =
        usuarioElement
          ? usuarioElement.value.trim()
          : '';

      const senha =
        senhaElement
          ? senhaElement.value
          : '';

      try {
        const resp = await fetch(
          `${API}/api/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              usuario,
              senha
            })
          }
        );

        let data = {};

        try {
          data = await resp.json();
        } catch (e) {
          data = {};
        }

        if (!resp.ok) {
          if (erroLogin) {
            erroLogin.textContent =
              data.erro ||
              'Credenciais inválidas.';
          }

          return;
        }

        if (!data.token) {
          throw new Error(
            'O servidor não retornou o token de acesso.'
          );
        }

        setToken(data.token);

        mostrarAdmin();

      } catch (err) {
        console.error('[login]', err);

        if (erroLogin) {
          erroLogin.textContent =
            err.message ||
            'Erro ao conectar com o servidor.';
        }
      }
    });
  }

  // =========================================================
  // SAIR
  // =========================================================

  if (btnSair) {
    btnSair.addEventListener('click', function () {
      limparToken();
      mostrarLogin();
    });
  }

  // =========================================================
  // TABS
  // =========================================================

  document
    .querySelectorAll('.tabs button')
    .forEach(function (btn) {

      btn.addEventListener('click', function () {

        document
          .querySelectorAll('.tabs button')
          .forEach(function (b) {
            b.classList.remove('ativa');
          });

        btn.classList.add('ativa');

        document
          .querySelectorAll('main section')
          .forEach(function (section) {
            section.classList.add('escondido');
          });

        const tabId =
          `tab${capitalize(btn.dataset.tab)}`;

        const tab =
          document.getElementById(tabId);

        if (tab) {
          tab.classList.remove('escondido');
        }

        if (btn.dataset.tab === 'blog') {
          carregarArtigos();
        }

      });

    });

  function capitalize(valor) {
    if (!valor) {
      return '';
    }

    return valor.charAt(0).toUpperCase() +
      valor.slice(1);
  }

  // =========================================================
  // ANÚNCIOS PENDENTES
  // =========================================================

  async function carregarPendentes() {

    try {

      const pendentes =
        await apiFetch(
          '/api/admin/anuncios'
        );

      const container =
        document.getElementById(
          'listaPendentes'
        );

      if (!container) {
        return;
      }

      if (!Array.isArray(pendentes)) {
        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;
      }

      container.innerHTML =
        pendentes.map(function (a) {

          return `

            <div
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
              "
            >

              <strong>
                ${escapeHtml(a.titulo || '')}
              </strong>

              <br>

              Comerciante:
              ${escapeHtml(a.id_comerciante || '-')}

              <br>

              Status:

              <span
                class="badge badge--${escapeHtml(a.status || '')}"
              >
                ${escapeHtml(a.status || '-')}
              </span>

              <br><br>

              <button
                class="btn btn--aprovar"
                data-acao="aprovar"
                data-id="${escapeHtml(a.id)}"
              >
                Aprovar
              </button>

              <button
                class="btn btn--rejeitar"
                data-acao="rejeitar"
                data-id="${escapeHtml(a.id)}"
              >
                Rejeitar
              </button>

            </div>

          `;

        }).join('') ||

        '<p>Nenhum anúncio pendente.</p>';

      container
        .querySelectorAll(
          'button[data-acao]'
        )
        .forEach(function (btn) {

          btn.addEventListener(
            'click',
            async function () {

              const acao =
                btn.dataset.acao;

              const id =
                btn.dataset.id;

              try {

                await apiFetch(
                  `/api/admin/anuncios/${id}/${acao}`,
                  {
                    method: 'PUT'
                  }
                );

                await carregarPendentes();
                await carregarTodos();

              } catch (err) {

                console.error(
                  '[anuncio]',
                  err
                );

                alert(err.message);
              }

            }
          );

        });

    } catch (err) {

      console.error(
        '[pendentes]',
        err
      );

    }

  }

  // =========================================================
  // TODOS OS ANÚNCIOS
  // =========================================================

  async function carregarTodos() {

    try {

      const todos =
        await apiFetch(
          '/api/admin/anuncios/todos'
        );

      const tbody =
        document.getElementById(
          'listaTodos'
        );

      if (!tbody) {
        return;
      }

      if (!Array.isArray(todos)) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

        return;
      }

      tbody.innerHTML =
        todos.map(function (a) {

          return `

            <tr>

              <td>
                ${escapeHtml(a.id)}
              </td>

              <td>
                ${escapeHtml(a.titulo || '')}
              </td>

              <td>

                <span
                  class="badge badge--${escapeHtml(a.status || '')}"
                >
                  ${escapeHtml(a.status || '-')}
                </span>

              </td>

              <td>
                ${escapeHtml(a.latitude ?? '-')},
                ${escapeHtml(a.longitude ?? '-')}
              </td>

              <td>

                <button
                  class="btn btn--excluir"
                  data-id="${escapeHtml(a.id)}"
                >
                  Excluir
                </button>

              </td>

            </tr>

          `;

        }).join('') ||

        '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

      tbody
        .querySelectorAll(
          'button.btn--excluir'
        )
        .forEach(function (btn) {

          btn.addEventListener(
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

                await apiFetch(
                  `/api/admin/anuncios/${btn.dataset.id}`,
                  {
                    method: 'DELETE'
                  }
                );

                await carregarTodos();
                await carregarPendentes();

              } catch (err) {

                console.error(
                  '[excluir anuncio]',
                  err
                );

                alert(err.message);
              }

            }
          );

        });

    } catch (err) {

      console.error(
        '[todos anuncios]',
        err
      );

    }

  }

  // =========================================================
  // CATEGORIAS
  // =========================================================

  async function carregarCategorias() {

    try {

      const categorias =
        await apiFetch(
          '/api/admin/categorias'
        );

      const tbody =
        document.getElementById(
          'listaCategorias'
        );

      if (!tbody) {
        return;
      }

      if (!Array.isArray(categorias)) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

        return;
      }

      tbody.innerHTML =
        categorias.map(function (c) {

          return `

            <tr>

              <td>
                ${escapeHtml(c.id)}
              </td>

              <td>
                ${escapeHtml(c.nome || '')}
              </td>

              <td>
                ${escapeHtml(c.icone_url || '-')}
              </td>

              <td>
                ${escapeHtml(c.slug || '-')}
              </td>

              <td>

                <button
                  class="btn btn--excluir"
                  data-id="${escapeHtml(c.id)}"
                >
                  Excluir
                </button>

              </td>

            </tr>

          `;

        }).join('') ||

        '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

      tbody
        .querySelectorAll(
          'button.btn--excluir'
        )
        .forEach(function (btn) {

          btn.addEventListener(
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
                  `/api/admin/categorias/${btn.dataset.id}`,
                  {
                    method: 'DELETE'
                  }
                );

                await carregarCategorias();

              } catch (err) {

                console.error(
                  '[excluir categoria]',
                  err
                );

                alert(err.message);
              }

            }
          );

        });

    } catch (err) {

      console.error(
        '[categorias]',
        err
      );

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

        const nomeElement =
          document.getElementById(
            'novaCategoriaNome'
          );

        const iconeElement =
          document.getElementById(
            'novaCategoriaIcone'
          );

        const nome =
          nomeElement
            ? nomeElement.value.trim()
            : '';

        const icone_url =
          iconeElement
            ? iconeElement.value.trim()
            : '';

        if (!nome) {

          alert(
            'Digite o nome da categoria.'
          );

          return;
        }

        try {

          await apiFetch(
            '/api/admin/categorias',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                nome,
                icone_url
              })
            }
          );

          if (nomeElement) {
            nomeElement.value = '';
          }

          if (iconeElement) {
            iconeElement.value = '';
          }

          await carregarCategorias();

        } catch (err) {

          console.error(
            '[adicionar categoria]',
            err
          );

          alert(err.message);
        }

      }
    );

  }

  // =========================================================
  // BLOG - ELEMENTOS
  // =========================================================

  const btnSalvarArtigo =
    document.getElementById(
      'btnSalvarArtigo'
    );

  const erroBlog =
    document.getElementById(
      'erroBlog'
    );

  /*
    IMPORTANTE:

    No seu index.html atual o editor é:

    <div
      id="blogConteudo"
      class="blog-editor"
      contenteditable="true"
    ></div>

    Portanto usamos blogConteudo como editor visual.
  */

  const blogEditor =
    document.getElementById(
      'blogConteudo'
    );

  // =========================================================
  // SELEÇÃO DO EDITOR
  // =========================================================

  let ultimaSelecao = null;

  function salvarSelecaoEditor() {

    if (!blogEditor) {
      return;
    }

    const selecao =
      window.getSelection();

    if (
      !selecao ||
      selecao.rangeCount === 0
    ) {
      return;
    }

    const range =
      selecao.getRangeAt(0);

    if (
      blogEditor.contains(
        range.commonAncestorContainer
      )
    ) {

      ultimaSelecao =
        range.cloneRange();

    }

  }

  function restaurarSelecaoEditor() {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    const selecao =
      window.getSelection();

    if (
      ultimaSelecao
    ) {

      selecao.removeAllRanges();

      selecao.addRange(
        ultimaSelecao
      );

    }

  }

  // =========================================================
  // EXECUTAR COMANDO
  // =========================================================

  function executarComando(
    comando,
    valor = null
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecaoEditor();

    try {

      document.execCommand(
        comando,
        false,
        valor
      );

      salvarSelecaoEditor();

    } catch (err) {

      console.error(
        '[editor] Erro:',
        comando,
        err
      );

    }

  }

  // =========================================================
  // INSERIR HTML NO LOCAL SELECIONADO
  // =========================================================

  function inserirHtml(html) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecaoEditor();

    const selecao =
      window.getSelection();

    if (
      !selecao ||
      selecao.rangeCount === 0
    ) {

      blogEditor.insertAdjacentHTML(
        'beforeend',
        html
      );

      return;

    }

    const range =
      selecao.getRangeAt(0);

    range.deleteContents();

    const fragment =
      range.createContextualFragment(
        html
      );

    const ultimo =
      fragment.lastChild;

    range.insertNode(
      fragment
    );

    if (ultimo) {

      range.setStartAfter(
        ultimo
      );

      range.collapse(true);

      selecao.removeAllRanges();

      selecao.addRange(
        range
      );

    }

    salvarSelecaoEditor();

  }

  // =========================================================
  // BARRA DE FERRAMENTAS
  // =========================================================

  document
    .querySelectorAll(
      '[data-editor-action]'
    )
    .forEach(function (btn) {

      btn.addEventListener(
        'mousedown',
        function (e) {

          /*
            Impede que o clique no botão
            faça o editor perder a seleção.
          */

          e.preventDefault();

          salvarSelecaoEditor();

        }
      );

      btn.addEventListener(
        'click',
        function () {

          const acao =
            btn.dataset.editorAction;

          executarAcaoEditor(
            acao
          );

        }
      );

    });

  // =========================================================
  // EXECUTAR AÇÕES DO EDITOR
  // =========================================================

  function executarAcaoEditor(
    acao
  ) {

    switch (acao) {

      case 'h1':

        executarComando(
          'formatBlock',
          'H1'
        );

        break;

      case 'h2':

        executarComando(
          'formatBlock',
          'H2'
        );

        break;

      case 'h3':

        executarComando(
          'formatBlock',
          'H3'
        );

        break;

      case 'bold':

        executarComando(
          'bold'
        );

        break;

      case 'italic':

        executarComando(
          'italic'
        );

        break;

      case 'underline':

        executarComando(
          'underline'
        );

        break;

      case 'paragraph':

        executarComando(
          'formatBlock',
          'P'
        );

        break;

      case 'quote':

        executarComando(
          'formatBlock',
          'BLOCKQUOTE'
        );

        break;

      case 'link':

        inserirLink();

        break;

      case 'image':

        inserirImagemUrl();

        break;

      case 'imageMultiple':

        inserirVariasImagens();

        break;

      default:

        console.warn(
          '[editor] Ação desconhecida:',
          acao
        );

    }

  }

  // =========================================================
  // INSERIR LINK
  // =========================================================

  function inserirLink() {

    if (!blogEditor) {
      return;
    }

    salvarSelecaoEditor();

    const url =
      prompt(
        'Digite a URL do link:'
      );

    if (!url) {
      return;
    }

    executarComando(
      'createLink',
      url.trim()
    );

  }

  // =========================================================
  // INPUT PARA ESCOLHER IMAGEM DO COMPUTADOR
  // =========================================================

  function abrirBibliotecaImagem(
    varias = false
  ) {

    if (!blogEditor) {
      return;
    }

    salvarSelecaoEditor();

    const input =
      document.createElement(
        'input'
      );

    input.type =
      'file';

    input.accept =
      'image/*';

    if (varias) {
      input.multiple = true;
    }

    input.style.display =
      'none';

    document.body.appendChild(
      input
    );

    input.addEventListener(
      'change',
      function () {

        const arquivos =
          Array.from(
            input.files || []
          );

        if (!arquivos.length) {

          input.remove();

          return;

        }

        if (varias) {

          arquivos.forEach(
            function (arquivo) {

              lerImagemArquivo(
                arquivo
              );

            }
          );

        } else {

          lerImagemArquivo(
            arquivos[0]
          );

        }

        input.remove();

      }
    );

    input.click();

  }

  // =========================================================
  // LER IMAGEM DO COMPUTADOR
  // =========================================================

  function lerImagemArquivo(
    arquivo
  ) {

    if (
      !arquivo ||
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

        const src =
          evento.target.result;

        inserirImagemNoEditor(
          src,
          arquivo.name
        );

      };

    leitor.onerror =
      function () {

        alert(
          'Não foi possível ler a imagem selecionada.'
        );

      };

    leitor.readAsDataURL(
      arquivo
    );

  }

  // =========================================================
  // INSERIR IMAGEM NO EDITOR
  // =========================================================

  function inserirImagemNoEditor(
    src,
    nomeArquivo = 'Imagem do artigo'
  ) {

    if (!blogEditor) {
      return;
    }

    const imagem =
      document.createElement(
        'img'
      );

    imagem.src =
      src;

    imagem.alt =
      nomeArquivo;

    imagem.className =
      'editor-imagem';

    imagem.loading =
      'lazy';

    imagem.style.maxWidth =
      '100%';

    imagem.style.height =
      'auto';

    imagem.style.display =
      'block';

    imagem.style.margin =
      '15px 0';

    restaurarSelecaoEditor();

    const selecao =
      window.getSelection();

    if (
      selecao &&
      selecao.rangeCount > 0
    ) {

      const range =
        selecao.getRangeAt(0);

      if (
        blogEditor.contains(
          range.commonAncestorContainer
        )
      ) {

        range.deleteContents();

        range.insertNode(
          imagem
        );

        const novoRange =
          document.createRange();

        novoRange.setStartAfter(
          imagem
        );

        novoRange.collapse(
          true
        );

        selecao.removeAllRanges();

        selecao.addRange(
          novoRange
        );

      } else {

        blogEditor.appendChild(
          imagem
        );

      }

    } else {

      blogEditor.appendChild(
        imagem
      );

    }

    salvarSelecaoEditor();

  }

  // =========================================================
  // IMAGEM POR URL
  // =========================================================

  function inserirImagemUrl() {

    if (!blogEditor) {
      return;
    }

    salvarSelecaoEditor();

    const url =
      prompt(
        'Cole aqui a URL da imagem:'
      );

    if (!url) {
      return;
    }

    inserirImagemNoEditor(
      url.trim(),
      'Imagem do artigo'
    );

  }

  // =========================================================
  // VÁRIAS IMAGENS DO COMPUTADOR
  // =========================================================

  function inserirVariasImagens() {

    abrirBibliotecaImagem(
      true
    );

  }

  // =========================================================
  // MENU DE CONTEXTO
  // =========================================================

  let editorContextMenu = null;

  function criarMenuContexto() {

    if (editorContextMenu) {
      return editorContextMenu;
    }

    editorContextMenu =
      document.createElement(
        'div'
      );

    editorContextMenu.id =
      'editorContextMenuJS';

    editorContextMenu.className =
      'editor-context-menu';

    editorContextMenu.style.position =
      'fixed';

    editorContextMenu.style.zIndex =
      '99999';

    editorContextMenu.style.display =
      'none';

    editorContextMenu.innerHTML = `

      <button
        type="button"
        data-context-action="h1"
      >
        H1 - Título principal
      </button>

      <button
        type="button"
        data-context-action="h2"
      >
        H2 - Subtítulo
      </button>

      <button
        type="button"
        data-context-action="h3"
      >
        H3 - Seção
      </button>

      <button
        type="button"
        data-context-action="paragraph"
      >
        ¶ Parágrafo
      </button>

      <div class="context-separador"></div>

      <button
        type="button"
        data-context-action="bold"
      >
        <strong>B</strong> Negrito
      </button>

      <button
        type="button"
        data-context-action="italic"
      >
        <em>I</em> Itálico
      </button>

      <button
        type="button"
        data-context-action="underline"
      >
        <u>U</u> Sublinhado
      </button>

      <div class="context-separador"></div>

      <button
        type="button"
        data-context-action="link"
      >
        🔗 Inserir link
      </button>

      <button
        type="button"
        data-context-action="imageFile"
      >
        🖼️ Imagem do computador
      </button>

      <button
        type="button"
        data-context-action="imageUrl"
      >
        🌐 Imagem por URL
      </button>

      <button
        type="button"
        data-context-action="imageMultiple"
      >
        📷 Várias imagens
      </button>

      <div class="context-separador"></div>

      <button
        type="button"
        data-context-action="ul"
      >
        • Lista com marcadores
      </button>

      <button
        type="button"
        data-context-action="ol"
      >
        1. Lista numerada
      </button>

      <button
        type="button"
        data-context-action="quote"
      >
        ❝ Citação
      </button>

    `;

    document.body.appendChild(
      editorContextMenu
    );

    editorContextMenu
      .querySelectorAll(
        '[data-context-action]'
      )
      .forEach(function (btn) {

        btn.addEventListener(
          'mousedown',
          function (e) {

            /*
              Evita que o editor perca
              a seleção antes da ação.
            */

            e.preventDefault();

          }
        );

        btn.addEventListener(
          'click',
          function () {

            const acao =
              btn.dataset.contextAction;

            esconderMenuContexto();

            executarAcaoContexto(
              acao
            );

          }
        );

      });

    return editorContextMenu;

  }

  // =========================================================
  // MOSTRAR MENU
  // =========================================================

  function mostrarMenuContexto(
    x,
    y
  ) {

    const menu =
      criarMenuContexto();

    menu.style.display =
      'block';

    const margem =
      10;

    const largura =
      menu.offsetWidth;

    const altura =
      menu.offsetHeight;

    let posX =
      x;

    let posY =
      y;

    if (
      posX + largura >
      window.innerWidth - margem
    ) {

      posX =
        window.innerWidth -
        largura -
        margem;

    }

    if (
      posY + altura >
      window.innerHeight - margem
    ) {

      posY =
        window.innerHeight -
        altura -
        margem;

    }

    menu.style.left =
      `${Math.max(margem, posX)}px`;

    menu.style.top =
      `${Math.max(margem, posY)}px`;

  }

  // =========================================================
  // ESCONDER MENU
  // =========================================================

  function esconderMenuContexto() {

    if (editorContextMenu) {

      editorContextMenu.style.display =
        'none';

    }

  }

  // =========================================================
  // AÇÕES DO MENU DIREITO
  // =========================================================

  function executarAcaoContexto(
    acao
  ) {

    switch (acao) {

      case 'h1':

        executarComando(
          'formatBlock',
          'H1'
        );

        break;

      case 'h2':

        executarComando(
          'formatBlock',
          'H2'
        );

        break;

      case 'h3':

        executarComando(
          'formatBlock',
          'H3'
        );

        break;

      case 'paragraph':

        executarComando(
          'formatBlock',
          'P'
        );

        break;

      case 'bold':

        executarComando(
          'bold'
        );

        break;

      case 'italic':

        executarComando(
          'italic'
        );

        break;

      case 'underline':

        executarComando(
          'underline'
        );

        break;

      case 'link':

        inserirLink();

        break;

      case 'imageFile':

        abrirBibliotecaImagem(
          false
        );

        break;

      case 'imageUrl':

        inserirImagemUrl();

        break;

      case 'imageMultiple':

        inserirVariasImagens();

        break;

      case 'ul':

        executarComando(
          'insertUnorderedList'
        );

        break;

      case 'ol':

        executarComando(
          'insertOrderedList'
        );

        break;

      case 'quote':

        executarComando(
          'formatBlock',
          'BLOCKQUOTE'
        );

        break;

    }

  }

  // =========================================================
  // EVENTOS DO EDITOR
  // =========================================================

  if (blogEditor) {

    blogEditor.addEventListener(
      'keyup',
      salvarSelecaoEditor
    );

    blogEditor.addEventListener(
      'mouseup',
      salvarSelecaoEditor
    );

    blogEditor.addEventListener(
      'focus',
      salvarSelecaoEditor
    );

    blogEditor.addEventListener(
      'contextmenu',
      function (e) {

        e.preventDefault();

        salvarSelecaoEditor();

        mostrarMenuContexto(
          e.clientX,
          e.clientY
        );

      }
    );

  }

  // =========================================================
  // FECHAR MENU AO CLICAR FORA
  // =========================================================

  document.addEventListener(
    'mousedown',
    function (e) {

      if (
        editorContextMenu &&
        editorContextMenu.style.display === 'block' &&
        !editorContextMenu.contains(
          e.target
        )
      ) {

        esconderMenuContexto();

      }

    }
  );

  window.addEventListener(
    'scroll',
    esconderMenuContexto
  );

  window.addEventListener(
    'resize',
    esconderMenuContexto
  );

  // =========================================================
  // SALVAR ARTIGO
  // =========================================================

  if (btnSalvarArtigo) {

    btnSalvarArtigo.addEventListener(
      'click',
      async function () {

        if (erroBlog) {
          erroBlog.textContent = '';
        }

        const tituloElement =
          document.getElementById(
            'blogTitulo'
          );

        const resumoElement =
          document.getElementById(
            'blogResumo'
          );

        const capaElement =
          document.getElementById(
            'blogCapa'
          );

        const publicadoElement =
          document.getElementById(
            'blogPublicado'
          );

        const titulo =
          tituloElement
            ? tituloElement.value.trim()
            : '';

        const resumo =
          resumoElement
            ? resumoElement.value.trim()
            : '';

        const capa =
          capaElement
            ? capaElement.value.trim()
            : '';

        let conteudo = '';

        if (blogEditor) {

          conteudo =
            blogEditor.innerHTML.trim();

        }

        const publicado =
          publicadoElement
            ? publicadoElement.checked
            : true;

        // =====================================================
        // VALIDAÇÃO
        // =====================================================

        if (!titulo) {

          if (erroBlog) {
            erroBlog.textContent =
              'Digite o título do artigo.';
          }

          return;
        }

        if (
          !conteudo ||
          conteudo === '<br>'
        ) {

          if (erroBlog) {
            erroBlog.textContent =
              'Digite o conteúdo do artigo.';
          }

          return;
        }

        // =====================================================
        // BLOQUEAR DUPLO CLIQUE
        // =====================================================

        btnSalvarArtigo.disabled =
          true;

        btnSalvarArtigo.textContent =
          'Salvando...';

        try {

          const resultado =
            await apiFetch(
              '/api/blog',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body: JSON.stringify({

                  titulo,

                  resumo,

                  capa_url:
                    capa || null,

                  conteudo,

                  publicado

                })
              }
            );

          console.log(
            '[blog] Artigo salvo:',
            resultado
          );

          alert(
            'Artigo salvo com sucesso!'
          );

          // ===================================================
          // LIMPAR FORMULÁRIO
          // ===================================================

          if (tituloElement) {
            tituloElement.value = '';
          }

          if (resumoElement) {
            resumoElement.value = '';
          }

          if (capaElement) {
            capaElement.value = '';
          }

          if (blogEditor) {
            blogEditor.innerHTML = '';
          }

          if (publicadoElement) {
            publicadoElement.checked = true;
          }

          ultimaSelecao =
            null;

          await carregarArtigos();

        } catch (err) {

          console.error(
            '[blog] Erro ao salvar:',
            err
          );

          if (erroBlog) {

            erroBlog.textContent =
              err.message ||
              'Erro ao salvar artigo.';

          }

        } finally {

          btnSalvarArtigo.disabled =
            false;

          btnSalvarArtigo.textContent =
            'Salvar artigo';

        }

      }
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

      if (!Array.isArray(artigos)) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum artigo cadastrado.</td></tr>';

        return;
      }

      tbody.innerHTML =
        artigos.map(function (artigo) {

          const status =
            artigo.publicado
              ? 'Publicado'
              : 'Rascunho';

          return `

            <tr>

              <td>
                ${escapeHtml(artigo.id)}
              </td>

              <td>
                ${escapeHtml(artigo.titulo || '')}
              </td>

              <td>

                <span
                  class="badge badge--${
                    artigo.publicado
                      ? 'ativo'
                      : 'pendente'
                  }"
                >
                  ${status}
                </span>

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
                  class="btn btn--excluir"
                  data-blog-id="${escapeHtml(artigo.id)}"
                >
                  Excluir
                </button>

              </td>

            </tr>

          `;

        }).join('') ||

        '<tr><td colspan="5">Nenhum artigo cadastrado.</td></tr>';

      tbody
        .querySelectorAll(
          'button[data-blog-id]'
        )
        .forEach(function (btn) {

          btn.addEventListener(
            'click',
            async function () {

              if (
                !confirm(
                  'Excluir este artigo?'
                )
              ) {
                return;
              }

              try {

                await apiFetch(
                  `/api/blog/${btn.dataset.blogId}`,
                  {
                    method: 'DELETE'
                  }
                );

                alert(
                  'Artigo excluído com sucesso!'
                );

                await carregarArtigos();

              } catch (err) {

                console.error(
                  '[blog] Erro ao excluir:',
                  err
                );

                alert(
                  err.message
                );

              }

            }
          );

        });

    } catch (err) {

      console.error(
        '[blog] Erro ao carregar artigos:',
        err
      );

      tbody.innerHTML = `

        <tr>

          <td colspan="5">

            Erro ao carregar artigos:
            ${escapeHtml(err.message)}

          </td>

        </tr>

      `;

    }

  }

  // =========================================================
  // ESCAPAR HTML
  // =========================================================

  function escapeHtml(valor) {

    if (
      valor === null ||
      valor === undefined
    ) {
      return '';
    }

    return String(valor)
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

  }

  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  console.log(
    '[admin] Painel administrativo carregado.'
  );

  console.log(
    '[admin] Editor visual:',
    blogEditor
      ? 'OK'
      : 'NÃO ENCONTRADO'
  );

  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
