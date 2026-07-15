const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Importa e usa o blogRouter (caminho corrigido)
const blogRouter = require('../blog');
app.use('/admin/blog', blogRouter);

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`[server] Portal Porto de Galinhas API rodando em http://localhost:${PORT}`);
});

// Handler de erros do multer/upload
app.use((err, req, res, next) => {
  if (err) {
    console.error('[erro]', err.message);
    return res.status(400).json({ erro: err.message });
  }
  next();
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return res.status(404).json({ erro: 'Rota nao encontrada.' });
  }
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

module.exports = app;
