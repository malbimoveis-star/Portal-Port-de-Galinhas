'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function gerarTokenAdmin(usuario) {
  return jwt.sign({ usuario, tipo: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
}

function autenticarAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticacao ausente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token invalido ou expirado.' });
  }
}

module.exports = { autenticarAdmin, gerarTokenAdmin };
