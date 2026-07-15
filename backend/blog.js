const express = require('express');
const path = require('path');
const router = express.Router();

// Página principal do blog
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/blog.html'));
});

// Criar novo artigo (exemplo simples)
router.post('/novo', (req, res) => {
    const { titulo, conteudo } = req.body;
    // Aqui futuramente você salvará no banco de dados
    console.log('Nova postagem:', titulo, conteudo);
    res.redirect('/admin/blog');
});

module.exports = router;
