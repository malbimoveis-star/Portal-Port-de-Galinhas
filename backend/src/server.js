const express = require('express');
const path = require('path');
const app = express();

// Importar rotas
const comerciantesRoutes = require('./routes/comerciantes');
const anunciosRoutes = require('./routes/anuncios');

// Middleware para JSON
app.use(express.json());

// Registrar rotas com prefixo /api
app.use('/api/comerciantes', comerciantesRoutes);
app.use('/api/anuncios', anunciosRoutes);

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Rota padrão
app.use((req, res) => {
  res.status(404).send('Rota não encontrada.');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
