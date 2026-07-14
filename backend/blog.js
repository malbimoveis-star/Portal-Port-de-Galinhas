const express = require('express');
const path = require('path');
const router = express.Router();

// Página principal do blog
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/blog.html'));
});

// Criar novo artigo (exemplo simples)
router.post('/new', (req, res) => {
  const { title, content } = req.body;
  // Aqui futuramente você vai salvar no banco de dados
  console.log('Nova postagem:', title, content);
  res.redirect('/admin/blog');
});

module.exports = router;
