const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const pastaFrontend = __dirname;
const pastaAssets = path.join(__dirname, '..', 'assets');

console.log('=== Portal Porto de Galinhas — iniciando ===');
console.log('Pasta frontend:', pastaFrontend);
console.log('Pasta assets:', pastaAssets);
console.log('index.html existe?', fs.existsSync(path.join(pastaFrontend, 'index.html')));
console.log('contato.html existe?', fs.existsSync(path.join(pastaFrontend, 'contato.html')));
console.log('blog.html existe?', fs.existsSync(path.join(pastaFrontend, 'blog.html')));
console.log('pasta assets existe?', fs.existsSync(pastaAssets));

// Loga toda requisição que chegar, pra sabermos o que está sendo pedido
app.use((req, res, next) => {
  console.log(`[requisição] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(pastaFrontend));
app.use('/assets', express.static(pastaAssets));

app.get('/', (req, res) => {
  res.sendFile(path.join(pastaFrontend, 'index.html'));
});
app.get('/contato', (req, res) => {
  res.sendFile(path.join(pastaFrontend, 'contato.html'));
});
app.get('/admin/blog', (req, res) => {
  res.sendFile(path.join(pastaFrontend, 'blog.html'));
});

// Se nada bateu, mostra no log o que faltou (em vez de só devolver 404 silencioso)
app.use((req, res) => {
  console.log(`[404] Nenhuma rota/arquivo encontrado para: ${req.url}`);
  res.status(404).send(`Não encontrado: ${req.url}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
