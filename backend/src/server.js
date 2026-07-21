'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { seedSeNecessario } = require('./db/seed');

const app = express();

const PORT = process.env.PORT || 3000;

// =========================================================
// CAMINHOS
// =========================================================

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const PAGES_DIR = path.join(FRONTEND_DIR, 'pages');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');

const ADMIN_DIR = path.join(__dirname, '..', 'admin');
const ADMIN_INDEX = path.join(ADMIN_DIR, 'index.html');

// =========================================================
// BANCO DE DADOS
// =========================================================

try {
  seedSeNecessario();
} catch (err) {
  console.error('[seed] Erro ao inicializar banco:', err);
}

// =========================================================
// MIDDLEWARES
// =========================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos públicos do frontend
app.use(express.static(FRONTEND_DIR));

// Assets
app.use('/assets', express.static(ASSETS_DIR));

// =========================================================
// PAINEL ADMINISTRATIVO
// =========================================================

// Página principal do painel
// IMPORTANTE: precisa vir antes do express.static('/admin')
app.get('/admin', (req, res) => {
  res.sendFile(ADMIN_INDEX);
});

app.get('/admin/', (req, res) => {
  res.sendFile(ADMIN_INDEX);
});

// Arquivos estáticos do painel
// Exemplo:
// /admin/admin.js
// /admin/style.css
// /admin/assets/...
app.use('/admin', express.static(ADMIN_DIR));

// =========================================================
// API
// =========================================================

app.use('/api/categorias', require('./routes/categorias'));

app.use('/api/comerciantes', require('./routes/comerciantes'));

app.use('/api/anuncios', require('./routes/anuncios'));

app.use('/api/pagamentos', require('./routes/pagamentos'));

app.use('/api/admin', require('./routes/admin'));

app.use('/api/login', require('./routes/login'));

app.use('/api/blog', require('./routes/blogRoutes'));

app.use('/api/interacoes', require('./routes/interacoes'));

// =========================================================
// PÁGINAS DO SITE
// =========================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.get('/contato', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'contato.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'blog.html'));
});

app.get('/artigo', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'artigo.html'));
});

app.get('/categoria', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'categoria.html'));
});

app.get('/comerciante', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'comerciante.html'));
});

app.get('/como-funciona', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'como-funciona.html'));
});

app.get('/cadastro-comerciante', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'cadastro-comerciante.html'));
});

app.get('/login-comerciante', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'login-comerciante.html'));
});

app.get('/painel-comerciante', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'painel-comerciante.html'));
});

app.get('/planos-turista', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'planos-turista.html'));
});

app.get('/pagamento-sucesso', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'pagamento-sucesso.html'));
});

app.get('/pagamento-pendente', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'pagamento-pendente.html'));
});

app.get('/pagamento-erro', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'pagamento-erro.html'));
});

app.get('/privacidade', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'privacidade.html'));
});

app.get('/termos', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'termos.html'));
});

app.get('/suporte', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, 'suporte.html'));
});

// =========================================================
// API 404
// =========================================================

app.use('/api', (req, res) => {
  res.status(404).json({
    erro: 'Rota da API nao encontrada.'
  });
});

// =========================================================
// 404 GERAL
// =========================================================

app.use((req, res) => {
  res.status(404).sendFile(
    path.join(FRONTEND_DIR, 'index.html')
  );
});

// =========================================================
// TRATAMENTO DE ERROS
// =========================================================

app.use((err, req, res, next) => {
  console.error('[erro]', err);

  res.status(500).json({
    erro: 'Erro interno do servidor.'
  });
});

// =========================================================
// INICIAR SERVIDOR
// =========================================================

app.listen(PORT, () => {
  console.log(
    `[server] Portal Porto de Galinhas rodando em http://localhost:${PORT}`
  );
});

module.exports = app;
