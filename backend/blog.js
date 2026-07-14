const express = require('express');
const router = express.Router();

// Página principal do blog
router.get('/', (req, res) => {
  res.render('admin/blog', { posts: [] });
});

// Criar novo artigo
router.post('/new', (req, res) => {
  const { title, content } = req.body;
  // Aqui você vai salvar no banco de dados
  res.redirect('/admin/blog');
});

module.exports = router;
