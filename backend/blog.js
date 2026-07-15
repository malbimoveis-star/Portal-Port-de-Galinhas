const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/blog.html'));
});

router.post('/novo', (req, res) => {
  const { titulo, conteudo } = req.body;
  console.log('Nova postagem:', titulo, conteudo);
  res.redirect('/admin/blog');
});

module.exports = router;
