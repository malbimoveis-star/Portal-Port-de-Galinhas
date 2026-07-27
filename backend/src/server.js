const express = require('express');
const cors = require('cors');
const path = require('path');

const anunciosRoutes = require('./routes/anuncios');
const comerciantesRoutes = require('./routes/comerciantes');

const app = express();

app.use(cors());
app.use(express.json());

// 🔧 Servir arquivos do frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rotas da API
app.use('/api/anuncios', anunciosRoutes);
app.use('/api/comerciantes', comerciantesRoutes);

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
