const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();
  router.use(authenticate, authorize('admin'));

  router.get('/', (req, res) => {
    const { entity_type, action, date_from, date_to, page = 1, limit = 50 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (entity_type) { where += ' AND l.entity_type = ?'; params.push(entity_type); }
    if (action) { where += ' AND l.action = ?'; params.push(action); }
    if (date_from) { where += ' AND l.created_at >= ?'; params.push(date_from); }
    if (date_to) { where += ' AND l.created_at <= ?'; params.push(date_to); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = db.prepare(`SELECT COUNT(*) as count FROM audit_logs l ${where}`).get(...params);
    const rows = db.prepare(`
      SELECT l.*, u.username, u.full_name
      FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id
      ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  });

  return router;
};
