const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, authorizeBaseAccess } = require('../middleware/auth');

module.exports = function(db, logAudit) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', authorizeBaseAccess, (req, res) => {
    const { base_id, equipment_type_id, assignment_type, date_from, date_to, page = 1, limit = 20 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (base_id) { where += ' AND a.base_id = ?'; params.push(base_id); }
    if (equipment_type_id) { where += ' AND a.equipment_type_id = ?'; params.push(equipment_type_id); }
    if (assignment_type) { where += ' AND a.assignment_type = ?'; params.push(assignment_type); }
    if (date_from) { where += ' AND a.assigned_at >= ?'; params.push(date_from); }
    if (date_to) { where += ' AND a.assigned_at <= ?'; params.push(date_to); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = db.prepare(`SELECT COUNT(*) as count FROM assignments a ${where}`).get(...params);
    const rows = db.prepare(`
      SELECT a.*, e.name as equipment_name, e.category, b.name as base_name,
             u.full_name as created_by_name
      FROM assignments a
      JOIN equipment_types e ON a.equipment_type_id = e.id
      JOIN bases b ON a.base_id = b.id
      JOIN users u ON a.created_by = u.id
      ${where} ORDER BY a.assigned_at DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  });

  router.post('/', authorize('admin', 'base_commander', 'logistics_officer'), authorizeBaseAccess, (req, res) => {
    const { equipment_type_id, base_id, assigned_to, personnel_id, quantity, assignment_type, mission, notes } = req.body;
    if (!equipment_type_id || !base_id || !assigned_to || !quantity || !assignment_type)
      return res.status(400).json({ error: 'equipment_type_id, base_id, assigned_to, quantity, and assignment_type are required' });
    if (!['assigned', 'expended'].includes(assignment_type))
      return res.status(400).json({ error: 'assignment_type must be "assigned" or "expended"' });
    if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

    if (assignment_type === 'expended') {
      const asset = db.prepare('SELECT * FROM assets WHERE equipment_type_id = ? AND base_id = ?').get(equipment_type_id, base_id);
      if (!asset || asset.quantity < quantity)
        return res.status(400).json({ error: `Insufficient stock. Available: ${asset?.quantity || 0}` });
      db.prepare('UPDATE assets SET quantity = MAX(0, quantity - ?), last_updated = datetime(\'now\') WHERE equipment_type_id = ? AND base_id = ?')
        .run(quantity, equipment_type_id, base_id);
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO assignments (id, equipment_type_id, base_id, assigned_to, personnel_id, quantity, assignment_type, mission, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, equipment_type_id, base_id, assigned_to, personnel_id || null, quantity, assignment_type, mission || null, notes || null, req.user.id);

    const assignment = db.prepare(`
      SELECT a.*, e.name as equipment_name, b.name as base_name
      FROM assignments a JOIN equipment_types e ON a.equipment_type_id = e.id JOIN bases b ON a.base_id = b.id
      WHERE a.id = ?
    `).get(id);

    logAudit(req.user.id, 'CREATE', 'assignment', id, { equipment_type_id, base_id, assigned_to, quantity, assignment_type, mission }, req.ip);
    res.status(201).json(assignment);
  });

  return router;
};
