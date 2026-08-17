'use strict';

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

function gerarTokenTurista(turista) {
  return jwt.sign(
    { id: turista.id, email: turista.email, tipo: 'turista' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function autenticarTurista(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticacao ausente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.tipo !== 'turista') {
      return res.status(401).json({ erro: 'Token invalido para turista.' });
    }
    req.turista = payload;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token invalido ou expirado.' });
  }
}

// Tenta identificar quem esta chamando a rota (comerciante OU turista) sem
// bloquear a requisicao caso nao haja token - usado em rotas publicas que
// precisam liberar mais informacao para quem esta autenticado e autorizado.
function identificarOpcional(req) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { autenticarTurista, gerarTokenTurista, identificarOpcional };
