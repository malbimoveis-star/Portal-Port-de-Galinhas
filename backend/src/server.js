'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');

const { seedSeNecessario } = require('./db/seed');

// =========================================================
// INICIALIZAÇÃO DO BANCO
// =========================================================

seedSeNecessario();

// =========================================================
// APP
// =========================================================

const app = express();

const PORT = process.env.PORT || 3000;

// =========================================================
// CAMINHOS
// =========================================================

// Pasta frontend
const FRONTEND_DIR = path.join(
  __dirname,
  '..',
  '..',
  'frontend'
);

// Pasta das páginas internas do frontend
const PAGES_DIR = path.join(
  FRONTEND_DIR,
  'pages'
);

// Pasta de assets
const ASSETS_DIR = path.join(
  __dirname,
  '..',
  '..',
  'assets'
);

// =========================================================
// PAINEL ADMINISTRATIVO
// =========================================================
//
// Estrutura atual:
//
// backend/
// ├── src/
// │   └── server.js
// │
// └── admin/
//     ├── index.html
//     ├── admin.css
//     └── admin.js
//
// =========================================================

const ADMIN_DIR = path.join(
  __dirname,
  '..',
  'admin'
);

const ADMIN_HTML = path.join(
  ADMIN_DIR,
  'index.html'
);

// =========================================================
// MIDDLEWARES
// =========================================================

// Limite maior para permitir artigos com imagens
// e conteúdo HTML.
//
// IMPORTANTE:
// Isso corrige o erro:
// request entity too large
//
// Limite máximo: 50 MB

app.use(
  express.json({
    limit: '50mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '50mb'
  })
);

// =========================================================
// ARQUIVOS ESTÁTICOS DO SITE
// =========================================================

app.use(
  express.static(FRONTEND_DIR)
);

app.use(
  '/assets',
  express.static(ASSETS_DIR)
);

// =========================================================
// ARQUIVOS ESTÁTICOS DO PAINEL ADMIN
// =========================================================

// Permite acessar:
//
// /admin/admin.css
// /admin/admin.js
// /admin/index.html

app.use(
  '/admin',
  express.static(ADMIN_DIR)
);

// =========================================================
// ROTA PRINCIPAL DO PAINEL ADMIN
// =========================================================

// Acesso:
//
// /admin
//
// ou
//
// /admin/

app.get(
  '/admin',
  (req, res) => {

    res.sendFile(
      ADMIN_HTML
    );

  }
);

app.get(
  '/admin/',
  (req, res) => {

    res.sendFile(
      ADMIN_HTML
    );

  }
);

// =========================================================
// ROTAS DA API
// =========================================================

app.use(
  '/api/categorias',
  require('./routes/categorias')
);

app.use(
  '/api/comerciantes',
  require('./routes/comerciantes')
);

app.use(
  '/api/anuncios',
  require('./routes/anuncios')
);

app.use(
  '/api/pagamentos',
  require('./routes/pagamentos')
);

app.use(
  '/api/admin',
  require('./routes/admin')
);

app.use(
  '/api/login',
  require('./routes/login')
);

app.use(
  '/api/blog',
  require('./routes/blogRoutes')
);

app.use(
  '/api/interacoes',
  require('./routes/interacoes')
);

// =========================================================
// ROTAS DO SITE
// =========================================================

app.get(
  '/',
  (req, res) => {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'index.html'
      )
    );

  }
);

app.get(
  '/contato',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'contato.html'
      )
    );

  }
);

app.get(
  '/blog',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'blog.html'
      )
    );

  }
);

app.get(
  '/artigo',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'artigo.html'
      )
    );

  }
);

app.get(
  '/categoria',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'categoria.html'
      )
    );

  }
);

app.get(
  '/comerciante',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'comerciante.html'
      )
    );

  }
);

app.get(
  '/como-funciona',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'como-funciona.html'
      )
    );

  }
);

app.get(
  '/cadastro-comerciante',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'cadastro-comerciante.html'
      )
    );

  }
);

app.get(
  '/login-comerciante',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'login-comerciante.html'
      )
    );

  }
);

app.get(
  '/painel-comerciante',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'painel-comerciante.html'
      )
    );

  }
);

app.get(
  '/planos-turista',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'planos-turista.html'
      )
    );

  }
);

app.get(
  '/pagamento-sucesso',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'pagamento-sucesso.html'
      )
    );

  }
);

app.get(
  '/pagamento-pendente',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'pagamento-pendente.html'
      )
    );

  }
);

app.get(
  '/pagamento-erro',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'pagamento-erro.html'
      )
    );

  }
);

app.get(
  '/privacidade',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'privacidade.html'
      )
    );

  }
);

app.get(
  '/termos',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'termos.html'
      )
    );

  }
);

app.get(
  '/suporte',
  (req, res) => {

    res.sendFile(
      path.join(
        PAGES_DIR,
        'suporte.html'
      )
    );

  }
);

// =========================================================
// 404 PARA API
// =========================================================

app.use(
  '/api',
  (req, res) => {

    return res
      .status(404)
      .json({
        erro: 'Rota da API nao encontrada.'
      });

  }
);

// =========================================================
// FALLBACK DO SITE
// =========================================================

// Qualquer rota desconhecida do site
// retorna a página inicial.
//
// IMPORTANTE:
// Rotas /api já foram tratadas acima.
// Rotas /admin também já foram tratadas acima.

app.use(
  (req, res) => {

    return res
      .status(404)
      .sendFile(
        path.join(
          FRONTEND_DIR,
          'index.html'
        )
      );

  }
);

// =========================================================
// TRATAMENTO DE ERROS
// =========================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      '[erro]',
      err
    );

    // Erro específico de corpo da requisição muito grande

    if (
      err.type === 'entity.too.large'
    ) {

      return res
        .status(413)
        .json({
          erro:
            'O conteúdo enviado é muito grande. Reduza o tamanho das imagens ou do artigo.'
        });

    }

    return res
      .status(
        err.status || 500
      )
      .json({
        erro:
          err.message ||
          'Erro interno do servidor.'
      });

  }
);

// =========================================================
// INICIAR SERVIDOR
// =========================================================

const server = app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      `[server] Portal Porto de Galinhas rodando na porta ${PORT}`
    );

    console.log(
      `[server] Frontend: ${FRONTEND_DIR}`
    );

    console.log(
      `[server] Admin: ${ADMIN_DIR}`
    );

    console.log(
      `[server] Admin HTML: ${ADMIN_HTML}`
    );

    console.log(
      `[server] Limite JSON: 50 MB`
    );

  }
);

// =========================================================
// TRATAMENTO DE ENCERRAMENTO
// =========================================================

process.on(
  'SIGTERM',
  () => {

    console.log(
      '[server] SIGTERM recebido. Encerrando servidor...'
    );

    server.close(
      () => {

        console.log(
          '[server] Servidor encerrado corretamente.'
        );

        process.exit(0);

      }
    );

  }
);

process.on(
  'SIGINT',
  () => {

    console.log(
      '[server] SIGINT recebido. Encerrando servidor...'
    );

    server.close(
      () => {

        console.log(
          '[server] Servidor encerrado corretamente.'
        );

        process.exit(0);

      }
    );

  }
);

// =========================================================
// EXPORT
// =========================================================

module.exports = app;
