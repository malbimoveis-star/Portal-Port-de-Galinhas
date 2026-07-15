const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Pastas do projeto (backend/src -> volta duas pastas pra raiz do repo)
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const PAGES_DIR = path.join(FRONTEND_DIR, 'pages');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');

app.use(express.json());

// Arquivos estáticos: CSS, JS, i18n dentro de frontend/, e imagens dentro de assets/
app.use(express.static(FRONTEND_DIR));
app.use('/assets', express.static(ASSETS_DIR));

// Blog admin
const blogRouter = require('../blog');
app.use('/admin/blog', blogRouter);

// Rotas amigáveis para as páginas dentro de frontend/pages/
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('/contato', (req, res) => res.sendFile(path.join(PAGES_DIR, 'contato.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(PAGES_DIR, 'blog.html')));
app.get('/categoria', (req, res) => res.sendFile(path.join(PAGES_DIR, 'categoria.html')));
app.get('/comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'comerciante.html')));
app.get('/como-funciona', (req, res) => res.sendFile(path.join(PAGES_DIR, 'como-funciona.html')));
app.get('/cadastro-comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'cadastro-comerciante.html')));
app.get('/login-comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'login-comerciante.html')));
app.get('/painel-comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR,
