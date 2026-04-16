const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

module.exports = function(db, logAudit) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare(`
      SELECT u.*, b.name as base_name FROM users u
      LEFT JOIN bases b ON u.base_id = b.id
      WHERE u.username = ?
    `).get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, base_id: user.base_id, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logAudit(user.id, 'LOGIN', 'user', user.id, { username }, req.ip);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, base_id: user.base_id, base_name: user.base_name, full_name: user.full_name } });
  });

  router.get('/me', authenticate, (req, res) => {
    const user = db.prepare(`
      SELECT u.id, u.username, u.role, u.base_id, u.full_name, b.name as base_name
      FROM users u LEFT JOIN bases b ON u.base_id = b.id WHERE u.id = ?
    `).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  return router;
};
