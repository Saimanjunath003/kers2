const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'military-asset-secret-key-2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function authorizeBaseAccess(req, res, next) {
  const { role, base_id } = req.user;
  if (role === 'admin') return next();
  const requestedBaseId = req.query.base_id || req.body.base_id || req.params.base_id;
  if (requestedBaseId && requestedBaseId !== base_id) {
    return res.status(403).json({ error: 'Access restricted to your assigned base' });
  }
  if (role === 'base_commander' || role === 'logistics_officer') {
    if (!requestedBaseId) req.query.base_id = base_id;
  }
  next();
}

module.exports = { authenticate, authorize, authorizeBaseAccess, JWT_SECRET };
