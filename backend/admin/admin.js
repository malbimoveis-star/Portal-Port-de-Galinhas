// =========================================================
// PAINEL ADMINISTRATIVO
// Portal Porto de Galinhas
//
// Login
// CRUD de categorias
// Moderação de anúncios
// Gerenciamento do Blog
// Editor visual de artigos
// =========================================================

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


  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  function getToken() {

    return localStorage.getItem(
      TOKEN_KEY
    );

  }


  function setToken(token) {

    localStorage.setItem(
      TOKEN_KEY,
      token
    );

  }


  function limparToken() {

    localStorage.removeItem(
      TOKEN_KEY
    );

  }


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


  function mostrarAdmin() {

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

    carregarPendentes();

    carregarTodos();

    carregarCategorias();

    carregarArtigos();

  }


  // =========================================================
  // API
  // =========================================================

  async function apiFetch(
    path,
    options = {}
  ) {

    const token =
      getToken();

    const headers = {
      ...(options.headers || {})
    };


    if (token) {

      headers.Authorization =
        `Bearer ${token}`;

    }


    const resp =
      await fetch(
        `${API}${path}`,
        {
          ...options,
          headers
        }
      );


    let data;


    try {

      data =
        await resp.json();

    } catch (e) {

      data = {};

    }


    if (
      resp.status === 401 ||
      resp.status === 403
    ) {

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

    formLogin.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        if (erroLogin) {

          erroLogin.textContent =
            '';

        }


        const usuario =
          document
            .getElementById(
              'usuario'
            )
            .value
            .trim();


        const senha =
          document
            .getElementById(
              'senha'
            )
            .value;


        try {

          const resp =
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
            await resp.json();


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
              'O servidor não retornou um token de autenticação.'
            );

          }


          setToken(
            data.token
          );


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
      () => {

        limparToken();

        mostrarLogin();

      }
    );

  }


  // =========================================================
  // TABS
  // =========================================================

  document
    .querySelectorAll(
      '.tabs button'
    )
    .forEach(
      (btn) => {

        btn.addEventListener(
          'click',
          () => {

            document
              .querySelectorAll(
                '.tabs button'
              )
              .forEach(
                (b) => {

                  b.classList.remove(
                    'ativa'
                  );

                }
              );


            btn.classList.add(
              'ativa'
            );


            document
              .querySelectorAll(
                'main section'
              )
              .forEach(
                (section) => {

                  section.classList.add(
                    'escondido'
                  );

                }
              );


            const tabId =
              `tab${capitalize(
                btn.dataset.tab
              )}`;


            const tab =
              document.getElementById(
                tabId
              );


            if (tab) {

              tab.classList.remove(
                'escondido'
              );

            }


            if (
              btn.dataset.tab ===
              'blog'
            ) {

              carregarArtigos();

            }

          }
        );

      }
    );


  function capitalize(s) {

    return (
      s.charAt(0).toUpperCase() +
      s.slice(1)
    );

  }


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

      const pendentes =
        await apiFetch(
          '/api/admin/anuncios'
        );


      if (
        !Array.isArray(
          pendentes
        )
      ) {

        container.innerHTML =
          '<p>Nenhum anúncio pendente.</p>';

        return;

      }


      container.innerHTML =
        pendentes
          .map(
            (a) => `

              <div
                style="
                  padding:12px;
                  border-bottom:1px solid #ddd;
                "
              >

                <strong>
                  ${escapeHtml(
                    a.titulo || ''
                  )}
                </strong>

                <br>

                Comerciante:
                ${escapeHtml(
                  a.id_comerciante || '-'
                )}

                <br>

                Status:

                <span
                  class="badge badge--${escapeHtml(
                    a.status || ''
                  )}"
                >
                  ${escapeHtml(
                    a.status || '-'
                  )}
                </span>

                <br><br>

                <button
                  class="btn btn--aprovar"
                  data-acao="aprovar"
                  data-id="${a.id}"
                >
                  Aprovar
                </button>

                <button
                  class="btn btn--rejeitar"
                  data-acao="rejeitar"
                  data-id="${a.id}"
                >
                  Rejeitar
                </button>

              </div>

            `
          )
          .join('') ||

        '<p>Nenhum anúncio pendente.</p>';


      container
        .querySelectorAll(
          'button[data-acao]'
        )
        .forEach(
          (btn) => {

            btn.addEventListener(
              'click',
              async () => {

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


                  alert(
                    err.message
                  );

                }

              }
            );

          }
        );


    } catch (err) {

      console.error(
        '[pendentes]',
        err
      );

      container.innerHTML =
        `<p>Erro ao carregar anúncios: ${escapeHtml(
          err.message
        )}</p>`;

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

      const todos =
        await apiFetch(
          '/api/admin/anuncios/todos'
        );


      if (
        !Array.isArray(
          todos
        )
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';

        return;

      }


      tbody.innerHTML =
        todos
          .map(
            (a) => `

              <tr>

                <td>
                  ${a.id}
                </td>

                <td>
                  ${escapeHtml(
                    a.titulo || ''
                  )}
                </td>

                <td>

                  <span
                    class="badge badge--${escapeHtml(
                      a.status || ''
                    )}"
                  >
                    ${escapeHtml(
                      a.status || '-'
                    )}
                  </span>

                </td>

                <td>
                  ${a.latitude ?? '-'},
                  ${a.longitude ?? '-'}
                </td>

                <td>

                  <button
                    class="btn btn--excluir"
                    data-id="${a.id}"
                  >
                    Excluir
                  </button>

                </td>

              </tr>

            `
          )
          .join('') ||

        '<tr><td colspan="5">Nenhum anúncio cadastrado.</td></tr>';


      tbody
        .querySelectorAll(
          'button.btn--excluir'
        )
        .forEach(
          (btn) => {

            btn.addEventListener(
              'click',
              async () => {

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


                  alert(
                    err.message
                  );

                }

              }
            );

          }
        );


    } catch (err) {

      console.error(
        '[todos anuncios]',
        err
      );


      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            Erro ao carregar anúncios:
            ${escapeHtml(
              err.message
            )}
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
        !Array.isArray(
          categorias
        )
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';

        return;

      }


      tbody.innerHTML =
        categorias
          .map(
            (c) => `

              <tr>

                <td>
                  ${c.id}
                </td>

                <td>
                  ${escapeHtml(
                    c.nome || ''
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    c.icone_url || '-'
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    c.slug || '-'
                  )}
                </td>

                <td>

                  <button
                    class="btn btn--excluir"
                    data-id="${c.id}"
                  >
                    Excluir
                  </button>

                </td>

              </tr>

            `
          )
          .join('') ||

        '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';


      tbody
        .querySelectorAll(
          'button.btn--excluir'
        )
        .forEach(
          (btn) => {

            btn.addEventListener(
              'click',
              async () => {

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


                  alert(
                    err.message
                  );

                }

              }
            );

          }
        );


    } catch (err) {

      console.error(
        '[categorias]',
        err
      );


      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            Erro ao carregar categorias:
            ${escapeHtml(
              err.message
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

              body:
                JSON.stringify({
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


          alert(
            err.message
          );

        }

      }
    );

  }


  // =========================================================
  // BLOG
  // =========================================================

  const btnSalvarArtigo =
    document.getElementById(
      'btnSalvarArtigo'
    );


  if (btnSalvarArtigo) {

    btnSalvarArtigo.addEventListener(
      'click',
      async () => {

        console.log(
          '[blog] Salvando artigo...'
        );


        const erroBlog =
          document.getElementById(
            'erroBlog'
          );


        if (erroBlog) {

          erroBlog.textContent =
            '';

        }


        const titulo =
          getValue(
            'blogTitulo'
          );


        const resumo =
          getValue(
            'blogResumo'
          );


        const capa =
          getValue(
            'blogCapa'
          );


        // =====================================================
        // NOVO EDITOR VISUAL
        //
        // O próximo index.html terá:
        //
        // <div id="blogConteudoEditor"></div>
        //
        // O conteúdo HTML será obtido daqui.
        // =====================================================

        let conteudo =
          '';


        const editor =
          document.getElementById(
            'blogConteudoEditor'
          );


        if (editor) {

          conteudo =
            editor.innerHTML.trim();

        } else {

          // Compatibilidade temporária
          // com o textarea antigo.

          conteudo =
            getValue(
              'blogConteudo'
            );

        }


        const publicadoElement =
          document.getElementById(
            'blogPublicado'
          );


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

                body:
                  JSON.stringify({

                    titulo,

                    resumo,

                    capa_url:
                      capa,

                    // IMPORTANTE:
                    // envia HTML do editor
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


          limparFormularioBlog();


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
  // LIMPAR FORMULÁRIO DO BLOG
  // =========================================================

  function limparFormularioBlog() {

    const ids = [
      'blogTitulo',
      'blogResumo',
      'blogCapa'
    ];


    ids.forEach(
      (id) => {

        const element =
          document.getElementById(
            id
          );


        if (element) {

          element.value =
            '';

        }

      }
    );


    const editor =
      document.getElementById(
        'blogConteudoEditor'
      );


    if (editor) {

      editor.innerHTML =
        '';

    }


    // Compatibilidade
    // com textarea antigo.

    const textarea =
      document.getElementById(
        'blogConteudo'
      );


    if (textarea) {

      textarea.value =
        '';

    }


    const publicado =
      document.getElementById(
        'blogPublicado'
      );


    if (publicado) {

      publicado.checked =
        true;

    }

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


      if (
        !Array.isArray(
          artigos
        )
      ) {

        tbody.innerHTML =
          '<tr><td colspan="5">Nenhum artigo cadastrado.</td></tr>';

        return;

      }


      tbody.innerHTML =
        artigos
          .map(
            (artigo) => {

              const status =
                artigo.publicado
                  ? 'Publicado'
                  : 'Rascunho';


              return `

                <tr>

                  <td>
                    ${artigo.id}
                  </td>

                  <td>
                    ${escapeHtml(
                      artigo.titulo || ''
                    )}
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
                      data-blog-id="${artigo.id}"
                    >
                      Excluir
                    </button>

                  </td>

                </tr>

              `;

            }
          )
          .join('') ||

        '<tr><td colspan="5">Nenhum artigo cadastrado.</td></tr>';


      tbody
        .querySelectorAll(
          'button[data-blog-id]'
        )
        .forEach(
          (btn) => {

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

          }
        );


    } catch (err) {

      console.error(
        '[blog] Erro ao carregar artigos:',
        err
      );


      tbody.innerHTML = `

        <tr>

          <td colspan="5">

            Erro ao carregar artigos:
            ${escapeHtml(
              err.message
            )}

          </td>

        </tr>

      `;

    }

  }


  // =========================================================
  // FUNÇÕES AUXILIARES
  // =========================================================

  function getValue(id) {

    const element =
      document.getElementById(
        id
      );


    if (!element) {

      return '';

    }


    return (
      element.value ||
      ''
    ).trim();

  }


  // =========================================================
  // SEGURANÇA
  //
  // Usado apenas para dados exibidos
  // como texto nas tabelas.
  //
  // O conteúdo do editor do Blog NÃO passa
  // por esta função, pois precisa manter
  // as tags HTML de formatação.
  // =========================================================

  function escapeHtml(value) {

    const div =
      document.createElement(
        'div'
      );


    div.textContent =
      String(
        value ?? ''
      );


    return div.innerHTML;

  }


  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  console.log(
    '[admin] JavaScript administrativo carregado.'
  );


  if (
    getToken()
  ) {

    mostrarAdmin();

  } else {

    mostrarLogin();

  }

})();
