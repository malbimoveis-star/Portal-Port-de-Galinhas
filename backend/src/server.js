'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { seedSeNecessario } = require('./db/seed');

// =========================================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// =========================================================

seedSeNecessario();

const app = express();

// Railway fornece a porta através de process.env.PORT
const PORT = process.env.PORT || 3000;

// =========================================================
// CAMINHOS DO PROJETO
// =========================================================

// Pasta principal do frontend
const FRONTEND_DIR = path.join(
  __dirname,
  '..',
  '..',
  'frontend'
);

// Pasta das páginas internas
const PAGES_DIR = path.join(
  FRONTEND_DIR,
  'pages'
);

// Pasta de arquivos públicos
const ASSETS_DIR = path.join(
  __dirname,
  '..',
  '..',
  'assets'
);

// Pasta do painel administrativo
const ADMIN_DIR = path.join(
  __dirname,
  '..',
  'administrador'
);

// =========================================================
// MIDDLEWARES
// =========================================================

app.use(express.json());

// Arquivos do frontend
app.use(
  express.static(FRONTEND_DIR)
);

// Arquivos da pasta assets
app.use(
  '/assets',
  express.static(ASSETS_DIR)
);

// =========================================================
// PAINEL ADMINISTRATIVO
// =========================================================
//
// Acessível em:
// https://seu-site.up.railway.app/admin/
//
// Os arquivos devem estar em:
// backend/administrador/
//
// Exemplo:
// backend/administrador/index.html
// backend/administrador/admin.css
// backend/administrador/admin.js
//

app.use(
  '/admin',
  express.static(ADMIN_DIR)
);

// =========================================================
// API - ROTAS
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
// PÁGINA INICIAL
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

// =========================================================
// PÁGINAS DO SITE
// =========================================================

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
// ROTA PARA API NÃO ENCONTRADA
// =========================================================

app.use(
  '/api',
  (req, res) => {
    res.status(404).json({
      erro: 'Rota da API nao encontrada.'
    });
  }
);

// =========================================================
// PÁGINA NÃO ENCONTRADA
// =========================================================

app.use(
  (req, res) => {
    res.status(404).sendFile(
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
  (err, req, res, next) => {

    console.error(
      '[erro]',
      err.message
    );

    res.status(400).json({
      erro: err.message
    });

  }
);

// =========================================================
// INICIAR SERVIDOR
// =========================================================

app.listen(
  PORT,
  () => {

    console.log(
      `[server] Portal Porto de Galinhas rodando na porta ${PORT}`
    );

    console.log(
      `[server] Painel administrativo: /admin/`
    );

  }
);

// =========================================================
// EXPORTAR APP
// =========================================================

module.exports = app;
