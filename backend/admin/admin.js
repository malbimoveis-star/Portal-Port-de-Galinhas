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
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (erroLogin) {
        erroLogin.textContent = '';
      }

      const usuario =
        document
          .getElementById('usuario')
          .value
          .trim();

      const senha =
        document
          .getElementById('senha')
          .value;

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

        setToken(data.token);

        mostrarAdmin();

      } catch (err) {
        console.error('[login]', err);

        if (erroLogin) {
          erroLogin.textContent =
            'Erro ao conectar com o servidor.';
        }
      }
    });
  }

  // =========================================================
  // SAIR
  // =========================================================

  if (btnSair) {
    btnSair.addEventListener('click', () => {
      limparToken();
      mostrarLogin();
    });
  }

  // =========================================================
  // ABAS
  // =========================================================

  document
    .querySelectorAll('.tabs button')
    .forEach((btn) => {

      btn.addEventListener('click', () => {

        document
          .querySelectorAll('.tabs button')
          .forEach((b) => {
            b.classList.remove('ativa');
          });

        btn.classList.add('ativa');

        document
          .querySelectorAll('main section')
          .forEach((section) => {
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

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
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

      if (!Array.isArray(pendentes)) {
        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;
      }

      container.innerHTML =
        pendentes.map((a) => `

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

        `).join('') ||

        '<p>Nenhum anúncio pendente.</p>';

      container
        .querySelectorAll('button[data-acao]')
        .forEach((btn) => {

          btn.addEventListener('click', async () => {

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

      if (!Array.isArray(todos)) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

        return;
      }

      tbody.innerHTML =
        todos.map((a) => `

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

        `).join('') ||

        '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

      tbody
        .querySelectorAll('button.btn--excluir')
        .forEach((btn) => {

          btn.addEventListener('click', async () => {

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

      if (!Array.isArray(categorias)) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

        return;
      }

      tbody.innerHTML =
        categorias.map((c) => `

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

        `).join('') ||

        '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

      tbody
        .querySelectorAll('button.btn--excluir')
        .forEach((btn) => {

          btn.addEventListener('click', async () => {

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
      async () => {

        const nome =
          document
            .getElementById('novaCategoriaNome')
            .value
            .trim();

        const icone_url =
          document
            .getElementById('novaCategoriaIcone')
            .value
            .trim();

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

          document
            .getElementById('novaCategoriaNome')
            .value = '';

          document
            .getElementById('novaCategoriaIcone')
            .value = '';

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
    document.getElementById('btnSalvarArtigo');

  const erroBlog =
    document.getElementById('erroBlog');

  const blogEditor =
    document.getElementById('blogConteudo');

  // =========================================================
  // MEMÓRIA DA SELEÇÃO DO EDITOR
  // =========================================================

  let ultimaSelecao = null;

  function salvarSelecao() {

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
      blogEditor.contains(range.commonAncestorContainer)
    ) {

      ultimaSelecao =
        range.cloneRange();

    }

  }

  function restaurarSelecao() {

    if (
      !ultimaSelecao ||
      !blogEditor
    ) {
      blogEditor.focus();
      return;
    }

    const selecao =
      window.getSelection();

    selecao.removeAllRanges();

    selecao.addRange(
      ultimaSelecao
    );

    blogEditor.focus();

  }

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
  // EXECUTAR COMANDO DO EDITOR
  // =========================================================

  function executarComando(
    comando,
    valor = null
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    try {

      document.execCommand(
        comando,
        false,
        valor
      );

      salvarSelecao();

      blogEditor.focus();

    } catch (err) {

      console.error(
        '[editor] Erro:',
        err
      );

    }

  }

  // =========================================================
  // INSERIR HTML NA POSIÇÃO DO CURSOR
  // =========================================================

  function inserirHtmlNoEditor(html) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

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

      blogEditor.focus();

      return;

    }

    const range =
      selecao.getRangeAt(0);

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

    range.collapse(false);

    selecao.removeAllRanges();

    selecao.addRange(range);

    salvarSelecao();

    blogEditor.focus();

  }

  // =========================================================
  // INSERIR IMAGEM
  // =========================================================

  function inserirImagem() {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

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
      ) ||
      'Imagem do artigo';

    const html = `

      <p class="editor-imagem-container">

        <img
          src="${escapeAttribute(url)}"
          alt="${escapeAttribute(alt)}"
          class="editor-imagem"
          loading="lazy"
        >

      </p>

    `;

    inserirHtmlNoEditor(html);

  }

  // =========================================================
  // INSERIR VÁRIAS IMAGENS
  // =========================================================

  function inserirVariasImagens() {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    const quantidadeTexto =
      prompt(
        'Quantas imagens você deseja inserir?'
      );

    if (!quantidadeTexto) {
      return;
    }

    const quantidade =
      parseInt(
        quantidadeTexto,
        10
      );

    if (
      isNaN(quantidade) ||
      quantidade < 1
    ) {

      alert(
        'Digite uma quantidade válida.'
      );

      return;

    }

    if (quantidade > 30) {

      alert(
        'Por segurança, o limite é de 30 imagens por vez.'
      );

      return;

    }

    let html = '';

    for (
      let i = 1;
      i <= quantidade;
      i++
    ) {

      const url =
        prompt(
          `URL da imagem ${i} de ${quantidade}:`
        );

      if (!url) {
        continue;
      }

      const alt =
        prompt(
          `Descrição da imagem ${i}:`,
          `Imagem ${i} do artigo`
        ) ||
        `Imagem ${i} do artigo`;

      html += `

        <p class="editor-imagem-container">

          <img
            src="${escapeAttribute(url)}"
            alt="${escapeAttribute(alt)}"
            class="editor-imagem"
            loading="lazy"
          >

        </p>

      `;

    }

    if (!html) {
      return;
    }

    inserirHtmlNoEditor(html);

  }

  // =========================================================
  // INSERIR LINK
  // =========================================================

  function inserirLink() {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    const selecao =
      window.getSelection();

    if (
      !selecao ||
      selecao.toString().trim() === ''
    ) {

      alert(
        'Selecione primeiro o texto que será transformado em link.'
      );

      return;

    }

    const url =
      prompt(
        'Digite a URL do link:'
      );

    if (!url) {
      return;
    }

    executarComando(
      'createLink',
      url
    );

  }

  // =========================================================
  // PARÁGRAFO
  // =========================================================

  function transformarParagrafo() {

    executarComando(
      'formatBlock',
      'P'
    );

  }

  // =========================================================
  // CITAÇÃO
  // =========================================================

  function transformarCitacao() {

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
    .forEach((btn) => {

      btn.addEventListener(
        'mousedown',
        (e) => {

          // Evita que o clique retire
          // a seleção do texto
          e.preventDefault();

        }
      );

      btn.addEventListener(
        'click',
        () => {

          const acao =
            btn.dataset.editorAction;

          executarAcaoEditor(
            acao
          );

        }
      );

    });

  function executarAcaoEditor(acao) {

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
        transformarParagrafo();
        break;

      case 'quote':
        transformarCitacao();
        break;

      default:

        console.warn(
          '[editor] Ação desconhecida:',
          acao
        );

    }

  }

  // =========================================================
  // MENU DE BOTÃO DIREITO
  // =========================================================

  const editorContextMenu =
    document.getElementById(
      'editorContextMenu'
    );

  let menuContextoAberto =
    false;

  function mostrarMenuContexto(
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

    const margem =
      10;

    const largura =
      editorContextMenu.offsetWidth;

    const altura =
      editorContextMenu.offsetHeight;

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

    editorContextMenu.style.left =
      `${Math.max(margem, posX)}px`;

    editorContextMenu.style.top =
      `${Math.max(margem, posY)}px`;

    menuContextoAberto =
      true;

  }

  function esconderMenuContexto() {

    if (!editorContextMenu) {
      return;
    }

    editorContextMenu.classList.add(
      'escondido'
    );

    editorContextMenu.style.display =
      'none';

    menuContextoAberto =
      false;

  }

  if (blogEditor) {

    blogEditor.addEventListener(
      'contextmenu',
      (e) => {

        e.preventDefault();

        salvarSelecao();

        mostrarMenuContexto(
          e.clientX,
          e.clientY
        );

      }
    );

  }

  // =========================================================
  // AÇÕES DO MENU DE BOTÃO DIREITO
  // =========================================================

  if (editorContextMenu) {

    editorContextMenu
      .querySelectorAll(
        '[data-context-action]'
      )
      .forEach((btn) => {

        btn.addEventListener(
          'mousedown',
          (e) => {

            e.preventDefault();

          }
        );

        btn.addEventListener(
          'click',
          () => {

            const acao =
              btn.dataset.contextAction;

            executarAcaoEditor(
              acao
            );

            esconderMenuContexto();

          }
        );

      });

  }

  // =========================================================
  // FECHAR MENU
  // =========================================================

  document.addEventListener(
    'click',
    (e) => {

      if (
        menuContextoAberto &&
        editorContextMenu &&
        !editorContextMenu.contains(e.target)
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
  // BLOG - SALVAR ARTIGO
  // =========================================================

  if (btnSalvarArtigo) {

    btnSalvarArtigo.addEventListener(
      'click',
      async () => {

        if (erroBlog) {
          erroBlog.textContent = '';
        }

        const titulo =
          document
            .getElementById('blogTitulo')
            .value
            .trim();

        const resumo =
          document
            .getElementById('blogResumo')
            .value
            .trim();

        const capa =
          document
            .getElementById('blogCapa')
            .value
            .trim();

        let conteudo = '';

        if (blogEditor) {

          conteudo =
            blogEditor.innerHTML.trim();

        }

        const publicado =
          document
            .getElementById('blogPublicado')
            .checked;

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
        // EVITA DUPLO CLIQUE
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

          document
            .getElementById('blogTitulo')
            .value = '';

          document
            .getElementById('blogResumo')
            .value = '';

          document
            .getElementById('blogCapa')
            .value = '';

          if (blogEditor) {

            blogEditor.innerHTML =
              '';

          }

          document
            .getElementById('blogPublicado')
            .checked = true;

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
  // BLOG - CARREGAR ARTIGOS
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
        artigos.map((artigo) => {

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

                <span class="badge badge--${
                  artigo.publicado
                    ? 'ativo'
                    : 'pendente'
                }">

                  ${status}

                </span>

              </td>

              <td>
                ${
                  escapeHtml(
                    artigo.criado_em ||
                    artigo.created_at ||
                    '-'
                  )
                }
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

      // =====================================================
      // EXCLUIR ARTIGO
      // =====================================================

      tbody
        .querySelectorAll(
          'button[data-blog-id]'
        )
        .forEach((btn) => {

          btn.addEventListener(
            'click',
            async () => {

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

  function escapeAttribute(valor) {

    return escapeHtml(valor);

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
