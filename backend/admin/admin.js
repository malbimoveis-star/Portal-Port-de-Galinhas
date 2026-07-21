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

      const usuario = document
        .getElementById('usuario')
        .value
        .trim();

      const senha = document
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
  // TABS
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

          <div style="padding:12px;border-bottom:1px solid #ddd;">

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
              data-id="${escapeHtml(a.id)}">
              Aprovar
            </button>

            <button
              class="btn btn--rejeitar"
              data-acao="rejeitar"
              data-id="${escapeHtml(a.id)}">
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
                data-id="${escapeHtml(a.id)}">
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
                data-id="${escapeHtml(c.id)}">
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
    document.getElementById(
      'btnAddCategoria'
    );

  if (btnAddCategoria) {

    btnAddCategoria.addEventListener(
      'click',
      async () => {

        const nome =
          document
            .getElementById(
              'novaCategoriaNome'
            )
            .value
            .trim();

        const icone_url =
          document
            .getElementById(
              'novaCategoriaIcone'
            )
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
            .getElementById(
              'novaCategoriaNome'
            )
            .value = '';

          document
            .getElementById(
              'novaCategoriaIcone'
            )
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
  // BLOG - ELEMENTOS DO EDITOR
  // =========================================================

  const btnSalvarArtigo =
    document.getElementById(
      'btnSalvarArtigo'
    );

  const erroBlog =
    document.getElementById(
      'erroBlog'
    );

  // Editor novo
  const blogEditor =
    document.getElementById(
      'blogEditor'
    );

  // Campo antigo de conteúdo
  const blogConteudo =
    document.getElementById(
      'blogConteudo'
    );

  // =========================================================
  // EDITOR VISUAL
  // =========================================================

  function executarComando(comando, valor = null) {

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
    } catch (err) {
      console.error(
        '[editor] Erro no comando:',
        comando,
        err
      );
    }
  }

  // =========================================================
  // BOTÕES DA BARRA DE FERRAMENTAS
  // =========================================================

  document
    .querySelectorAll('[data-editor-command]')
    .forEach((btn) => {

      btn.addEventListener('click', () => {

        const comando =
          btn.dataset.editorCommand;

        executarComando(comando);

      });

    });

  // =========================================================
  // TÍTULOS H1 H2 H3
  // =========================================================

  document
    .querySelectorAll('[data-editor-heading]')
    .forEach((btn) => {

      btn.addEventListener('click', () => {

        const heading =
          btn.dataset.editorHeading;

        executarComando(
          'formatBlock',
          heading
        );

      });

    });

  // =========================================================
  // INSERIR LINK
  // =========================================================

  document
    .querySelectorAll('[data-editor-link]')
    .forEach((btn) => {

      btn.addEventListener('click', () => {

        if (!blogEditor) {
          return;
        }

        blogEditor.focus();

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

      });

    });

  // =========================================================
  // INSERIR IMAGEM
  // =========================================================

  document
    .querySelectorAll('[data-editor-image]')
    .forEach((btn) => {

      btn.addEventListener('click', () => {

        inserirImagem();

      });

    });

  function inserirImagem() {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

    const url =
      prompt(
        'Cole a URL da imagem:'
      );

    if (!url) {
      return;
    }

    const imagem =
      document.createElement('img');

    imagem.src = url;

    imagem.alt =
      'Imagem do artigo';

    imagem.className =
      'editor-imagem';

    imagem.loading =
      'lazy';

    imagem.addEventListener(
      'error',
      () => {

        alert(
          'Não foi possível carregar esta imagem. Verifique a URL.'
        );

        imagem.remove();

      }
    );

    const selecao =
      window.getSelection();

    if (
      selecao &&
      selecao.rangeCount > 0
    ) {

      const range =
        selecao.getRangeAt(0);

      range.deleteContents();

      range.insertNode(imagem);

      range.setStartAfter(imagem);

      range.collapse(true);

      selecao.removeAllRanges();

      selecao.addRange(range);

    } else {

      blogEditor.appendChild(
        imagem
      );

    }

    blogEditor.focus();
  }

  // =========================================================
  // BOTÃO DIREITO DO MOUSE
  // =========================================================

  let editorContextMenu = null;

  function criarMenuContexto() {

    if (editorContextMenu) {
      return editorContextMenu;
    }

    editorContextMenu =
      document.createElement('div');

    editorContextMenu.className =
      'editor-context-menu';

    editorContextMenu.innerHTML = `

      <button type="button" data-context-action="h1">
        Título H1
      </button>

      <button type="button" data-context-action="h2">
        Título H2
      </button>

      <button type="button" data-context-action="h3">
        Título H3
      </button>

      <div class="context-separador"></div>

      <button type="button" data-context-action="bold">
        Negrito
      </button>

      <button type="button" data-context-action="italic">
        Itálico
      </button>

      <button type="button" data-context-action="underline">
        Sublinhado
      </button>

      <div class="context-separador"></div>

      <button type="button" data-context-action="link">
        🔗 Inserir link
      </button>

      <button type="button" data-context-action="image">
        🖼️ Inserir imagem
      </button>

      <div class="context-separador"></div>

      <button type="button" data-context-action="ul">
        Lista com marcadores
      </button>

      <button type="button" data-context-action="ol">
        Lista numerada
      </button>

    `;

    document.body.appendChild(
      editorContextMenu
    );

    editorContextMenu
      .querySelectorAll(
        '[data-context-action]'
      )
      .forEach((btn) => {

        btn.addEventListener(
          'click',
          () => {

            const acao =
              btn.dataset.contextAction;

            executarAcaoContexto(
              acao
            );

            esconderMenuContexto();

          }
        );

      });

    return editorContextMenu;
  }

  function mostrarMenuContexto(x, y) {

    const menu =
      criarMenuContexto();

    menu.style.display =
      'block';

    const largura =
      menu.offsetWidth;

    const altura =
      menu.offsetHeight;

    const margem =
      10;

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

  function esconderMenuContexto() {

    if (editorContextMenu) {

      editorContextMenu.style.display =
        'none';

    }

  }

  function executarAcaoContexto(acao) {

    if (!blogEditor) {
      return;
    }

    blogEditor.focus();

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

      case 'link': {

        const url =
          prompt(
            'Digite a URL do link:'
          );

        if (url) {

          executarComando(
            'createLink',
            url
          );

        }

        break;
      }

      case 'image':

        inserirImagem();

        break;

    }

  }

  if (blogEditor) {

    blogEditor.addEventListener(
      'contextmenu',
      (e) => {

        e.preventDefault();

        mostrarMenuContexto(
          e.clientX,
          e.clientY
        );

      }
    );

    blogEditor.addEventListener(
      'click',
      () => {

        esconderMenuContexto();

      }
    );

  }

  document.addEventListener(
    'click',
    (e) => {

      if (
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

        console.log(
          '[blog] Botão Salvar artigo clicado'
        );

        if (erroBlog) {
          erroBlog.textContent = '';
        }

        const titulo =
          document
            .getElementById(
              'blogTitulo'
            )
            .value
            .trim();

        const resumo =
          document
            .getElementById(
              'blogResumo'
            )
            .value
            .trim();

        const capa =
          document
            .getElementById(
              'blogCapa'
            )
            .value
            .trim();

        let conteudo = '';

        // =====================================================
        // PEGA CONTEÚDO DO EDITOR VISUAL
        // =====================================================

        if (blogEditor) {

          conteudo =
            blogEditor.innerHTML.trim();

        } else if (blogConteudo) {

          conteudo =
            blogConteudo.value.trim();

        }

        const publicado =
          document
            .getElementById(
              'blogPublicado'
            )
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

        if (!conteudo) {

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

          console.log(
            '[blog] Enviando artigo para:',
            `${API}/api/blog`
          );

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
          // LIMPA FORMULÁRIO
          // ===================================================

          document
            .getElementById(
              'blogTitulo'
            )
            .value = '';

          document
            .getElementById(
              'blogResumo'
            )
            .value = '';

          document
            .getElementById(
              'blogCapa'
            )
            .value = '';

          if (blogEditor) {

            blogEditor.innerHTML =
              '';

          }

          if (blogConteudo) {

            blogConteudo.value =
              '';

          }

          document
            .getElementById(
              'blogPublicado'
            )
            .checked = true;

          // ===================================================
          // ATUALIZA LISTA
          // ===================================================

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

      console.log(
        '[blog] Carregando artigos...'
      );

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
                  data-blog-id="${escapeHtml(artigo.id)}">
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
  // SEGURANÇA - ESCAPAR HTML
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
    '[admin] JavaScript administrativo carregado.'
  );

  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
