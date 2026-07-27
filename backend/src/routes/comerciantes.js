// Rota para listar todos os comerciantes
router.get('/', (req, res) => {
  res.json(comerciantes);
});

// Rota para buscar comerciante por ID
router.get('/:id', (req, res) => {
  const comerciante = comerciantes.find(c => c.id == req.params.id);
  if (!comerciante) {
    return res.status(404).json({ error: 'Comerciante não encontrado' });
  }
  res.json(comerciante);
});
