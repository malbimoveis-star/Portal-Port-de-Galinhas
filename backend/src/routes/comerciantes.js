const express = require('express');
const router = express.Router();

// Dados de exemplo
const comerciantes = [
  {
    id: 1,
    nome: "Hotel Exemplo",
    categoria: "Hotel",
    cidade: "Porto de Galinhas"
  },
  {
    id: 2,
    nome: "Restaurante Exemplo",
    categoria: "Restaurante",
    cidade: "Porto de Galinhas"
  }
];

// Listar todos os comerciantes
router.get('/', (req, res) => {
  res.json(comerciantes);
});

// Buscar comerciante por ID
router.get('/:id', (req, res) => {
  const comerciante = comerciantes.find(c => c.id == req.params.id);

  if (!comerciante) {
    return res.status(404).json({
      error: 'Comerciante não encontrado'
    });
  }

  res.json(comerciante);
});

module.exports = router;
