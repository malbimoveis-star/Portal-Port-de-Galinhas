const express = require("express");
const router = express.Router();

const comerciantes = [
  {
    id: 1,
    nome: "Hotel Exemplo",
    categoria: "Hotel",
    cidade: "Porto de Galinhas",
    logo: "/assets/comerciantes/pousada-mar-azul-piscina.jpg"
  },
  {
    id: 2,
    nome: "Restaurante Exemplo",
    categoria: "Restaurante",
    cidade: "Porto de Galinhas",
    logo: "/assets/comerciantes/restaurante-mar-azul.jpg"
  },
  {
    id: 3,
    nome: "Passeio de Buggy",
    categoria: "Passeios",
    cidade: "Porto de Galinhas",
    logo: "/assets/comerciantes/buggy-dunas.jpg"
  },
  {
    id: 4,
    nome: "Mergulho nos Corais",
    categoria: "Turismo",
    cidade: "Porto de Galinhas",
    logo: "/assets/comerciantes/mergulho-corais.jpg"
  }
];

// Listar todos
router.get("/", (req, res) => {
  res.json(comerciantes);
});

// Buscar por ID
router.get("/:id", (req, res) => {
  const comerciante = comerciantes.find(c => c.id == req.params.id);

  if (!comerciante) {
    return res.status(404).json({
      error: "Comerciante não encontrado"
    });
  }

  res.json(comerciante);
});

module.exports = router;
