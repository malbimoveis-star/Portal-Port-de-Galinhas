const express = require('express');
const path = require('path');
const app = express();

// Importando o roteador do blog (se tiver lógica extra)
const blogRouter = require('../backend/blog');

// Conectando rota de API do blog (opcional)
app.use('/api/blog', blogRouter);

// Servindo arquivos estáticos da pasta frontend
app.use(express.static(path.join(__dirname)));

// Servindo também a pasta assets (imagens, CSS, JS)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Rotas amigáveis para páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/contato', (req, res) => {
  res.sendFile(path.join(__dirname, 'contato.html'));
});

app.get('/admin/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog.html'));
});

// Porta padrão (Railway define automaticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
