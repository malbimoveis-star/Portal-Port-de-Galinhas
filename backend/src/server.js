// backend/src/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const anunciosRoutes = require('./routes/anuncios');
const comerciantesRoutes = require('./routes/comerciantes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/anuncios', anunciosRoutes);
app.use('/api/comerciantes', comerciantesRoutes);

// Servir arquivos estáticos (imagens, uploads, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
