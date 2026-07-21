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

  const btnSalvarArtigo =
    document.getElementById('btnSalvarArtigo');

  const erroBlog =
    document.getElementById('erroBlog');

  const blogEditor =
    document.getElementById('blogConteudo');

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
      headers.Authorization =
        `Bearer ${token}`;
    }

    const resposta =
      await fetch(
        `${API}${path}`,
        {
          ...options,
          headers
        }
      );

    let data = {};

    try {

      data =
        await resposta.json();

    } catch (e) {

      data = {};

    }

    if (
      resposta.status === 401 ||
      resposta.status === 403
    ) {

      limparToken();
      mostrarLogin();

      throw new Error(
        data.erro ||
        'Sessão expirada. Faça login novamente.'
      );

    }

    if (!resposta.ok) {

      throw new Error(
        data.erro ||
        data.error ||
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
      async function (e) {

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

          const resposta =
            await fetch(
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

          const data =
            await resposta.json();

          if (!resposta.ok) {

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

          console.error(
            '[login]',
            err
          );

          if (erroLogin) {

            erroLogin.textContent =
              'Erro ao conectar com o servidor.';

          }

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

        limparToken();

        mostrarLogin();

      }
    );

  }

  // =========================================================
  // ABAS
  // =========================================================

  document
    .querySelectorAll('.tabs button')
    .forEach(function (btn) {

      btn.addEventListener(
        'click',
        function () {

          document
            .querySelectorAll('.tabs button')
            .forEach(function (botao) {

              botao.classList.remove(
                'ativa'
              );

            });

          btn.classList.add('ativa');

          document
            .querySelectorAll('main section')
            .forEach(function (section) {

              section.classList.add(
                'escondido'
              );

            });

          const nomeTab =
            btn.dataset.tab
              .charAt(0)
              .toUpperCase() +
            btn.dataset.tab.slice(1);

          const tab =
            document.getElementById(
              `tab${nomeTab}`
            );

          if (tab) {

            tab.classList.remove(
              'escondido'
            );

          }

          if (
            btn.dataset.tab === 'blog'
          ) {

            carregarArtigos();

          }

        }
      );

    });

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

      if (
        !Array.isArray(pendentes) ||
        pendentes.length === 0
      ) {

        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;

      }

      container.innerHTML =
        pendentes
          .map(function (a) {

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

          })
          .join('');

      container
        .querySelectorAll(
          'button[data-acao]'
        )
        .forEach(function (btn) {

          btn.addEventListener(
            'click',
            async function () {

              try {

                await apiFetch(
                  `/api/admin/anuncios/${btn.dataset.id}/${btn.dataset.acao}`,
                  {
                    method: 'PUT'
                  }
                );

                await carregarPendentes();
                await carregarTodos();

              } catch (err) {

                alert(
                  err.message
                );

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

      if (
        !Array.isArray(todos) ||
        todos.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

        return;

      }

      tbody.innerHTML =
        todos
          .map(function (a) {

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

          })
          .join('');

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

                alert(
                  err.message
                );

              }

            }
          );

        });

    } catch (err) {

      console.error(
        '[todos]',
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

      if (
        !Array.isArray(categorias) ||
        categorias.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

        return;

      }

      tbody.innerHTML =
        categorias
          .map(function (c) {

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

          })
          .join('');

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

                alert(
                  err.message
                );

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

        const campoNome =
          document.getElementById(
            'novaCategoriaNome'
          );

        const campoIcone =
          document.getElementById(
            'novaCategoriaIcone'
          );

        const nome =
          campoNome.value.trim();

        const icone_url =
          campoIcone.value.trim();

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

          campoNome.value = '';
          campoIcone.value = '';

          await carregarCategorias();

        } catch (err) {

          alert(
            err.message
          );

        }

      }
    );

  }

  // =========================================================
  // EDITOR DO BLOG
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
      blogEditor.contains(
        range.commonAncestorContainer
      )
    ) {

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

  if (blogEditor) {

    blogEditor.addEventListener(
      'mouseup',
      salvarSelecao
    );

    blogEditor.addEventListener(
      'keyup',
      salvarSelecao
    );

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

    restaurarSelecao();

    blogEditor.focus();

    document.execCommand(
      comando,
      false,
      valor
    );

    salvarSelecao();

  }

  // =========================================================
  // FORMATAR BLOCO
  // =========================================================

  function formatarBloco(
    tipo
  ) {

    executarComando(
      'formatBlock',
      tipo
    );

  }

  // =========================================================
  // LINK
  // =========================================================

  function inserirLink() {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

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
  // INSERIR IMAGEM POR URL
  // =========================================================

  function inserirImagemUrl() {

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

    const imagem =
      document.createElement(
        'img'
      );

    imagem.src =
      url;

    imagem.alt =
      'Imagem do artigo';

    imagem.className =
      'editor-imagem';

    imagem.loading =
      'lazy';

    inserirElementoNoCursor(
      imagem
    );

  }

  // =========================================================
  // ESCOLHER IMAGEM DO COMPUTADOR
  // =========================================================

  function escolherImagemComputador(
    varias = false
  ) {

    if (!blogEditor) {
      return;
    }

    salvarSelecao();

    const input =
      document.createElement(
        'input'
      );

    input.type =
      'file';

    input.accept =
      'image/*';

    input.multiple =
      varias;

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

        if (
          arquivos.length === 0
        ) {

          input.remove();

          return;

        }

        arquivos.forEach(
          function (arquivo) {

            inserirImagemArquivo(
              arquivo
            );

          }
        );

        input.remove();

      }
    );

    input.click();

  }

  // =========================================================
  // INSERIR IMAGEM DO ARQUIVO
  // =========================================================

  function inserirImagemArquivo(
    arquivo
  ) {

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

        const imagem =
          document.createElement(
            'img'
          );

        imagem.src =
          evento.target.result;

        imagem.alt =
          arquivo.name;

        imagem.className =
          'editor-imagem';

        imagem.loading =
          'lazy';

        inserirElementoNoCursor(
          imagem
        );

      };

    leitor.readAsDataURL(
      arquivo
    );

  }

  // =========================================================
  // INSERIR ELEMENTO NO CURSOR
  // =========================================================

  function inserirElementoNoCursor(
    elemento
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    blogEditor.focus();

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
          elemento
        );

        range.setStartAfter(
          elemento
        );

        range.collapse(
          true
        );

        selecao.removeAllRanges();

        selecao.addRange(
          range
        );

        salvarSelecao();

        return;

      }

    }

    blogEditor.appendChild(
      elemento
    );

  }

  // =========================================================
  // MENU DE AÇÕES DO EDITOR
  // =========================================================

  function executarAcaoEditor(
    acao
  ) {

    switch (acao) {

      case 'h1':

        formatarBloco(
          'H1'
        );

        break;

      case 'h2':

        formatarBloco(
          'H2'
        );

        break;

      case 'h3':

        formatarBloco(
          'H3'
        );

        break;

      case 'paragraph':

        formatarBloco(
          'P'
        );

        break;

      case 'quote':

        formatarBloco(
          'BLOCKQUOTE'
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

      case 'image':

        inserirImagemUrl();

        break;

      case 'imageComputer':

        escolherImagemComputador(
          false
        );

        break;

      case 'imageMultiple':

        escolherImagemComputador(
          true
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

    }

  }

  // =========================================================
  // BOTÕES DA BARRA
  // =========================================================

  document
    .querySelectorAll(
      '[data-editor-action]'
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

          executarAcaoEditor(
            btn.dataset.editorAction
          );

        }
      );

    });

  // =========================================================
  // MENU BOTÃO DIREITO
  // =========================================================

  const menuContexto =
    document.getElementById(
      'editorContextMenu'
    );

  function mostrarMenuContexto(
    x,
    y
  ) {

    if (!menuContexto) {
      return;
    }

    menuContexto.classList.remove(
      'escondido'
    );

    menuContexto.style.position =
      'fixed';

    menuContexto.style.left =
      `${x}px`;

    menuContexto.style.top =
      `${y}px`;

    const largura =
      menuContexto.offsetWidth;

    const altura =
      menuContexto.offsetHeight;

    if (
      x + largura >
      window.innerWidth
    ) {

      menuContexto.style.left =
        `${window.innerWidth - largura - 10}px`;

    }

    if (
      y + altura >
      window.innerHeight
    ) {

      menuContexto.style.top =
        `${window.innerHeight - altura - 10}px`;

    }

  }

  function esconderMenuContexto() {

    if (menuContexto) {

      menuContexto.classList.add(
        'escondido'
      );

    }

  }

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

  }

  if (menuContexto) {

    menuContexto
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

  document.addEventListener(
    'click',
    function (e) {

      if (
        menuContexto &&
        !menuContexto.contains(
          e.target
        )
      ) {

        esconderMenuContexto();

      }

    }
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

        const publicado =
          document
            .getElementById(
              'blogPublicado'
            )
            .checked;

        let conteudo =
          '';

        if (blogEditor) {

          conteudo =
            blogEditor.innerHTML.trim();

        }

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

          await carregarArtigos();

        } catch (err) {

          console.error(
            '[blog]',
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
        artigos.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum artigo cadastrado.</td></tr>';

        return;

      }

      tbody.innerHTML =
        artigos
          .map(function (artigo) {

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
                    ${
                      artigo.publicado
                        ? 'Publicado'
                        : 'Rascunho'
                    }
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

          })
          .join('');

      tbody
        .querySelectorAll(
          '[data-blog-id]'
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

                alert(
                  err.message
                );

              }

            }
          );

        });

    } catch (err) {

      console.error(
        '[blog]',
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
