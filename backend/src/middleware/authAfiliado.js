'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function gerarTokenAfiliado(afiliado) {
  return jwt.sign(
    { id: afiliado.id, email: afiliado.email, tipo: 'afiliado' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function autenticarAfiliado(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticacao ausente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.tipo !== 'afiliado') {
      return res.status(401).json({ erro: 'Token invalido para esta area.' });
    }
    req.afiliado = payload;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token invalido ou expirado.' });
  }
}

module.exports = { autenticarAfiliado, gerarTokenAfiliado };
