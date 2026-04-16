const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, authorizeBaseAccess } = require('../middleware/auth');

module.exports = function(db, logAudit) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', authorizeBaseAccess, (req, res) => {
    const { base_id, equipment_type_id, date_from, date_to, page = 1, limit = 20 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (base_id) { where += ' AND p.base_id = ?'; params.push(base_id); }
    if (equipment_type_id) { where += ' AND p.equipment_type_id = ?'; params.push(equipment_type_id); }
    if (date_from) { where += ' AND p.purchased_at >= ?'; params.push(date_from); }
    if (date_to) { where += ' AND p.purchased_at <= ?'; params.push(date_to); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = db.prepare(`SELECT COUNT(*) as count FROM purchases p ${where}`).get(...params);
    const rows = db.prepare(`
      SELECT p.*, e.name as equipment_name, e.category, b.name as base_name,
             u.full_name as created_by_name
      FROM purchases p
      JOIN equipment_types e ON p.equipment_type_id = e.id
      JOIN bases b ON p.base_id = b.id
      JOIN users u ON p.created_by = u.id
      ${where} ORDER BY p.purchased_at DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  });

  router.post('/', authorize('admin', 'logistics_officer', 'base_commander'), authorizeBaseAccess, (req, res) => {
    const { equipment_type_id, base_id, quantity, supplier, notes } = req.body;
    if (!equipment_type_id || !base_id || !quantity) {
      return res.status(400).json({ error: 'equipment_type_id, base_id, and quantity are required' });
    }
    if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO purchases (id, equipment_type_id, base_id, quantity, supplier, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, equipment_type_id, base_id, quantity, supplier || null, notes || null, req.user.id);

    const asset = db.prepare('SELECT * FROM assets WHERE equipment_type_id = ? AND base_id = ?').get(equipment_type_id, base_id);
    if (asset) {
      db.prepare('UPDATE assets SET quantity = quantity + ?, last_updated = datetime(\'now\') WHERE equipment_type_id = ? AND base_id = ?')
        .run(quantity, equipment_type_id, base_id);
    } else {
      db.prepare('INSERT INTO assets (id, equipment_type_id, base_id, quantity, opening_balance) VALUES (?, ?, ?, ?, 0)')
        .run(uuidv4(), equipment_type_id, base_id, quantity);
    }

    const purchase = db.prepare(`
      SELECT p.*, e.name as equipment_name, b.name as base_name
      FROM purchases p JOIN equipment_types e ON p.equipment_type_id = e.id JOIN bases b ON p.base_id = b.id
      WHERE p.id = ?
    `).get(id);

    logAudit(req.user.id, 'CREATE', 'purchase', id, { equipment_type_id, base_id, quantity, supplier }, req.ip);
    res.status(201).json(purchase);
  });

  router.delete('/:id', authorize('admin'), (req, res) => {
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE assets SET quantity = MAX(0, quantity - ?) WHERE equipment_type_id = ? AND base_id = ?')
      .run(purchase.quantity, purchase.equipment_type_id, purchase.base_id);
    logAudit(req.user.id, 'DELETE', 'purchase', req.params.id, {}, req.ip);
    res.json({ message: 'Purchase deleted' });
  });

  return router;
};
