// backend/src/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const anunciosRoutes = require('./routes/anuncios');
const comerciantesRoutes = require('./routes/comerciantes');

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// 🔧 Servir o frontend estático
// Garante que o Railway e o ambiente local encontrem os arquivos HTML, CSS e JS
app.use(express.static(path.join(__dirname, '../../frontend')));

// 🔧 Servir imagens e uploads
// Corrigido para apontar para a pasta certa no Railway (assets/uploads)
app.use('/uploads', express.static(path.join(__dirname, '../../assets/uploads')));

// 🔧 Rotas da API
app.use('/api/anuncios', anunciosRoutes);
app.use('/api/comerciantes', comerciantesRoutes);

// 🔧 Rota fallback para páginas inexistentes
app.use((req, res) => {
  res.status(404).send('Rota não encontrada.');
});

// 🔧 Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
