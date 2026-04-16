const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, authorizeBaseAccess } = require('../middleware/auth');

module.exports = function(db, logAudit) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', authorizeBaseAccess, (req, res) => {
    const { base_id, equipment_type_id, date_from, date_to, status, page = 1, limit = 20 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (base_id) { where += ' AND (t.from_base_id = ? OR t.to_base_id = ?)'; params.push(base_id, base_id); }
    if (equipment_type_id) { where += ' AND t.equipment_type_id = ?'; params.push(equipment_type_id); }
    if (date_from) { where += ' AND t.transferred_at >= ?'; params.push(date_from); }
    if (date_to) { where += ' AND t.transferred_at <= ?'; params.push(date_to); }
    if (status) { where += ' AND t.status = ?'; params.push(status); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = db.prepare(`SELECT COUNT(*) as count FROM transfers t ${where}`).get(...params);
    const rows = db.prepare(`
      SELECT t.*, e.name as equipment_name, e.category,
             bf.name as from_base_name, bt.name as to_base_name,
             u.full_name as created_by_name
      FROM transfers t
      JOIN equipment_types e ON t.equipment_type_id = e.id
      JOIN bases bf ON t.from_base_id = bf.id
      JOIN bases bt ON t.to_base_id = bt.id
      JOIN users u ON t.created_by = u.id
      ${where} ORDER BY t.transferred_at DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  });

  router.post('/', authorize('admin', 'logistics_officer', 'base_commander'), (req, res) => {
    const { equipment_type_id, from_base_id, to_base_id, quantity, notes } = req.body;
    if (!equipment_type_id || !from_base_id || !to_base_id || !quantity)
      return res.status(400).json({ error: 'equipment_type_id, from_base_id, to_base_id, and quantity are required' });
    if (from_base_id === to_base_id)
      return res.status(400).json({ error: 'Source and destination bases must differ' });
    if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

    const { role, base_id: userBaseId } = req.user;
    if (role !== 'admin' && from_base_id !== userBaseId)
      return res.status(403).json({ error: 'You can only transfer from your assigned base' });

    const fromAsset = db.prepare('SELECT * FROM assets WHERE equipment_type_id = ? AND base_id = ?').get(equipment_type_id, from_base_id);
    if (!fromAsset || fromAsset.quantity < quantity)
      return res.status(400).json({ error: `Insufficient stock. Available: ${fromAsset?.quantity || 0}` });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO transfers (id, equipment_type_id, from_base_id, to_base_id, quantity, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
    `).run(id, equipment_type_id, from_base_id, to_base_id, quantity, notes || null, req.user.id);

    db.prepare('UPDATE assets SET quantity = quantity - ?, last_updated = datetime(\'now\') WHERE equipment_type_id = ? AND base_id = ?')
      .run(quantity, equipment_type_id, from_base_id);

    const toAsset = db.prepare('SELECT * FROM assets WHERE equipment_type_id = ? AND base_id = ?').get(equipment_type_id, to_base_id);
    if (toAsset) {
      db.prepare('UPDATE assets SET quantity = quantity + ?, last_updated = datetime(\'now\') WHERE equipment_type_id = ? AND base_id = ?')
        .run(quantity, equipment_type_id, to_base_id);
    } else {
      db.prepare('INSERT INTO assets (id, equipment_type_id, base_id, quantity, opening_balance) VALUES (?, ?, ?, ?, 0)')
        .run(uuidv4(), equipment_type_id, to_base_id, quantity);
    }

    const transfer = db.prepare(`
      SELECT t.*, e.name as equipment_name, bf.name as from_base_name, bt.name as to_base_name
      FROM transfers t
      JOIN equipment_types e ON t.equipment_type_id = e.id
      JOIN bases bf ON t.from_base_id = bf.id
      JOIN bases bt ON t.to_base_id = bt.id
      WHERE t.id = ?
    `).get(id);

    logAudit(req.user.id, 'CREATE', 'transfer', id, { equipment_type_id, from_base_id, to_base_id, quantity }, req.ip);
    res.status(201).json(transfer);
  });

  return router;
};
