// Painel administrativo
// Login + CRUD categorias + moderacao de anuncios + gerenciamento do blog
(function () {
  'use strict';

  const API = window.location.origin;
  const TOKEN_KEY = 'portal_admin_token';

  const telaLogin = document.getElementById('telaLogin');
  const telaAdmin = document.getElementById('telaAdmin');
  const formLogin = document.getElementById('formLogin');
  const erroLogin = document.getElementById('erroLogin');
  const btnSair = document.getElementById('btnSair');

  // =========================================================
  // AUTENTICACAO
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
    telaLogin.classList.remove('escondido');
    telaAdmin.classList.add('escondido');
  }

  function mostrarAdmin() {
    telaLogin.classList.add('escondido');
    telaAdmin.classList.remove('escondido');

    carregarPendentes();
    carregarTodos();
    carregarCategorias();
    carregarArtigos();
  }

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

    let data;

    try {
      data = await resp.json();
    } catch (e) {
      data = {};
    }

    if (resp.status === 401 || resp.status === 403) {
      limparToken();
      mostrarLogin();

      throw new Error(
        data.erro || 'Sessao expirada. Faca login novamente.'
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

      erroLogin.textContent = '';

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
          erroLogin.textContent =
            data.erro || 'Credenciais invalidas.';
          return;
        }

        setToken(data.token);

        mostrarAdmin();

      } catch (err) {
        console.error('[login]', err);

        erroLogin.textContent =
          'Erro ao conectar com o servidor.';
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

        if (btn.dataset.tab === 'pendentes') {
          carregarPendentes();
        }

        if (btn.dataset.tab === 'todos') {
          carregarTodos();
        }

        if (btn.dataset.tab === 'categorias') {
          carregarCategorias();
        }
      });
    });

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // =========================================================
  // ANUNCIOS PENDENTES
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
          '<p>Nenhum anuncio pendente.</p>';
        return;
      }

      container.innerHTML =
        pendentes.map((a) => `
          <div style="padding:12px;border-bottom:1px solid #ddd;">

            <strong>${a.titulo || ''}</strong>

            <br>

            Comerciante:
            ${a.id_comerciante || '-'}

            <br>

            Status:

            <span class="badge badge--${a.status || 'pendente'}">
              ${a.status || '-'}
            </span>

            <br><br>

            <button
              class="btn btn--aprovar"
              data-acao="aprovar"
              data-id="${a.id}">
              Aprovar
            </button>

            <button
              class="btn btn--rejeitar"
              data-acao="rejeitar"
              data-id="${a.id}">
              Rejeitar
            </button>

          </div>
        `).join('') ||
        '<p>Nenhum anuncio pendente.</p>';

      container
        .querySelectorAll('button[data-acao]')
        .forEach((btn) => {

          btn.addEventListener('click', async () => {

            const acao = btn.dataset.acao;
            const id = btn.dataset.id;

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
  // TODOS OS ANUNCIOS
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
          '<tr><td colspan="5">Nenhum anuncio cadastrado.</td></tr>';

        return;
      }

      tbody.innerHTML =
        todos.map((a) => `
          <tr>

            <td>
              ${a.id}
            </td>

            <td>
              ${a.titulo || ''}
            </td>

            <td>
              <span class="badge badge--${a.status || 'pendente'}">
                ${a.status || '-'}
              </span>
            </td>

            <td>
              ${a.latitude ?? '-'},
              ${a.longitude ?? '-'}
            </td>

            <td>

              <button
                class="btn btn--excluir"
                data-id="${a.id}">
                Excluir
              </button>

            </td>

          </tr>
        `).join('') ||
        '<tr><td colspan="5">Nenhum anuncio cadastrado.</td></tr>';

      tbody
        .querySelectorAll('button.btn--excluir')
        .forEach((btn) => {

          btn.addEventListener('click', async () => {

            if (
              !confirm(
                'Excluir este anuncio?'
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
              ${c.id}
            </td>

            <td>
              ${c.nome || ''}
            </td>

            <td>
              ${c.icone_url || '-'}
            </td>

            <td>
              ${c.slug || '-'}
            </td>

            <td>

              <button
                class="btn btn--excluir"
                data-id="${c.id}">
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
  // BLOG - SALVAR ARTIGO
  // =========================================================

  const btnSalvarArtigo =
    document.getElementById(
      'btnSalvarArtigo'
    );

  if (btnSalvarArtigo) {

    btnSalvarArtigo.addEventListener(
      'click',
      async () => {

        const erroBlog =
          document.getElementById(
            'erroBlog'
          );

        erroBlog.textContent = '';

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

        const capa_url =
          document
            .getElementById('blogCapa')
            .value
            .trim();

        const conteudo =
          document
            .getElementById('blogConteudo')
            .value
            .trim();

        const publicado =
          document
            .getElementById('blogPublicado')
            .checked;

        if (!titulo) {

          erroBlog.textContent =
            'Digite o titulo do artigo.';

          return;
        }

        if (!conteudo) {

          erroBlog.textContent =
            'Digite o conteudo do artigo.';

          return;
        }

        btnSalvarArtigo.disabled = true;

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
                  conteudo,
                  capa_url,
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

          document
            .getElementById('blogTitulo')
            .value = '';

          document
            .getElementById('blogResumo')
            .value = '';

          document
            .getElementById('blogCapa')
            .value = '';

          document
            .getElementById('blogConteudo')
            .value = '';

          document
            .getElementById('blogPublicado')
            .checked = true;

          await carregarArtigos();

        } catch (err) {

          console.error(
            '[blog] Erro ao salvar:',
            err
          );

          erroBlog.textContent =
            err.message ||
            'Erro ao salvar artigo.';

        } finally {

          btnSalvarArtigo.disabled = false;

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

      // IMPORTANTE:
      // Esta e a rota correta existente no blogRoutes.js
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

          const classeStatus =
            artigo.publicado
              ? 'ativo'
              : 'pendente';

          return `
            <tr>

              <td>
                ${artigo.id}
              </td>

              <td>
                ${artigo.titulo || ''}
              </td>

              <td>

                <span class="badge badge--${classeStatus}">
                  ${status}
                </span>

              </td>

              <td>
                ${artigo.criado_em || '-'}
              </td>

              <td>

                <button
                  class="btn btn--excluir"
                  data-blog-id="${artigo.id}">
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

              const id =
                btn.dataset.blogId;

              if (
                !confirm(
                  'Excluir este artigo?'
                )
              ) {
                return;
              }

              try {

                await apiFetch(
                  `/api/blog/${id}`,
                  {
                    method: 'DELETE'
                  }
                );

                alert(
                  'Artigo excluido com sucesso!'
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

      tbody.innerHTML =
        `<tr>
          <td colspan="5">
            Erro ao carregar artigos:
            ${err.message}
          </td>
        </tr>`;
    }
  }

  // =========================================================
  // INICIALIZACAO
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
