(function () {
  'use strict';

  // =========================================================
  // CONFIGURAÇÃO
  // =========================================================

  const API = window.location.origin;
  const TOKEN_KEY = 'portal_admin_token';


  // =========================================================
  // ELEMENTOS
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

  const editorContextMenu =
    document.getElementById('editorContextMenu');


  // =========================================================
  // LOG
  // =========================================================

  console.log('[admin] Painel administrativo carregado.');
  console.log('[admin] Botão salvar:', btnSalvarArtigo);
  console.log('[admin] Editor:', blogEditor);


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
      console.error('[admin] Erro ao carregar painel:', erro);
    }

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

    console.log('[API] Requisição:', path, options.method || 'GET');

    const resposta = await fetch(
      `${API}${path}`,
      {
        ...options,
        headers
      }
    );

    let data = {};

    const texto = await resposta.text();

    try {
      data = texto ? JSON.parse(texto) : {};
    } catch (erro) {
      data = {
        mensagem: texto
      };
    }

    console.log(
      '[API] Resposta:',
      resposta.status,
      data
    );

    if (
      resposta.status === 401 ||
      resposta.status === 403
    ) {

      limparToken();
      mostrarLogin();

      throw new Error(
        data.erro ||
        data.error ||
        'Sessão expirada. Faça login novamente.'
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
      async function (e) {

        e.preventDefault();

        console.log('[login] Tentando entrar...');

        if (erroLogin) {
          erroLogin.textContent = '';
        }

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

          if (erroLogin) {
            erroLogin.textContent =
              'Digite usuário e senha.';
          }

          return;

        }

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

            if (erroLogin) {
              erroLogin.textContent =
                data.erro ||
                'Credenciais inválidas.';
            }

            return;

          }

          if (!data.token) {
            throw new Error(
              'O servidor não retornou o token.'
            );
          }

          setToken(data.token);

          await mostrarAdmin();

        } catch (erro) {

          console.error('[login]', erro);

          if (erroLogin) {
            erroLogin.textContent =
              erro.message ||
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
        async function () {

          document
            .querySelectorAll('.tabs button')
            .forEach(function (botao) {
              botao.classList.remove('ativa');
            });

          btn.classList.add('ativa');

          document
            .querySelectorAll('main section')
            .forEach(function (section) {
              section.classList.add('escondido');
            });

          const tabId =
            'tab' +
            capitalize(btn.dataset.tab);

          const tab =
            document.getElementById(tabId);

          if (tab) {
            tab.classList.remove('escondido');
          }

          try {

            if (btn.dataset.tab === 'pendentes') {
              await carregarPendentes();
            }

            if (btn.dataset.tab === 'todos') {
              await carregarTodos();
            }

            if (btn.dataset.tab === 'categorias') {
              await carregarCategorias();
            }

            if (btn.dataset.tab === 'blog') {
              await carregarArtigos();
            }

          } catch (erro) {

            console.error(
              '[abas]',
              erro
            );

          }

        }
      );

    });


  function capitalize(texto) {

    if (!texto) {
      return '';
    }

    return (
      texto.charAt(0).toUpperCase() +
      texto.slice(1)
    );

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
        await apiFetch(
          '/api/admin/anuncios'
        );

      if (
        !Array.isArray(pendentes) ||
        pendentes.length === 0
      ) {

        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;

      }

      container.innerHTML =
        pendentes.map(function (anuncio) {

          return `

            <div
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
              "
            >

              <strong>
                ${escapeHtml(
                  anuncio.titulo || ''
                )}
              </strong>

              <br>

              Comerciante:
              ${escapeHtml(
                anuncio.id_comerciante || '-'
              )}

              <br>

              Status:

              <span class="badge">
                ${escapeHtml(
                  anuncio.status || '-'
                )}
              </span>

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

        }).join('');

      container
        .querySelectorAll('button[data-acao]')
        .forEach(function (btn) {

          btn.addEventListener(
            'click',
            async function () {

              const acao =
                btn.dataset.acao;

              const id =
                btn.dataset.id;

              try {

                btn.disabled = true;

                await apiFetch(
                  `/api/admin/anuncios/${id}/${acao}`,
                  {
                    method: 'PUT'
                  }
                );

                await carregarPendentes();
                await carregarTodos();

              } catch (erro) {

                console.error(
                  '[anuncio]',
                  erro
                );

                alert(erro.message);

                btn.disabled = false;

              }

            }
          );

        });

    } catch (erro) {

      console.error(
        '[pendentes]',
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
      document.getElementById('listaTodos');

    if (!tbody) {
      return;
    }

    try {

      const todos =
        await apiFetch(
          '/api/admin/anuncios/todos'
        );

      if (
        !Array.isArray(todos) ||
        todos.length === 0
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

        return;

      }

      tbody.innerHTML =
        todos.map(function (anuncio) {

          return `

            <tr>

              <td>
                ${escapeHtml(anuncio.id)}
              </td>

              <td>
                ${escapeHtml(anuncio.titulo || '')}
              </td>

              <td>
                ${escapeHtml(anuncio.status || '-')}
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

        }).join('');

      tbody
        .querySelectorAll('button.btn--excluir')
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

                btn.disabled = true;

                await apiFetch(
                  `/api/admin/anuncios/${btn.dataset.id}`,
                  {
                    method: 'DELETE'
                  }
                );

                await carregarTodos();
                await carregarPendentes();

              } catch (erro) {

                console.error(
                  '[excluir anúncio]',
                  erro
                );

                alert(erro.message);

                btn.disabled = false;

              }

            }
          );

        });

    } catch (erro) {

      console.error(
        '[todos anúncios]',
        erro
      );

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
      document.getElementById('listaCategorias');

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
        categorias.map(function (categoria) {

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

        }).join('');

      tbody
        .querySelectorAll('button.btn--excluir')
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

                btn.disabled = true;

                await apiFetch(
                  `/api/admin/categorias/${btn.dataset.id}`,
                  {
                    method: 'DELETE'
                  }
                );

                await carregarCategorias();

              } catch (erro) {

                console.error(
                  '[categoria]',
                  erro
                );

                alert(erro.message);

                btn.disabled = false;

              }

            }
          );

        });

    } catch (erro) {

      console.error(
        '[categorias]',
        erro
      );

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

          console.error(
            '[categoria]',
            erro
          );

          alert(erro.message);

        } finally {

          btnAddCategoria.disabled = false;

        }

      }
    );

  }


  // =========================================================
  // EDITOR
  // =========================================================

  let ultimaSelecao = null;


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
        '[editor] Erro ao restaurar seleção.',
        erro
      );

    }

  }


  function executarComando(
    comando,
    valor = null
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    blogEditor.focus();

    try {

      document.execCommand(
        comando,
        false,
        valor
      );

      salvarSelecao();

    } catch (erro) {

      console.error(
        '[editor]',
        erro
      );

    }

  }


  function aplicarTitulo(tipo) {

    executarComando(
      'formatBlock',
      tipo
    );

  }


  function aplicarParagrafo() {

    executarComando(
      'formatBlock',
      'P'
    );

  }


  function aplicarCitacao() {

    executarComando(
      'formatBlock',
      'BLOCKQUOTE'
    );

  }


  // =========================================================
  // IMAGENS
  // =========================================================

  const inputImagem =
    document.createElement('input');

  inputImagem.type = 'file';
  inputImagem.accept = 'image/*';
  inputImagem.multiple = true;
  inputImagem.style.display = 'none';

  document.body.appendChild(
    inputImagem
  );


  function inserirImagemNoEditor(
    src,
    alt = 'Imagem do artigo'
  ) {

    if (!blogEditor) {
      return;
    }

    restaurarSelecao();

    blogEditor.focus();

    const imagem =
      document.createElement('img');

    imagem.src = src;
    imagem.alt = alt;
    imagem.className = 'editor-imagem';

    imagem.style.maxWidth = '100%';
    imagem.style.height = 'auto';
    imagem.style.display = 'block';
    imagem.style.margin = '15px 0';

    const selecao =
      window.getSelection();

    if (
      selecao &&
      selecao.rangeCount > 0
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

      range.collapse(true);

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


  function inserirImagemURL() {

    salvarSelecao();

    const url =
      prompt(
        'Cole a URL da imagem:'
      );

    if (!url) {
      return;
    }

    inserirImagemNoEditor(
      url
    );

  }


  function escolherImagemComputador() {

    salvarSelecao();

    inputImagem.value = '';

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
            !arquivo.type.startsWith('image/')
          ) {
            return;
          }

          const leitor =
            new FileReader();

          leitor.onload =
            function (evento) {

              inserirImagemNoEditor(
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


  // =========================================================
  // LINK
  // =========================================================

  function inserirLink() {

    salvarSelecao();

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
  // BARRA DE FERRAMENTAS
  // =========================================================

  document
    .querySelectorAll('[data-editor-action]')
    .forEach(function (btn) {

      btn.addEventListener(
        'mousedown',
        function (e) {

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
        inserirImagemURL();
        break;

      case 'imageMultiple':
        escolherImagemComputador();
        break;

      case 'paragraph':
        aplicarParagrafo();
        break;

      case 'quote':
        aplicarCitacao();
        break;

    }

  }


  // =========================================================
  // MENU BOTÃO DIREITO
  // =========================================================

  function mostrarMenuContexto(x, y) {

    if (!editorContextMenu) {
      return;
    }

    editorContextMenu.classList.remove(
      'escondido'
    );

    editorContextMenu.style.display = 'block';
    editorContextMenu.style.position = 'fixed';
    editorContextMenu.style.zIndex = '999999';

    const margem = 10;

    const largura =
      editorContextMenu.offsetWidth;

    const altura =
      editorContextMenu.offsetHeight;

    let posX = x;
    let posY = y;

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
          function (e) {

            e.preventDefault();

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
      'input',
      salvarSelecao
    );

  }


  // =========================================================
  // SALVAR ARTIGO
  // =========================================================

  if (!btnSalvarArtigo) {

    console.error(
      '[blog] ERRO: botão #btnSalvarArtigo não encontrado.'
    );

  } else {

    console.log(
      '[blog] Botão #btnSalvarArtigo encontrado.'
    );


    btnSalvarArtigo.addEventListener(
      'click',
      async function (e) {

        e.preventDefault();

        console.log(
          '[blog] BOTÃO SALVAR CLICADO!'
        );


        if (erroBlog) {
          erroBlog.textContent = '';
        }


        const campoTitulo =
          document.getElementById(
            'blogTitulo'
          );

        const campoResumo =
          document.getElementById(
            'blogResumo'
          );

        const campoCapa =
          document.getElementById(
            'blogCapa'
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


        const capa =
          campoCapa
            ? campoCapa.value.trim()
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
          '[blog] Dados preparados:',
          {
            titulo,
            resumo,
            capa,
            publicado,
            conteudo
          }
        );


        if (!titulo) {

          if (erroBlog) {
            erroBlog.textContent =
              'Digite o título do artigo.';
          }

          alert(
            'Digite o título do artigo.'
          );

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

          alert(
            'Digite o conteúdo do artigo.'
          );

          return;

        }


        btnSalvarArtigo.disabled = true;

        btnSalvarArtigo.textContent =
          'Salvando...';


        try {

          console.log(
            '[blog] Enviando artigo para:',
            `${API}/api/blog`
          );


          const resposta =
            await fetch(
              `${API}/api/blog`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  ...(getToken()
                    ? {
                        Authorization:
                          `Bearer ${getToken()}`
                      }
                    : {})
                },

                body:
                  JSON.stringify({

                    titulo:
                      titulo,

                    resumo:
                      resumo,

                    capa_url:
                      capa || null,

                    conteudo:
                      conteudo,

                    publicado:
                      publicado

                  })
              }
            );


          console.log(
            '[blog] Status HTTP:',
            resposta.status
          );


          const textoResposta =
            await resposta.text();


          console.log(
            '[blog] Resposta do servidor:',
            textoResposta
          );


          let dadosResposta = {};

          try {

            dadosResposta =
              textoResposta
                ? JSON.parse(
                    textoResposta
                  )
                : {};

          } catch (erro) {

            dadosResposta = {
              mensagem:
                textoResposta
            };

          }


          if (!resposta.ok) {

            throw new Error(
              dadosResposta.erro ||
              dadosResposta.error ||
              dadosResposta.mensagem ||
              `Erro HTTP ${resposta.status}`
            );

          }


          console.log(
            '[blog] ARTIGO SALVO COM SUCESSO:',
            dadosResposta
          );


          alert(
            'Artigo salvo com sucesso!'
          );


          if (campoTitulo) {
            campoTitulo.value = '';
          }


          if (campoResumo) {
            campoResumo.value = '';
          }


          if (campoCapa) {
            campoCapa.value = '';
          }


          if (blogEditor) {
            blogEditor.innerHTML = '';
          }


          if (campoPublicado) {
            campoPublicado.checked = true;
          }


          ultimaSelecao = null;

          esconderMenuContexto();


          await carregarArtigos();


        } catch (erro) {

          console.error(
            '[blog] ERRO AO SALVAR ARTIGO:',
            erro
          );


          if (erroBlog) {

            erroBlog.textContent =
              erro.message ||
              'Erro ao salvar artigo.';

          }


          alert(
            'Erro ao salvar artigo:\n\n' +
            (
              erro.message ||
              'Erro desconhecido.'
            )
          );


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
        artigos.map(function (artigo) {

          const status =
            artigo.publicado
              ? 'Publicado'
              : 'Rascunho';


          return `

            <tr>

              <td>
                ${escapeHtml(
                  artigo.id
                )}
              </td>

              <td>
                ${escapeHtml(
                  artigo.titulo || ''
                )}
              </td>

              <td>
                ${status}
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

                btn.disabled = true;

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

              } catch (erro) {

                console.error(
                  '[blog] Erro ao excluir:',
                  erro
                );

                alert(
                  erro.message
                );

                btn.disabled = false;

              }

            }
          );

        });

    } catch (erro) {

      console.error(
        '[blog] Erro ao carregar artigos:',
        erro
      );

      tbody.innerHTML =
        `
        <tr>
          <td colspan="5">
            Erro ao carregar artigos:
            ${escapeHtml(erro.message)}
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


  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
