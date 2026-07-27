// backend/routes/comerciantes.js
const express = require('express');
const router = express.Router();

// Exemplo de dados mockados (substitua pelo banco de dados real)
const comerciantes = [
  {
    id: 4,
    nome: "Hotel Paraíso",
    endereco: "Av. Paulista, 1000 - São Paulo/SP",
    telefone: "1133224455",
    whatsapp: "11987654321",
    email: "contato@hotelparaiso.com",
    horario: "Seg-Sex: 8h às 20h",
    logo: "/uploads/logos/hotelparaiso.png",
    avaliacoes: [
      { usuario: "Maria", nota: 5, comentario: "Excelente atendimento!" },
      { usuario: "João", nota: 4, comentario: "Ótima localização." }
    ]
  }
];

// Rota para buscar comerciante por ID
router.get('/:id', (req, res) => {
  const comerciante = comerciantes.find(c => c.id == req.params.id);
  if (!comerciante) {
    return res.status(404).json({ error: 'Comerciante não encontrado' });
  }
  res.json(comerciante);
});

module.exports = router;


