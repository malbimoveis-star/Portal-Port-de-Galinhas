'use strict';
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const PAGES_DIR = path.join(FRONTEND_DIR, 'pages');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');

app.use(express.json());

// Arquivos estáticos: CSS, JS, i18n dentro de frontend/, e imagens dentro de assets/
app.use(express.static(FRONTEND_DIR));
app.use('/assets', express.static(ASSETS_DIR));

// ===== Rotas da API =====
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/comerciantes', require('./routes/comerciantes'));
app.use('/api/anuncios', require('./routes/anuncios'));
app.use('/api/pagamentos', require('./routes/pagamentos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/login', require('./routes/login'));

// Blog admin (arquivo separado em backend/blog.js)
const blogRouter = require('../blog');
app.use('/admin/blog', blogRouter);

// ===== Páginas amigáveis =====
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('/contato', (req, res) => res.sendFile(path.join(PAGES_DIR, 'contato.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(PAGES_DIR, 'blog.html')));
app.get('/categoria', (req, res) => res.sendFile(path.join(PAGES_DIR, 'categoria.html')));
app.get('/comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'comerciante.html')));
app.get('/como-funciona', (req, res) => res.sendFile(path.join(PAGES_DIR, 'como-funciona.html')));
app.get('/cadastro-comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'cadastro-comerciante.html')));
app.get('/login-comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'login-comerciante.html')));
app.get('/painel-comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'painel-comerciante.html')));
app.get('/planos-turista', (req, res) => res.sendFile(path.join(PAGES_DIR, 'planos-turista.html')));
app.get('/pagamento-sucesso', (req, res) => res.sendFile(path.join(PAGES_DIR, 'pagamento-sucesso.html')));
app.get('/pagamento-pendente', (req, res) => res.sendFile(path.join(PAGES_DIR, 'pagamento-pendente.html')));
app.get('/pagamento-erro', (req, res) => res.sendFile(path.join(PAGES_DIR, 'pagamento-erro.html')));
app.get('/privacidade', (req, res) => res.sendFile(path.join(PAGES_DIR, 'privacidade.html')));
app.get('/termos', (req, res) => res.sendFile(path.join(PAGES_DIR, 'termos.html')));
app.get('/suporte', (req, res) => res.sendFile(path.join(PAGES_DIR, 'suporte.html')));

// Rota de API não encontrada -> responde JSON (não HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota da API nao encontrada.' });
});

// Qualquer outra coisa não encontrada -> cai no index.html
app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Handler de erros (ex: multer/upload)
app.use((err, req, res, next) => {
  console.error('[erro]', err.message);
  res.status(400).json({ erro: err.message });
});

app.listen(PORT, () => {
  console.log(`[server] Portal Porto de Galinhas rodando em http://localhost:${PORT}`);
  console.log('FRONTEND_DIR:', FRONTEND_DIR);
});

module.exports = app;
