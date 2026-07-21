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
  // REQUISIÇÕES PARA API
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
        data.error ||
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
              data.error ||
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

  function capitalize(text) {
    if (!text) {
      return '';
    }

    return text.charAt(0).toUpperCase() +
      text.slice(1);
  }

  // =========================================================
  // ANÚNCIOS PENDENTES
  // =========================================================

  async function carregarPendentes() {

    const container =
      document.getElementById('listaPendentes');

    if (!container) {
      return;
    }

    try {

      const pendentes =
        await apiFetch('/api/admin/anuncios');

      if (!Array.isArray(pendentes)) {

        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;
      }

      container.innerHTML =
        pendentes.map(function (a) {

          return `

            <div style="padding:12px;border-bottom:1px solid #ddd;">

              <strong>
                ${escapeHtml(a.titulo || '')}
              </strong>

              <br>

              Comerciante:
              ${escapeHtml(String(a.id_comerciante || '-'))}

              <br>

              Status:

              <span class="badge badge--${escapeHtml(a.status || '')}">
                ${escapeHtml(a.status || '-')}
              </span>

              <br><br>

              <button
                class="btn btn--aprovar"
                data-acao="aprovar"
                data-id="${escapeHtml(String(a.id))}">
                Aprovar
              </button>

              <button
                class="btn btn--rejeitar"
                data-acao="rejeitar"
                data-id="${escapeHtml(String(a.id))}">
                Rejeitar
              </button>

            </div>

          `;

        }).join('') ||

        '<p>Nenhum anúncio pendente.</p>';

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

      container.innerHTML =
        `<p>Erro ao carregar anúncios: ${escapeHtml(err.message)}</p>`;
    }
  }

  // =========================================================
  // TODOS OS ANÚNCIOS
  // =========================================================

  async function carregarTodos() {

    const tbody =
      document.getElementById('listaTodos');

    if (!tbody) {
      return;
    }

    try {

      const todos =
        await apiFetch('/api/admin/anuncios/todos');

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
                ${escapeHtml(String(a.id))}
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
                ${escapeHtml(String(a.latitude ?? '-'))},
                ${escapeHtml(String(a.longitude ?? '-'))}
              </td>

              <td>

                <button
                  class="btn btn--excluir"
                  data-id="${escapeHtml(String(a.id))}">
                  Excluir
                </button>

              </td>

            </tr>

          `;

        }).join('') ||

        '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

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

      tbody.innerHTML =
        `<tr><td colspan="5">Erro: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // =========================================================
  // CATEGORIAS
  // =========================================================

  async function carregarCategorias() {

    const tbody =
      document.getElementById('listaCategorias');

    if (!tbody) {
      return;
    }

    try {

      const categorias =
        await apiFetch('/api/admin/categorias');

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
                ${escapeHtml(String(c.id))}
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
                  data-id="${escapeHtml(String(c.id))}">
                  Excluir
                </button>

              </td>

            </tr>

          `;

        }).join('') ||

        '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

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

      tbody.innerHTML =
        `<tr><td colspan="5">Erro: ${escapeHtml(err.message)}</td></tr>`;
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
  // BLOG
  // =========================================================

  const btnSalvarArtigo =
    document.getElementById('btnSalvarArtigo');

  const erroBlog =
    document.getElementById('erroBlog');

  // =========================================================
  // EDITOR DE BLOG
  // =========================================================

  const editor =
    document.getElementById('blogConteudoEditor');

  const campoConteudo =
    document.getElementById('blogConteudo');

  // =========================================================
  // CONFIGURA O EDITOR
  // =========================================================

  function configurarEditor() {

    if (!editor) {
      console.warn(
        '[blog] Editor #blogConteudoEditor não encontrado.'
      );

      return;
    }

    editor.setAttribute(
      'contenteditable',
      'true'
    );

    editor.setAttribute(
      'spellcheck',
      'true'
    );

    editor.setAttribute(
      'data-placeholder',
      'Digite o conteúdo do artigo aqui...'
    );

    // -------------------------------------------------------
    // BOTÕES DO EDITOR
    // -------------------------------------------------------

    document
      .querySelectorAll('[data-editor-command]')
      .forEach(function (btn) {

        btn.addEventListener('click', function () {

          const command =
            btn.dataset.editorCommand;

          if (command === 'createLink') {

            const url =
              prompt(
                'Digite a URL do link:'
              );

            if (!url) {
              return;
            }

            document.execCommand(
              'createLink',
              false,
              url
            );

            return;
          }

          if (command === 'insertImage') {

            const url =
              prompt(
                'Digite a URL da imagem:'
              );

            if (!url) {
              return;
            }

            document.execCommand(
              'insertImage',
              false,
              url
            );

            return;
          }

          document.execCommand(
            command,
            false,
            null
          );

          editor.focus();
        });
      });

    // -------------------------------------------------------
    // SELECT DE FORMATAÇÃO
    // -------------------------------------------------------

    const selectFormato =
      document.getElementById('blogFormato');

    if (selectFormato) {

      selectFormato.addEventListener(
        'change',
        function () {

          const valor =
            selectFormato.value;

          if (!valor) {
            return;
          }

          document.execCommand(
            'formatBlock',
            false,
            valor
          );

          editor.focus();

          selectFormato.value = '';
        }
      );
    }

    // -------------------------------------------------------
    // SINCRONIZA EDITOR COM TEXTAREA OCULTO
    // -------------------------------------------------------

    editor.addEventListener(
      'input',
      sincronizarConteudo
    );

    editor.addEventListener(
      'blur',
      sincronizarConteudo
    );
  }

  // =========================================================
  // SINCRONIZAR CONTEÚDO
  // =========================================================

  function sincronizarConteudo() {

    if (!editor || !campoConteudo) {
      return;
    }

    campoConteudo.value =
      editor.innerHTML;
  }

  // =========================================================
  // INSERIR IMAGEM
  // =========================================================

  function inserirImagem(url, alt) {

    if (!editor || !url) {
      return;
    }

    editor.focus();

    const imagem =
      document.createElement('img');

    imagem.src = url;

    imagem.alt =
      alt ||
      'Imagem do artigo';

    imagem.style.maxWidth =
      '100%';

    imagem.style.height =
      'auto';

    imagem.style.display =
      'block';

    imagem.style.margin =
      '20px auto';

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

      editor.appendChild(imagem);

    }

    sincronizarConteudo();
  }

  // =========================================================
  // BOTÃO INSERIR IMAGEM
  // =========================================================

  const btnInserirImagem =
    document.getElementById(
      'btnInserirImagem'
    );

  if (btnInserirImagem) {

    btnInserirImagem.addEventListener(
      'click',
      function () {

        const url =
          prompt(
            'Digite a URL da imagem:'
          );

        if (!url) {
          return;
        }

        const alt =
          prompt(
            'Digite uma descrição para a imagem:'
          ) ||
          'Imagem do artigo';

        inserirImagem(
          url.trim(),
          alt.trim()
        );
      }
    );
  }

  // =========================================================
  // INSERIR LINK
  // =========================================================

  const btnInserirLink =
    document.getElementById(
      'btnInserirLink'
    );

  if (btnInserirLink) {

    btnInserirLink.addEventListener(
      'click',
      function () {

        if (!editor) {
          return;
        }

        editor.focus();

        const selecao =
          window.getSelection();

        const textoSelecionado =
          selecao
            ? selecao.toString()
            : '';

        const url =
          prompt(
            'Digite a URL do link:'
          );

        if (!url) {
          return;
        }

        document.execCommand(
          'createLink',
          false,
          url.trim()
        );

        if (!textoSelecionado) {
          alert(
            'Selecione um texto no editor antes de criar o link.'
          );
        }

        sincronizarConteudo();
      }
    );
  }

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

        // ---------------------------------------------------
        // CAMPOS
        // ---------------------------------------------------

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

        // ---------------------------------------------------
        // PEGA O CONTEÚDO DO EDITOR
        // ---------------------------------------------------

        sincronizarConteudo();

        const conteudo =
          editor
            ? editor.innerHTML.trim()
            : (
                campoConteudo
                  ? campoConteudo.value.trim()
                  : ''
              );

        const publicado =
          document
            .getElementById('blogPublicado')
            .checked;

        // ---------------------------------------------------
        // VALIDAÇÃO
        // ---------------------------------------------------

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

        // ---------------------------------------------------
        // EVITA DUPLO CLIQUE
        // ---------------------------------------------------

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
                    capa,

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

          // -------------------------------------------------
          // LIMPA FORMULÁRIO
          // -------------------------------------------------

          document
            .getElementById('blogTitulo')
            .value = '';

          document
            .getElementById('blogResumo')
            .value = '';

          document
            .getElementById('blogCapa')
            .value = '';

          if (editor) {
            editor.innerHTML = '';
          }

          if (campoConteudo) {
            campoConteudo.value = '';
          }

          document
            .getElementById('blogPublicado')
            .checked = true;

          // -------------------------------------------------
          // ATUALIZA LISTA
          // -------------------------------------------------

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
        artigos.map(function (artigo) {

          const status =
            artigo.publicado
              ? 'Publicado'
              : 'Rascunho';

          return `

            <tr>

              <td>
                ${escapeHtml(String(artigo.id))}
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
                    String(
                      artigo.criado_em ||
                      artigo.created_at ||
                      '-'
                    )
                  )
                }
              </td>

              <td>

                <button
                  class="btn btn--excluir"
                  data-blog-id="${escapeHtml(String(artigo.id))}">
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
  // SEGURANÇA PARA TEXTO NAS TABELAS
  // =========================================================

  function escapeHtml(value) {

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  configurarEditor();

  console.log(
    '[admin] JavaScript administrativo carregado.'
  );

  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
