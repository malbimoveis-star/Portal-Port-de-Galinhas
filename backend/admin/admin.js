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
        const resp = await fetch(`${API}/api/login`, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            usuario,
            senha
          })
        });

        const data = await resp.json();

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
            'O servidor não retornou um token de acesso.'
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
        await apiFetch('/api/admin/anuncios');

      const container =
        document.getElementById('listaPendentes');

      if (!container) {
        return;
      }

      if (!Array.isArray(pendentes) || !pendentes.length) {

        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;
      }

      container.innerHTML =
        pendentes.map(function (a) {

          return `

            <div style="
              padding:12px;
              border-bottom:1px solid #ddd;
            ">

              <strong>
                ${escapeHtml(a.titulo || '')}
              </strong>

              <br>

              Comerciante:
              ${escapeHtml(a.id_comerciante || '-')}

              <br>

              Status:

              <span class="badge badge--${escapeHtml(a.status || '')}">
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

        }).join('');

      container
        .querySelectorAll('button[data-acao]')
        .forEach(function (btn) {

          btn.addEventListener('click', async function () {

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

          });

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
        await apiFetch('/api/admin/anuncios/todos');

      const tbody =
        document.getElementById('listaTodos');

      if (!tbody) {
        return;
      }

      if (!Array.isArray(todos) || !todos.length) {

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

                <span class="badge badge--${escapeHtml(a.status || '')}">
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

        }).join('');

      tbody
        .querySelectorAll('button.btn--excluir')
        .forEach(function (btn) {

          btn.addEventListener('click', async function () {

            if (!confirm('Excluir este anúncio?')) {
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

          });

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
        await apiFetch('/api/admin/categorias');

      const tbody =
        document.getElementById('listaCategorias');

      if (!tbody) {
        return;
      }

      if (!Array.isArray(categorias) || !categorias.length) {

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

        }).join('');

      tbody
        .querySelectorAll('button.btn--excluir')
        .forEach(function (btn) {

          btn.addEventListener('click', async function () {

            if (!confirm('Excluir esta categoria?')) {
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

          });

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
    document.getElementById('btnAddCategoria');

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

  const blogEditor =
    document.getElementById(
      'blogConteudo'
    );

  // =========================================================
  // EDITOR - SELEÇÃO
  // =========================================================

  let ultimaSelecao = null;

  function salvarSelecao() {

    if (!blogEditor) {
      return;
    }

    const selecao =
      window.getSelection();

    if (!selecao || !selecao.rangeCount) {
      return;
    }

    const range =
      selecao.getRangeAt(0);

    if (blogEditor.contains(range.commonAncestorContainer)) {

      ultimaSelecao =
        range.cloneRange();

    }

  }

  function restaurarSelecao() {

    if (!ultimaSelecao) {
      return;
    }

    const selecao =
      window.getSelection();

    selecao.removeAllRanges();

    selecao.addRange(
      ultimaSelecao
    );

  }

  // =========================================================
  // EDITOR - EXECUTAR COMANDO
  // =========================================================

  function executarComando(
    comando,
    valor = null
  ) {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    try {

      document.execCommand(
        comando,
        false,
        valor
      );

      salvarSelecao();

    } catch (err) {

      console.error(
        '[editor]',
        err
      );

    }

  }

  // =========================================================
  // EDITOR - INSERIR HTML
  // =========================================================

  function inserirHtml(html) {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    restaurarSelecao();

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

        const temp =
          document.createElement('div');

        temp.innerHTML =
          html;

        const fragment =
          document.createDocumentFragment();

        while (temp.firstChild) {

          fragment.appendChild(
            temp.firstChild
          );

        }

        range.insertNode(
          fragment
        );

        range.collapse(
          false
        );

        selecao.removeAllRanges();

        selecao.addRange(
          range
        );

        salvarSelecao();

        return;

      }

    }

    blogEditor.insertAdjacentHTML(
      'beforeend',
      html
    );

    blogEditor.focus();

  }

  // =========================================================
  // EDITOR - TÍTULOS
  // =========================================================

  function aplicarTitulo(tag) {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    restaurarSelecao();

    executarComando(
      'formatBlock',
      tag
    );

  }

  // =========================================================
  // EDITOR - LINK
  // =========================================================

  function inserirLink() {

    if (!blogEditor) {
      return;
    }

    salvarSelecao();

    const url =
      prompt(
        'Digite a URL do link:'
      );

    if (!url) {
      return;
    }

    blogEditor.focus();

    restaurarSelecao();

    executarComando(
      'createLink',
      url
    );

  }

  // =========================================================
  // EDITOR - UMA IMAGEM
  // =========================================================

  function inserirImagem() {

    if (!blogEditor) {
      return;
    }

    salvarSelecao();

    const url =
      prompt(
        'Cole a URL da imagem:'
      );

    if (!url) {
      return;
    }

    const alt =
      prompt(
        'Digite uma descrição para a imagem:',
        'Imagem do artigo'
      ) || 'Imagem do artigo';

    const html = `

      <img
        src="${escapeAttribute(url)}"
        alt="${escapeAttribute(alt)}"
        class="editor-imagem"
        loading="lazy"
      >

      <p><br></p>

    `;

    inserirHtml(
      html
    );

  }

  // =========================================================
  // EDITOR - VÁRIAS IMAGENS
  // =========================================================

  function inserirVariasImagens() {

    if (!blogEditor) {
      return;
    }

    salvarSelecao();

    const entrada =
      prompt(
        'Cole as URLs das imagens separadas por vírgula ou uma por linha:'
      );

    if (!entrada) {
      return;
    }

    const urls =
      entrada
        .split(/[\n,]+/)
        .map(function (url) {
          return url.trim();
        })
        .filter(Boolean);

    if (!urls.length) {
      return;
    }

    let html = '';

    urls.forEach(function (url, index) {

      html += `

        <img
          src="${escapeAttribute(url)}"
          alt="Imagem ${index + 1} do artigo"
          class="editor-imagem"
          loading="lazy"
        >

        <p><br></p>

      `;

    });

    inserirHtml(
      html
    );

  }

  // =========================================================
  // EDITOR - PARÁGRAFO
  // =========================================================

  function aplicarParagrafo() {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    restaurarSelecao();

    executarComando(
      'formatBlock',
      'P'
    );

  }

  // =========================================================
  // EDITOR - CITAÇÃO
  // =========================================================

  function aplicarCitacao() {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    restaurarSelecao();

    executarComando(
      'formatBlock',
      'BLOCKQUOTE'
    );

  }

  // =========================================================
  // BOTÕES DA BARRA DE FERRAMENTAS
  // =========================================================

  document
    .querySelectorAll('[data-editor-action]')
    .forEach(function (btn) {

      btn.addEventListener(
        'mousedown',
        function (e) {

          /*
           * Impede que o clique na ferramenta
           * destrua a seleção do texto.
           */
          e.preventDefault();

          salvarSelecao();

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
  // AÇÕES DO EDITOR
  // =========================================================

  function executarAcaoEditor(acao) {

    switch (acao) {

      case 'h1':
        aplicarTitulo('H1');
        break;

      case 'h2':
        aplicarTitulo('H2');
        break;

      case 'h3':
        aplicarTitulo('H3');
        break;

      case 'bold':
        executarComando('bold');
        break;

      case 'italic':
        executarComando('italic');
        break;

      case 'link':
        inserirLink();
        break;

      case 'image':
        inserirImagem();
        break;

      case 'imageMultiple':
        inserirVariasImagens();
        break;

      case 'paragraph':
        aplicarParagrafo();
        break;

      case 'quote':
        aplicarCitacao();
        break;

      default:
        console.warn(
          '[editor] Ação desconhecida:',
          acao
        );

    }

  }

  // =========================================================
  // MENU DO BOTÃO DIREITO
  // =========================================================

  const editorContextMenu =
    document.getElementById(
      'editorContextMenu'
    );

  let contextoX = 0;
  let contextoY = 0;

  function mostrarMenuContexto(
    x,
    y
  ) {

    if (!editorContextMenu) {
      return;
    }

    contextoX = x;
    contextoY = y;

    editorContextMenu.classList.remove(
      'escondido'
    );

    editorContextMenu.style.position =
      'fixed';

    editorContextMenu.style.display =
      'block';

    let posX =
      x;

    let posY =
      y;

    const largura =
      editorContextMenu.offsetWidth;

    const altura =
      editorContextMenu.offsetHeight;

    const margem =
      10;

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

    editorContextMenu.style.left =
      `${Math.max(margem, posX)}px`;

    editorContextMenu.style.top =
      `${Math.max(margem, posY)}px`;

  }

  function esconderMenuContexto() {

    if (!editorContextMenu) {
      return;
    }

    editorContextMenu.style.display =
      'none';

    editorContextMenu.classList.add(
      'escondido'
    );

  }

  // =========================================================
  // MENU DIREITO - AÇÕES
  // =========================================================

  if (editorContextMenu) {

    editorContextMenu
      .querySelectorAll(
        '[data-context-action]'
      )
      .forEach(function (btn) {

        btn.addEventListener(
          'mousedown',
          function (e) {

            e.preventDefault();

          }
        );

        btn.addEventListener(
          'click',
          function () {

            const acao =
              btn.dataset.contextAction;

            esconderMenuContexto();

            executarAcaoEditor(
              acao
            );

          }
        );

      });

  }

  // =========================================================
  // EDITOR - BOTÃO DIREITO
  // =========================================================

  if (blogEditor) {

    blogEditor.addEventListener(
      'contextmenu',
      function (e) {

        e.preventDefault();

        salvarSelecao();

        mostrarMenuContexto(
          e.clientX,
          e.clientY
        );

      }
    );

    blogEditor.addEventListener(
      'keyup',
      function () {

        salvarSelecao();

      }
    );

    blogEditor.addEventListener(
      'mouseup',
      function () {

        salvarSelecao();

      }
    );

    blogEditor.addEventListener(
      'input',
      function () {

        salvarSelecao();

      }
    );

  }

  // =========================================================
  // FECHAR MENU DIREITO
  // =========================================================

  document.addEventListener(
    'click',
    function (e) {

      if (
        editorContextMenu &&
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

        const publicado =
          publicadoElement
            ? publicadoElement.checked
            : true;

        let conteudo = '';

        if (blogEditor) {

          conteudo =
            blogEditor.innerHTML.trim();

        }

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

        if (!conteudo) {

          if (erroBlog) {

            erroBlog.textContent =
              'Digite o conteúdo do artigo.';

          }

          return;
        }

        // =====================================================
        // EVITAR DUPLO CLIQUE
        // =====================================================

        btnSalvarArtigo.disabled =
          true;

        btnSalvarArtigo.textContent =
          'Salvando...';

        try {

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

            blogEditor.innerHTML =
              '';

          }

          if (publicadoElement) {

            publicadoElement.checked =
              true;

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

      if (
        !Array.isArray(artigos) ||
        !artigos.length
      ) {

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
                ${escapeHtml(
                  artigo.titulo || ''
                )}
              </td>

              <td>

                <span class="badge badge--${
                  artigo.publicado
                    ? 'ativo'
                    : 'pendente'
                }">

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
                  data-blog-id="${escapeHtml(
                    artigo.id
                  )}"
                >
                  Excluir
                </button>

              </td>

            </tr>

          `;

        }).join('');

      // =====================================================
      // EXCLUIR ARTIGO
      // =====================================================

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
  // SEGURANÇA
  // =========================================================

  function escapeHtml(valor) {

    if (
      valor === null ||
      valor === undefined
    ) {
      return '';
    }

    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }

  function escapeAttribute(valor) {

    return escapeHtml(
      valor
    );

  }

  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  console.log(
    '[admin] Painel administrativo carregado.'
  );

  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
