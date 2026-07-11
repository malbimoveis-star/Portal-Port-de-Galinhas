'use strict';

// Servidor estatico simples para desenvolvimento local do frontend.
// Uso: node serve.js  (porta padrao 5500, ou definir via variavel de ambiente PORT)
// Em producao (Vercel/Netlify) este arquivo NAO e necessario -- basta apontar
// o "Publish directory" para a pasta frontend (site estatico).

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PROJECT_ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 5500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Permite servir /assets/* a partir da raiz do projeto (irmã de /frontend)
  let filePath;
  if (urlPath.startsWith('/assets/')) {
    filePath = path.join(PROJECT_ROOT, urlPath);
  } else {
    filePath = path.join(ROOT, urlPath);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Arquivo nao encontrado: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[frontend] servindo em http://localhost:${PORT}`);
});
