'use strict';

const express = require('express');

const router = express.Router();

// Rota de teste
router.get('/', (req, res) => {
  res.json({
    sucesso: true,
    mensagem: 'API de interações funcionando.'
  });
});

module.exports = router;
