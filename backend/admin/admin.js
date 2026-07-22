(function () {
  'use strict';

  console.log('[ADMIN] admin.js iniciado');

  // =========================================================
  // CONFIGURAÇÃO
  // =========================================================

  const API = window.location.origin;
  const TOKEN_KEY = 'portal_admin_token';

  // =========================================================
  // ESTADO
  // =========================================================

  let artigoEmEdicaoId = null;
  let anuncioEmEdicaoId = null;
  let categoriaEmEdicaoId = null;

  let ultimaSelecao = null;

  // =========================================================
  // AUXILIARES
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


  function getToken() {

    return localStorage.getItem(
      TOKEN_KEY
    );

  }


  function salvarToken(token) {

    localStorage.setItem(
      TOKEN_KEY,
      token
    );

  }


  function removerToken() {

    localStorage.removeItem(
      TOKEN_KEY
    );

  }


  function mostrarErro(
    elemento,
    mensagem
  ) {

    if (elemento) {

      elemento.textContent =
        mensagem || '';

    }

  }


  // =========================================================
  // ELEMENTOS PRINCIPAIS
  // =========================================================

  const telaLogin =
    document.getElementById(
      'telaLogin'
    );


  const telaAdmin =
    document.getElementById(
      'telaAdmin'
    );


  const formLogin =
    document.getElementById(
      'formLogin'
    );


  const erroLogin =
    document.getElementById(
      'erroLogin'
    );


  const btnSair =
    document.getElementById(
      'btnSair'
    );


  // =========================================================
  // BLOG
  // =========================================================

  const blogEditor =
    document.getElementById(
      'blogConteudo'
    );


  const btnSalvarArtigo =
    document.getElementById(
      'btnSalvarArtigo'
    );


  const btnCancelarEdicao =
    document.getElementById(
      'btnCancelarEdicao'
    );


  const erroBlog =
    document.getElementById(
      'erroBlog'
    );


  const editorContextMenu =
    document.getElementById(
      'editorContextMenu'
    );


  const blogIdEdicao =
    document.getElementById(
      'blogIdEdicao'
    );


  const tituloFormularioBlog =
    document.getElementById(
      'tituloFormularioBlog'
    );


  const descricaoFormularioBlog =
    document.getElementById(
      'descricaoFormularioBlog'
    );


  // =========================================================
  // NAVEGAÇÃO ENTRE ABAS
  // =========================================================

  function esconderTodasAsSections() {

    document
      .querySelectorAll(
        'main section'
      )
      .forEach(
        function (section) {

          section.classList.add(
            'escondido'
          );

        }
      );

  }


  function ativarAba(
    nomeTab
  ) {

    document
      .querySelectorAll(
        '.tabs button'
      )
      .forEach(
        function (botao) {

          botao.classList.remove(
            'ativa'
          );

        }
      );


    const botaoAba =
      document.querySelector(
        `.tabs button[data-tab="${nomeTab}"]`
      );


    if (botaoAba) {

      botaoAba.classList.add(
        'ativa'
      );

    }

  }


  function mostrarSecao(
    idSecao
  ) {

    esconderTodasAsSections();


    const section =
      document.getElementById(
        idSecao
      );


    if (section) {

      section.classList.remove(
        'escondido'
      );

    }

  }


  function voltarParaTodosAnuncios() {

    anuncioEmEdicaoId =
      null;

    mostrarSecao(
      'tabTodos'
    );

    ativarAba(
      'todos'
    );

    carregarTodos();

  }


  function voltarParaCategorias() {

    categoriaEmEdicaoId =
      null;

    mostrarSecao(
      'tabCategorias'
    );

    ativarAba(
      'categorias'
    );

    carregarCategorias();

  }


  // =========================================================
  // LOGIN / LOGOUT
  // =========================================================

  function mostrarLogin() {

    if (telaLogin) {

      telaLogin.classList.remove(
        'escondido'
      );

    }


    if (telaAdmin) {

      telaAdmin.classList.add(
        'escondido'
      );

    }

  }


  async function mostrarAdmin() {

    if (telaLogin) {

      telaLogin.classList.add(
        'escondido'
      );

    }


    if (telaAdmin) {

      telaAdmin.classList.remove(
        'escondido'
      );

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

  async function apiFetch(
    url,
    options = {}
  ) {

    const token =
      getToken();


    const headers = {
      ...(options.headers || {})
    };


    if (token) {

      headers.Authorization =
        'Bearer ' +
        token;

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

        data =
          JSON.parse(
            texto
          );

      } catch (erro) {

        data = {
          mensagem:
            texto
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
          document.getElementById(
            'usuario'
          );


        const campoSenha =
          document.getElementById(
            'senha'
          );


        const usuario =
          campoUsuario
            ? campoUsuario.value.trim()
            : '';


        const senha =
          campoSenha
            ? campoSenha.value
            : '';


        if (
          !usuario ||
          !senha
        ) {

          mostrarErro(
            erroLogin,
            'Digite usuário e senha.'
          );

          return;

        }


        try {

          const resposta =
            await fetch(
              API +
              '/api/login',
              {
                method:
                  'POST',

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

        cancelarEdicaoArtigo();

        cancelarEdicaoAnuncio();

        cancelarEdicaoCategoria();

        mostrarLogin();

      }
    );

  }


  // =========================================================
  // ABAS
  // =========================================================

  document
    .querySelectorAll(
      '.tabs button'
    )
    .forEach(
      function (botao) {

        botao.addEventListener(
          'click',
          async function () {

            const nomeTab =
              botao.dataset.tab;


            ativarAba(
              nomeTab
            );


            const idTab =
              'tab' +
              nomeTab.charAt(0).toUpperCase() +
              nomeTab.slice(1);


            mostrarSecao(
              idTab
            );


            if (
              nomeTab ===
              'pendentes'
            ) {

              await carregarPendentes();

            }


            if (
              nomeTab ===
              'todos'
            ) {

              await carregarTodos();

            }


            if (
              nomeTab ===
              'categorias'
            ) {

              await carregarCategorias();

            }


            if (
              nomeTab ===
              'blog'
            ) {

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
        anuncios
          .map(
            function (anuncio) {

              return `

                <div
                  style="
                    padding:15px;
                    border-bottom:1px solid #ddd;
                  "
                >

                  <strong>
                    ${escapeHtml(
                      anuncio.titulo ||
                      ''
                    )}
                  </strong>

                  <br><br>

                  Status:
                  ${escapeHtml(
                    anuncio.status ||
                    '-'
                  )}

                  <br><br>

                  <button
                    type="button"
                    class="btn btn--aprovar"
                    data-acao="aprovar"
                    data-id="${escapeHtml(
                      anuncio.id
                    )}"
                  >
                    Aprovar
                  </button>


                  <button
                    type="button"
                    class="btn btn--rejeitar"
                    data-acao="rejeitar"
                    data-id="${escapeHtml(
                      anuncio.id
                    )}"
                  >
                    Rejeitar
                  </button>

                </div>

              `;

            }
          )
          .join('');


      container
        .querySelectorAll(
          '[data-acao]'
        )
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

                  botao.disabled =
                    true;


                  await apiFetch(
                    `/api/admin/anuncios/${id}/${acao}`,
                    {
                      method:
                        'PUT'
                    }
                  );


                  await carregarPendentes();

                  await carregarTodos();


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
        '[PENDENTES]',
        erro
      );


      container.innerHTML =
        `<p class="erro">
          ${escapeHtml(
            erro.message
          )}
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
        anuncios
          .map(
            function (anuncio) {

              return `

                <tr>

                  <td>
                    ${escapeHtml(
                      anuncio.id
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      anuncio.titulo ||
                      ''
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      anuncio.status ||
                      ''
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      anuncio.latitude ??
                      '-'
                    )}
                    ,
                    ${escapeHtml(
                      anuncio.longitude ??
                      '-'
                    )}
                  </td>


                  <td>

                    <button
                      type="button"
                      class="btn btn--principal"
                      data-anuncio-editar-id="${escapeHtml(
                        anuncio.id
                      )}"
                    >
                      Editar
                    </button>


                    <button
                      type="button"
                      class="btn btn--excluir"
                      data-anuncio-excluir-id="${escapeHtml(
                        anuncio.id
                      )}"
                    >
                      Excluir
                    </button>

                  </td>

                </tr>

              `;

            }
          )
          .join('');


      // =====================================================
      // EDITAR ANÚNCIO
      // =====================================================

      tbody
        .querySelectorAll(
          '[data-anuncio-editar-id]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.anuncioEditarId;


                if (!id) {

                  return;

                }


                botao.disabled =
                  true;


                try {

                  await editarAnuncio(
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
      // EXCLUIR ANÚNCIO
      // =====================================================

      tbody
        .querySelectorAll(
          '[data-anuncio-excluir-id]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.anuncioExcluirId;


                if (!id) {

                  return;

                }


                if (
                  !confirm(
                    'Excluir este anúncio?'
                  )
                ) {

                  return;

                }


                try {

                  botao.disabled =
                    true;


                  await apiFetch(
                    `/api/admin/anuncios/${id}`,
                    {
                      method:
                        'DELETE'
                    }
                  );


                  await carregarTodos();

                  await carregarPendentes();


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
        '[TODOS ANUNCIOS]',
        erro
      );


      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            ${escapeHtml(
              erro.message
            )}
          </td>
        </tr>`;

    }

  }


  // =========================================================
  // EDITAR ANÚNCIO
  // =========================================================

  async function editarAnuncio(
    id
  ) {

    try {

      const anuncio =
        await apiFetch(
          `/api/admin/anuncios/${id}`
        );


      anuncioEmEdicaoId =
        anuncio.id ||
        id;


      const campoId =
        document.getElementById(
          'editarAnuncioId'
        );


      const campoTitulo =
        document.getElementById(
          'editarAnuncioTitulo'
        );


      const campoDescricao =
        document.getElementById(
          'editarAnuncioDescricao'
        );


      const campoTelefone =
        document.getElementById(
          'editarAnuncioTelefone'
        );


      const campoEndereco =
        document.getElementById(
          'editarAnuncioEndereco'
        );


      const campoLatitude =
        document.getElementById(
          'editarAnuncioLatitude'
        );


      const campoLongitude =
        document.getElementById(
          'editarAnuncioLongitude'
        );


      const campoStatus =
        document.getElementById(
          'editarAnuncioStatus'
        );


      if (campoId) {

        campoId.value =
          anuncioEmEdicaoId;

      }


      if (campoTitulo) {

        campoTitulo.value =
          anuncio.titulo ||
          '';

      }


      if (campoDescricao) {

        campoDescricao.value =
          anuncio.descricao ||
          anuncio.descricao_curta ||
          '';

      }


      if (campoTelefone) {

        campoTelefone.value =
          anuncio.telefone ||
          '';

      }


      if (campoEndereco) {

        campoEndereco.value =
          anuncio.endereco ||
          '';

      }


      if (campoLatitude) {

        campoLatitude.value =
          anuncio.latitude ??
          '';

      }


      if (campoLongitude) {

        campoLongitude.value =
          anuncio.longitude ??
          '';

      }


      if (campoStatus) {

        campoStatus.value =
          anuncio.status ||
          'pendente';

      }


      mostrarErro(
        document.getElementById(
          'erroEditarAnuncio'
        ),
        ''
      );


      mostrarSecao(
        'tabEditarAnuncio'
      );


      ativarAba(
        'todos'
      );


    } catch (erro) {

      console.error(
        '[EDITAR ANUNCIO]',
        erro
      );


      alert(
        'Não foi possível carregar o anúncio.\n\n' +
        erro.message
      );

    }

  }


  // =========================================================
  // SALVAR EDIÇÃO DO ANÚNCIO
  // =========================================================

  const btnSalvarEdicaoAnuncio =
    document.getElementById(
      'btnSalvarEdicaoAnuncio'
    );


  if (btnSalvarEdicaoAnuncio) {

    btnSalvarEdicaoAnuncio.addEventListener(
      'click',
      async function () {

        const erro =
          document.getElementById(
            'erroEditarAnuncio'
          );


        mostrarErro(
          erro,
          ''
        );


        const id =
          anuncioEmEdicaoId ||
          document.getElementById(
            'editarAnuncioId'
          )?.value;


        const titulo =
          document.getElementById(
            'editarAnuncioTitulo'
          )?.value.trim() ||
          '';


        const descricao =
          document.getElementById(
            'editarAnuncioDescricao'
          )?.value.trim() ||
          '';


        const telefone =
          document.getElementById(
            'editarAnuncioTelefone'
          )?.value.trim() ||
          '';


        const endereco =
          document.getElementById(
            'editarAnuncioEndereco'
          )?.value.trim() ||
          '';


        const latitude =
          document.getElementById(
            'editarAnuncioLatitude'
          )?.value.trim() ||
          '';


        const longitude =
          document.getElementById(
            'editarAnuncioLongitude'
          )?.value.trim() ||
          '';


        const status =
          document.getElementById(
            'editarAnuncioStatus'
          )?.value ||
          'pendente';


        if (!id) {

          mostrarErro(
            erro,
            'ID do anúncio não encontrado.'
          );

          return;

        }


        if (!titulo) {

          mostrarErro(
            erro,
            'Digite o título do anúncio.'
          );

          return;

        }


        try {

          btnSalvarEdicaoAnuncio.disabled =
            true;


          btnSalvarEdicaoAnuncio.textContent =
            'Salvando...';


          await apiFetch(
            `/api/admin/anuncios/${id}`,
            {
              method:
                'PUT',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({

                  titulo,

                  descricao,

                  telefone,

                  endereco,

                  latitude,

                  longitude,

                  status

                })

            }
          );


          alert(
            'Anúncio atualizado com sucesso!'
          );


          cancelarEdicaoAnuncio();


          await carregarTodos();

          await carregarPendentes();


        } catch (erroSalvar) {

          console.error(
            '[SALVAR ANUNCIO]',
            erroSalvar
          );


          mostrarErro(
            erro,
            'Erro ao atualizar anúncio: ' +
            erroSalvar.message
          );


        } finally {

          btnSalvarEdicaoAnuncio.disabled =
            false;


          btnSalvarEdicaoAnuncio.textContent =
            'Salvar alterações';

        }

      }
    );

  }


  // =========================================================
  // CANCELAR EDIÇÃO DO ANÚNCIO
  // =========================================================

  function cancelarEdicaoAnuncio() {

    anuncioEmEdicaoId =
      null;


    const campoId =
      document.getElementById(
        'editarAnuncioId'
      );


    if (campoId) {

      campoId.value =
        '';

    }


    const campos = [

      'editarAnuncioTitulo',

      'editarAnuncioDescricao',

      'editarAnuncioTelefone',

      'editarAnuncioEndereco',

      'editarAnuncioLatitude',

      'editarAnuncioLongitude'

    ];


    campos.forEach(
      function (id) {

        const campo =
          document.getElementById(
            id
          );


        if (campo) {

          campo.value =
            '';

        }

      }
    );


    const status =
      document.getElementById(
        'editarAnuncioStatus'
      );


    if (status) {

      status.value =
        'pendente';

    }


    mostrarErro(
      document.getElementById(
        'erroEditarAnuncio'
      ),
      ''
    );


    mostrarSecao(
      'tabTodos'
    );


    ativarAba(
      'todos'
    );

  }


  const btnCancelarEdicaoAnuncio =
    document.getElementById(
      'btnCancelarEdicaoAnuncio'
    );


  if (btnCancelarEdicaoAnuncio) {

    btnCancelarEdicaoAnuncio.addEventListener(
      'click',
      cancelarEdicaoAnuncio
    );

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
        categorias
          .map(
            function (categoria) {

              return `

                <tr>

                  <td>
                    ${escapeHtml(
                      categoria.id
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      categoria.nome ||
                      ''
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      categoria.icone_url ||
                      '-'
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      categoria.slug ||
                      '-'
                    )}
                  </td>


                  <td>

                    <button
                      type="button"
                      class="btn btn--principal"
                      data-categoria-editar-id="${escapeHtml(
                        categoria.id
                      )}"
                    >
                      Editar
                    </button>


                    <button
                      type="button"
                      class="btn btn--excluir"
                      data-categoria-excluir-id="${escapeHtml(
                        categoria.id
                      )}"
                    >
                      Excluir
                    </button>

                  </td>

                </tr>

              `;

            }
          )
          .join('');


      // =====================================================
      // EDITAR CATEGORIA
      // =====================================================

      tbody
        .querySelectorAll(
          '[data-categoria-editar-id]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.categoriaEditarId;


                if (!id) {

                  return;

                }


                botao.disabled =
                  true;


                try {

                  await editarCategoria(
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
      // EXCLUIR CATEGORIA
      // =====================================================

      tbody
        .querySelectorAll(
          '[data-categoria-excluir-id]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.categoriaExcluirId;


                if (!id) {

                  return;

                }


                if (
                  !confirm(
                    'Excluir esta categoria?'
                  )
                ) {

                  return;

                }


                try {

                  botao.disabled =
                    true;


                  await apiFetch(
                    `/api/admin/categorias/${id}`,
                    {
                      method:
                        'DELETE'
                    }
                  );


                  await carregarCategorias();


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
        '[CATEGORIAS]',
        erro
      );


      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            ${escapeHtml(
              erro.message
            )}
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

          btnAddCategoria.disabled =
            true;


          await apiFetch(
            '/api/admin/categorias',
            {
              method:
                'POST',

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


          if (campoNome) {

            campoNome.value =
              '';

          }


          if (campoIcone) {

            campoIcone.value =
              '';

          }


          await carregarCategorias();


        } catch (erro) {

          alert(
            erro.message
          );


        } finally {

          btnAddCategoria.disabled =
            false;

        }

      }
    );

  }


  // =========================================================
  // EDITAR CATEGORIA
  // =========================================================

  async function editarCategoria(
    id
  ) {

    try {

      const categoria =
        await apiFetch(
          `/api/admin/categorias/${id}`
        );


      categoriaEmEdicaoId =
        categoria.id ||
        id;


      const campoId =
        document.getElementById(
          'editarCategoriaId'
        );


      const campoNome =
        document.getElementById(
          'editarCategoriaNome'
        );


      const campoIcone =
        document.getElementById(
          'editarCategoriaIcone'
        );


      if (campoId) {

        campoId.value =
          categoriaEmEdicaoId;

      }


      if (campoNome) {

        campoNome.value =
          categoria.nome ||
          '';

      }


      if (campoIcone) {

        campoIcone.value =
          categoria.icone_url ||
          '';

      }


      mostrarErro(
        document.getElementById(
          'erroEditarCategoria'
        ),
        ''
      );


      mostrarSecao(
        'tabEditarCategoria'
      );


      ativarAba(
        'categorias'
      );


    } catch (erro) {

      console.error(
        '[EDITAR CATEGORIA]',
        erro
      );


      alert(
        'Não foi possível carregar a categoria.\n\n' +
        erro.message
      );

    }

  }


  // =========================================================
  // SALVAR EDIÇÃO DA CATEGORIA
  // =========================================================

  const btnSalvarEdicaoCategoria =
    document.getElementById(
      'btnSalvarEdicaoCategoria'
    );


  if (btnSalvarEdicaoCategoria) {

    btnSalvarEdicaoCategoria.addEventListener(
      'click',
      async function () {

        const erro =
          document.getElementById(
            'erroEditarCategoria'
          );


        mostrarErro(
          erro,
          ''
        );


        const id =
          categoriaEmEdicaoId ||
          document.getElementById(
            'editarCategoriaId'
          )?.value;


        const nome =
          document.getElementById(
            'editarCategoriaNome'
          )?.value.trim() ||
          '';


        const icone_url =
          document.getElementById(
            'editarCategoriaIcone'
          )?.value.trim() ||
          '';


        if (!id) {

          mostrarErro(
            erro,
            'ID da categoria não encontrado.'
          );

          return;

        }


        if (!nome) {

          mostrarErro(
            erro,
            'Digite o nome da categoria.'
          );

          return;

        }


        try {

          btnSalvarEdicaoCategoria.disabled =
            true;


          btnSalvarEdicaoCategoria.textContent =
            'Salvando...';


          await apiFetch(
            `/api/admin/categorias/${id}`,
            {
              method:
                'PUT',

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


          alert(
            'Categoria atualizada com sucesso!'
          );


          cancelarEdicaoCategoria();


          await carregarCategorias();


        } catch (erroSalvar) {

          console.error(
            '[SALVAR CATEGORIA]',
            erroSalvar
          );


          mostrarErro(
            erro,
            'Erro ao atualizar categoria: ' +
            erroSalvar.message
          );


        } finally {

          btnSalvarEdicaoCategoria.disabled =
            false;


          btnSalvarEdicaoCategoria.textContent =
            'Salvar alterações';

        }

      }
    );

  }


  // =========================================================
  // CANCELAR EDIÇÃO DA CATEGORIA
  // =========================================================

  function cancelarEdicaoCategoria() {

    categoriaEmEdicaoId =
      null;


    const campoId =
      document.getElementById(
        'editarCategoriaId'
      );


    const campoNome =
      document.getElementById(
        'editarCategoriaNome'
      );


    const campoIcone =
      document.getElementById(
        'editarCategoriaIcone'
      );


    if (campoId) {

      campoId.value =
        '';

    }


    if (campoNome) {

      campoNome.value =
        '';

    }


    if (campoIcone) {

      campoIcone.value =
        '';

    }


    mostrarErro(
      document.getElementById(
        'erroEditarCategoria'
      ),
      ''
    );


    mostrarSecao(
      'tabCategorias'
    );


    ativarAba(
      'categorias'
    );

  }


  const btnCancelarEdicaoCategoria =
    document.getElementById(
      'btnCancelarEdicaoCategoria'
    );


  if (btnCancelarEdicaoCategoria) {

    btnCancelarEdicaoCategoria.addEventListener(
      'click',
      cancelarEdicaoCategoria
    );

  }


  // =========================================================
  // EDITOR DO BLOG
  // =========================================================

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


  function formatar(
    tipo
  ) {

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
  // IMAGENS DO BLOG
  // =========================================================

  const inputImagem =
    document.createElement(
      'input'
    );


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
      document.createElement(
        'img'
      );


    imagem.src =
      src;


    imagem.alt =
      alt ||
      'Imagem do artigo';


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
          inputImagem.files ||
          []
        );


      if (
        arquivos.length ===
        0
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


            if (
              acao ===
              'h1'
            ) {

              formatar(
                'H1'
              );

            }


            if (
              acao ===
              'h2'
            ) {

              formatar(
                'H2'
              );

            }


            if (
              acao ===
              'h3'
            ) {

              formatar(
                'H3'
              );

            }


            if (
              acao ===
              'bold'
            ) {

              comandoEditor(
                'bold'
              );

            }


            if (
              acao ===
              'italic'
            ) {

              comandoEditor(
                'italic'
              );

            }


            if (
              acao ===
              'link'
            ) {

              inserirLink();

            }


            if (
              acao ===
              'image'
            ) {

              inserirImagemURL();

            }


            if (
              acao ===
              'imageMultiple'
            ) {

              escolherImagemComputador();

            }


            if (
              acao ===
              'paragraph'
            ) {

              formatar(
                'P'
              );

            }


            if (
              acao ===
              'quote'
            ) {

              formatar(
                'BLOCKQUOTE'
              );

            }

          }
        );

      }
    );


  // =========================================================
  // MENU DIREITO DO EDITOR
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
      x +
      'px';


    editorContextMenu.style.top =
      y +
      'px';


    editorContextMenu.style.zIndex =
      '999999';


    const largura =
      editorContextMenu.offsetWidth;


    const altura =
      editorContextMenu.offsetHeight;


    if (
      x +
      largura >
      window.innerWidth
    ) {

      editorContextMenu.style.left =
        (
          window.innerWidth -
          largura -
          10
        ) +
        'px';

    }


    if (
      y +
      altura >
      window.innerHeight
    ) {

      editorContextMenu.style.top =
        (
          window.innerHeight -
          altura -
          10
        ) +
        'px';

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


              if (
                acao ===
                'h1'
              ) {

                formatar(
                  'H1'
                );

              }


              if (
                acao ===
                'h2'
              ) {

                formatar(
                  'H2'
                );

              }


              if (
                acao ===
                'h3'
              ) {

                formatar(
                  'H3'
                );

              }


              if (
                acao ===
                'bold'
              ) {

                comandoEditor(
                  'bold'
                );

              }


              if (
                acao ===
                'italic'
              ) {

                comandoEditor(
                  'italic'
                );

              }


              if (
                acao ===
                'link'
              ) {

                inserirLink();

              }


              if (
                acao ===
                'image'
              ) {

                inserirImagemURL();

              }


              if (
                acao ===
                'imageMultiple'
              ) {

                escolherImagemComputador();

              }


              if (
                acao ===
                'paragraph'
              ) {

                formatar(
                  'P'
                );

              }


              if (
                acao ===
                'quote'
              ) {

                formatar(
                  'BLOCKQUOTE'
                );

              }

            }
          );

        }
      );

  }


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
  // FORMULÁRIO DO BLOG
  // =========================================================

  function atualizarModoFormulario() {

    if (artigoEmEdicaoId) {

      if (tituloFormularioBlog) {

        tituloFormularioBlog.textContent =
          'Editar artigo';

      }


      if (descricaoFormularioBlog) {

        descricaoFormularioBlog.textContent =
          'Altere os dados do artigo e salve as modificações.';

      }


      if (btnSalvarArtigo) {

        btnSalvarArtigo.textContent =
          'Salvar alterações';

      }


      if (btnCancelarEdicao) {

        btnCancelarEdicao.style.display =
          'inline-block';

      }


      if (blogIdEdicao) {

        blogIdEdicao.value =
          artigoEmEdicaoId;

      }


    } else {

      if (tituloFormularioBlog) {

        tituloFormularioBlog.textContent =
          'Criar novo artigo';

      }


      if (descricaoFormularioBlog) {

        descricaoFormularioBlog.textContent =
          'Crie seu artigo usando o editor visual abaixo.';

      }


      if (btnSalvarArtigo) {

        btnSalvarArtigo.textContent =
          'Salvar artigo';

      }


      if (btnCancelarEdicao) {

        btnCancelarEdicao.style.display =
          'none';

      }


      if (blogIdEdicao) {

        blogIdEdicao.value =
          '';

      }

    }

  }


  function limparFormularioArtigo() {

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
        '';

    }


    if (campoResumo) {

      campoResumo.value =
        '';

    }


    if (blogEditor) {

      blogEditor.innerHTML =
        '';

    }


    if (campoPublicado) {

      campoPublicado.checked =
        true;

    }


    artigoEmEdicaoId =
      null;


    ultimaSelecao =
      null;


    atualizarModoFormulario();


    esconderMenu();

  }


  function cancelarEdicaoArtigo() {

    limparFormularioArtigo();


    mostrarErro(
      erroBlog,
      ''
    );


    console.log(
      '[BLOG] Edição cancelada.'
    );

  }


  if (btnCancelarEdicao) {

    btnCancelarEdicao.addEventListener(
      'click',
      function () {

        if (
          !confirm(
            'Cancelar a edição? As alterações que ainda não foram salvas serão perdidas.'
          )
        ) {

          return;

        }


        cancelarEdicaoArtigo();

      }
    );

  }


  // =========================================================
  // EDITAR ARTIGO
  // =========================================================

  async function editarArtigo(
    id
  ) {

    try {

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
          artigo.titulo ||
          '';

      }


      if (campoResumo) {

        campoResumo.value =
          artigo.resumo ||
          '';

      }


      if (blogEditor) {

        blogEditor.innerHTML =
          artigo.conteudo ||
          '';

      }


      if (campoPublicado) {

        campoPublicado.checked =
          Number(
            artigo.publicado
          ) ===
          1 ||
          artigo.publicado ===
          true;

      }


      artigoEmEdicaoId =
        artigo.id;


      atualizarModoFormulario();


      mostrarErro(
        erroBlog,
        ''
      );


      ultimaSelecao =
        null;


      esconderMenu();


      mostrarSecao(
        'tabBlog'
      );


      ativarAba(
        'blog'
      );


      if (campoTitulo) {

        campoTitulo.focus();

      }


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
  // SALVAR ARTIGO
  // =========================================================

  if (btnSalvarArtigo) {

    btnSalvarArtigo.addEventListener(
      'click',
      async function (event) {

        event.preventDefault();


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


        if (!titulo) {

          mostrarErro(
            erroBlog,
            'Digite o título do artigo.'
          );

          return;

        }


        if (
          !conteudo ||
          conteudo ===
          '<br>' ||
          conteudo ===
          '<div><br></div>'
        ) {

          mostrarErro(
            erroBlog,
            'Digite o conteúdo do artigo.'
          );

          return;

        }


        btnSalvarArtigo.disabled =
          true;


        try {

          if (artigoEmEdicaoId) {

            await apiFetch(
              `/api/blog/${artigoEmEdicaoId}`,
              {
                method:
                  'PUT',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({

                    titulo,

                    resumo,

                    conteudo,

                    publicado

                  })
              }
            );


            alert(
              'Artigo atualizado com sucesso!'
            );


          } else {

            await apiFetch(
              '/api/blog',
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({

                    titulo,

                    resumo,

                    conteudo,

                    publicado

                  })
              }
            );


            alert(
              'Artigo salvo com sucesso!'
            );

          }


          limparFormularioArtigo();


          await carregarArtigos();


        } catch (erro) {

          console.error(
            '[BLOG SALVAR]',
            erro
          );


          mostrarErro(
            erroBlog,
            'Erro ao salvar artigo: ' +
            erro.message
          );


        } finally {

          btnSalvarArtigo.disabled =
            false;


          atualizarModoFormulario();

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
          .map(
            function (artigo) {

              return `

                <tr>

                  <td>
                    ${escapeHtml(
                      artigo.id
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      artigo.titulo ||
                      ''
                    )}
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
                      class="btn btn--principal"
                      data-blog-editar-id="${escapeHtml(
                        artigo.id
                      )}"
                    >
                      Editar
                    </button>


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

            }
          )
          .join('');


      tbody
        .querySelectorAll(
          '[data-blog-editar-id]'
        )
        .forEach(
          function (botao) {

            botao.addEventListener(
              'click',
              async function () {

                const id =
                  botao.dataset.blogEditarId;


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
                      method:
                        'DELETE'
                    }
                  );


                  if (
                    String(
                      artigoEmEdicaoId
                    ) ===
                    String(id)
                  ) {

                    limparFormularioArtigo();

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
            ${escapeHtml(
              erro.message
            )}
          </td>
        </tr>`;

    }

  }


  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  atualizarModoFormulario();


  console.log(
    '[ADMIN] Inicialização concluída.'
  );


  if (getToken()) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
