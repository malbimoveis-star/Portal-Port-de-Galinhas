const express = require('express');
const path = require('path');
const app = express();

// Importando o roteador do blog
const blogRouter = require('../backend/blog');

// Conectando a rota /admin/blog
app.use('/admin/blog', blogRouter);

// Servindo arquivos estáticos da pasta frontend
app.use(express.static(path.join(__dirname)));

// Porta padrão
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

