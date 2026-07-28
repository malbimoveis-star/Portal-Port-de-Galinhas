const express = require('express');
const router = express.Router();

const anuncios = [
  {
    id: 1,
    categoria: "Pousadas",
    capa: "/assets/comerciantes/pousada-mar-azul-piscina.jpg"
  },
  {
    id: 2,
    categoria: "Restaurantes",
    capa: "/assets/comerciantes/restaurante-mar-azul.jpg"
  },
  {
    id: 3,
    categoria: "Passeios",
    capa: "/assets/comerciantes/passeio-lancha.jpg"
  },
  {
    id: 4,
    categoria: "Mergulho",
    capa: "/assets/comerciantes/mergulho-corais.jpg"
  },
  {
    id: 5,
    categoria: "Buggy",
    capa: "/assets/comerciantes/buggy-dunas.jpg"
  },
  {
    id: 6,
    categoria: "Comércio",
    capa: "/assets/comerciantes/rua-comercio-artesanato.jpg"
  }
];

router.get('/', (req, res) => {
  res.json(anuncios);
});

router.get('/:id', (req, res) => {
  const anuncio = anuncios.find(a => a.id == req.params.id);

  if (!anuncio) {
    return res.status(404).json({
      error: "Anúncio não encontrado"
    });
  }

  res.json(anuncio);
});

module.exports = router;
