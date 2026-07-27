// backend/routes/anuncios.js
const express = require('express');
const router = express.Router();

// Exemplo de dados mockados (substitua pelo banco de dados real)
const anuncios = [
  {
    id: 4,
    categoria: "Hotel",
    capa: "/uploads/capas/hotel123.jpg",
    fotos: [
      "/uploads/fotos/hotel1.jpg",
      "/uploads/fotos/hotel2.jpg"
    ],
    posts: [
      {
        data: "2026-07-20T14:00:00Z",
        texto: "Promoção especial de inverno!",
        imagem: "/uploads/posts/post1.jpg",
        likes: 120,
        comentarios: 15,
        compartilhamentos: 8
      },
      {
        data: "2026-07-25T10:30:00Z",
        texto: "Novos quartos disponíveis com vista para o mar.",
        imagem: "/uploads/posts/post2.jpg",
        likes: 85,
        comentarios: 12,
        compartilhamentos: 5
      }
    ]
  }
];

// Rota para buscar anúncio por ID
router.get('/:id', (req, res) => {
  const anuncio = anuncios.find(a => a.id == req.params.id);
  if (!anuncio) {
    return res.status(404).json({ error: 'Anúncio não encontrado' });
  }
  res.json(anuncio);
});

module.exports = router;
