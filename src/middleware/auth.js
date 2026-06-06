const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  const cookieToken = req.cookies && req.cookies.token;
  const token = (header && header.startsWith('Bearer ') && header.slice(7)) || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Autenticacao necessaria' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }

  req.user = payload;
  next();
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = { signToken, verifyToken, authRequired, adminRequired };
