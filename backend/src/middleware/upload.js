'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'assets', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const nome = `anuncio_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nome);
  },
});

// SVG foi removido de propósito: um SVG pode conter <script> embutido e é servido
// diretamente pelo Express em /assets/uploads, o que abriria um XSS armazenado.
const EXTENSOES_IMAGEM = /jpeg|jpg|png|webp|gif/;
const EXTENSOES_VIDEO = /mp4|mov|webm|m4v|avi|mkv|3gp/;

// O campo ('fotos' ou 'videos') decide qual conjunto de extensoes e aceito,
// para que o usuario nao consiga mandar um video pelo campo de fotos (e vice-versa).
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'videos') {
    if (EXTENSOES_VIDEO.test(ext)) return cb(null, true);
    return cb(new Error('Tipo de video nao suportado. Use mp4, mov, webm, m4v, avi, mkv ou 3gp.'));
  }

  if (EXTENSOES_IMAGEM.test(ext)) return cb(null, true);
  cb(new Error('Tipo de arquivo nao suportado. Use jpg, png, webp ou gif.'));
};

const upload = multer({
  storage,
  fileFilter,
  // Videos pesam bem mais que fotos, entao o limite por arquivo precisa
  // acomodar ambos os campos (multer nao permite limite diferente por campo
  // dentro da mesma instancia).
  limits: { fileSize: 100 * 1024 * 1024, files: 50 },
});

module.exports = upload;

