'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const { seedSeNecessario } = require('./db/seed');
const { garantirTuristaTeste } = require('./db/seedTuristaTeste');

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const PAGES_DIR = path.join(FRONTEND_DIR, 'pages');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
const ADMIN_DIR = path.join(__dirname, '..', 'admin');

// Limite maior que o padrao (100kb) porque o cadastro de afiliado envia o
// documento de identidade (RG/CPF) como base64 dentro do JSON.
app.use(express.json({ limit: '8mb' }));

app.use(express.static(FRONTEND_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/admin', express.static(ADMIN_DIR));

app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/comerciantes', require('./routes/comerciantes'));
app.use('/api/anuncios', require('./routes/anuncios'));
app.use('/api/pagamentos', require('./routes/pagamentos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/login', require('./routes/login'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/interacoes', require('./routes/interacoes'));
app.use('/api/contato', require('./routes/contato'));
app.use('/api/turistas', require('./routes/turistas'));
app.use('/api/afiliados', require('./routes/afiliados'));

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
app.get('/cadastro-turista', (req, res) => res.sendFile(path.join(PAGES_DIR, 'cadastro-turista.html')));
app.get('/login-turista', (req, res) => res.sendFile(path.join(PAGES_DIR, 'login-turista.html')));
app.get('/planos-turista', (req, res) => res.sendFile(path.join(PAGES_DIR, 'planos-turista.html')));
app.get('/pagamento-sucesso', (req, res) => res.sendFile(path.join(PAGES_DIR, 'pagamento-sucesso.html')));
app.get('/pagamento-pendente', (req, res) => res.sendFile(path.join(PAGES_DIR, 'pagamento-pendente.html')));
app.get('/pagamento-erro', (req, res) => res.sendFile(path.join(PAGES_DIR, 'pagamento-erro.html')));
app.get('/privacidade', (req, res) => res.sendFile(path.join(PAGES_DIR, 'privacidade.html')));
app.get('/termos', (req, res) => res.sendFile(path.join(PAGES_DIR, 'termos.html')));
app.get('/suporte', (req, res) => res.sendFile(path.join(PAGES_DIR, 'suporte.html')));
app.get('/cadastro-afiliado', (req, res) => res.sendFile(path.join(PAGES_DIR, 'cadastro-afiliado.html')));
app.get('/confirmar-email-afiliado', (req, res) => res.sendFile(path.join(PAGES_DIR, 'confirmar-email-afiliado.html')));
app.get('/completar-cadastro-afiliado', (req, res) => res.sendFile(path.join(PAGES_DIR, 'completar-cadastro-afiliado.html')));
app.get('/login-afiliado', (req, res) => res.sendFile(path.join(PAGES_DIR, 'login-afiliado.html')));
app.get('/painel-afiliado', (req, res) => res.sendFile(path.join(PAGES_DIR, 'painel-afiliado.html')));

app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota da API nao encontrada.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[erro nao tratado]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ erro: 'Erro interno do servidor.', detalhe: err.message });
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] O servidor continua no ar. Erro:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection] O servidor continua no ar. Erro:', err);
});

// A inicializacao do banco (migrate + seed condicional) agora e assincrona
// (consultas ao Postgres via `pg`), entao precisa terminar antes do
// app.listen. Antes, com node:sqlite (API sincrona), seedSeNecessario()
// rodava direto no topo do arquivo sem precisar de await.
async function start() {
  await seedSeNecessario();
  await garantirTuristaTeste();
  app.listen(PORT, () => {
    console.log(`[server] Portal Porto de Galinhas rodando em http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = app;
