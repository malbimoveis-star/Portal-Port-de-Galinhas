const express = require("express");
const router = express.Router();

const anuncios = [
  {
    id: 4,
    categoria: "Hotel",
    capa: "/assets/comerciantes/pousada-mar-azul-piscina.jpg",
    fotos: [
      "/assets/comerciantes/pousada-mar-azul-piscina.jpg",
      "/assets/comerciantes/restaurante-mar-azul.jpg"
    ],
    posts: [
      {
        data: "2026-07-20T14:00:00Z",
        texto: "Promoção especial de inverno!",
        imagem: "/assets/comerciantes/pousada-mar-azul-piscina.jpg",
        likes: 120,
        comentarios: 15,
        compartilhamentos: 8
      },
      {
        data: "2026-07-25T10:30:00Z",
        texto: "Novos quartos disponíveis com vista para o mar.",
        imagem: "/assets/comerciantes/restaurante-mar-azul.jpg",
        likes: 85,
        comentarios: 12,
        compartilhamentos: 5
      }
    ]
  }
];

router.get("/", (req, res) => {
  res.json(anuncios);
});

router.get("/:id", (req, res) => {
  const anuncio = anuncios.find(a => a.id == req.params.id);

  if (!anuncio) {
    return res.status(404).json({
      error: "Anúncio não encontrado"
    });
  }

  res.json(anuncio);
});

module.exports = router;
