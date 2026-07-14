'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const migrate = require('./db/migrate');
const categoriasRouter = require('./routes/categorias');
const comerciantesRouter = require('./routes/comerciantes');
const anunciosRouter = require('./routes/anuncios');
const pagamentosRouter = require('./routes/pagamentos');
const loginRouter = require('./routes/login');
const adminRouter = require('./routes/admin');

migrate();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve os arquivos estaticos de /assets (imagens, icones, uploads de fotos de anuncios)
app.use('/assets', express.static(path.join(__dirname, '..', '..', 'assets')));

// Pagina administrativa (HTML+JS simples, protegida por login no proprio front)
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Serve o frontend (HTML/CSS/JS/i18n) na mesma porta da API
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// Rotas da API
app.use('/api/categorias', categoriasRouter);
app.use('/api/comerciantes', comerciantesRouter);
app.use('/api/anuncios', anunciosRouter);
app.use('/api/pagamentos', pagamentosRouter);
app.use('/api/login', loginRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servico: 'Portal Porto de Galinhas API', timestamp: new Date().toISOString() });
});

// Handler de erros do multer/upload
app.use((err, req, res, next) => {
  if (err) {
    console.error('[erro]', err.message);
    return res.status(400).json({ erro: err.message });
  }
  next();
});

app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.startsWith('/admin')) {
    return res.status(404).json({ erro: 'Rota nao encontrada.' });
  }
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] Portal Porto de Galinhas API rodando em http://localhost:${PORT}`);
});

module.exports = app;
