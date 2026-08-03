'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const { seedSeNecessario } = require('./db/seed');

// Garante que as tabelas existem e que ha dados minimos antes de aceitar requisicoes.
// Isso evita o site subir "vazio" (sem categorias, sem admin) quando o banco é novo.
seedSeNecessario();

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const PAGES_DIR = path.join(FRONTEND_DIR, 'pages');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
const ADMIN_DIR = path.join(__dirname, '..', 'admin');

app.use(express.json());

// Arquivos estaticos: CSS, JS, i18n dentro de frontend/, imagens em assets/, painel admin
app.use(express.static(FRONTEND_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/admin', express.static(ADMIN_DIR));

// ===== Rotas da API =====
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/comerciantes', require('./routes/comerciantes'));
app.use('/api/anuncios', require('./routes/anuncios'));
app.use('/api/pagamentos', require('./routes/pagamentos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/login', require('./routes/login'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/interacoes', require('./routes/interacoes'));

// ===== Paginas amigaveis =====
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('/contato', (req, res) => res.sendFile(path.join(PAGES_DIR, 'contato.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(PAGES_DIR, 'blog.html')));
app.get('/artigo', (req, res) => res.sendFile(path.join(PAGES_DIR, 'artigo.html')));
app.get('/categoria', (req, res) => res.sendFile(path.join(PAGES_DIR, 'categoria.html')));
app.get('/comerciante', (req, res) => res.sendFile(path.join(PAGES_DIR, 'comerciante.html')));
app.get('/fanpage', (req, res) => res.sendFile(path.join(PAGES_DIR, 'fanpage.html')));
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

// Rota de API nao encontrada -> responde JSON (nao HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota da API nao encontrada.' });
});

// Qualquer outra coisa nao encontrada -> cai no index.html
app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Tratamento de erro GLOBAL: qualquer erro que "escape" de uma rota cai aqui,
// em vez de derrubar o servidor inteiro (o que tirava o site do ar pra todo mundo).
app.use((err, req, res, next) => {
  console.error('[erro nao tratado]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ erro: 'Erro interno do servidor.', detalhe: err.message });
});

// Rede de seguranca extra: captura erros assincronos que nem o middleware acima pegaria,
// evitando que o processo Node inteiro caia (o que tirava TODO o site do ar).
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] O servidor continua no ar. Erro:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection] O servidor continua no ar. Erro:', err);
});

app.listen(PORT, () => {
  console.log(`[server] Portal Porto de Galinhas rodando em http://localhost:${PORT}`);
});

module.exports = app;
