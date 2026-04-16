const express = require('express');
const { authenticate, authorizeBaseAccess } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/metrics', authorizeBaseAccess, (req, res) => {
    const { base_id, equipment_type_id, date_from, date_to } = req.query;
    const dateFrom = date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const dateTo = date_to || new Date().toISOString();

    let baseFilter = base_id ? 'AND a.base_id = ?' : '';
    let eqFilter = equipment_type_id ? 'AND a.equipment_type_id = ?' : '';
    const params = [];
    if (base_id) params.push(base_id);
    if (equipment_type_id) params.push(equipment_type_id);

    const assets = db.prepare(`
      SELECT
        SUM(a.opening_balance) as opening_balance,
        SUM(a.quantity) as closing_balance
      FROM assets a WHERE 1=1 ${baseFilter} ${eqFilter}
    `).get(...params);

    let pParams = [dateFrom, dateTo];
    let pBaseFilter = base_id ? 'AND base_id = ?' : '';
    let pEqFilter = equipment_type_id ? 'AND equipment_type_id = ?' : '';
    if (base_id) pParams.push(base_id);
    if (equipment_type_id) pParams.push(equipment_type_id);

    const purchases = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total FROM purchases
      WHERE purchased_at BETWEEN ? AND ? ${pBaseFilter} ${pEqFilter}
    `).get(...pParams);

    let tParams = [dateFrom, dateTo];
    let tBaseInFilter = base_id ? 'AND to_base_id = ?' : '';
    let tBaseOutFilter = base_id ? 'AND from_base_id = ?' : '';
    let tEqFilter = equipment_type_id ? 'AND equipment_type_id = ?' : '';

    const transferInParams = [...tParams];
    const transferOutParams = [...tParams];
    if (base_id) { transferInParams.push(base_id); transferOutParams.push(base_id); }
    if (equipment_type_id) { transferInParams.push(equipment_type_id); transferOutParams.push(equipment_type_id); }

    const transferIn = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total FROM transfers
      WHERE transferred_at BETWEEN ? AND ? AND status = 'completed' ${tBaseInFilter} ${tEqFilter}
    `).get(...transferInParams);

    const transferOut = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total FROM transfers
      WHERE transferred_at BETWEEN ? AND ? AND status = 'completed' ${tBaseOutFilter} ${tEqFilter}
    `).get(...transferOutParams);

    let aParams = [dateFrom, dateTo];
    if (base_id) aParams.push(base_id);
    if (equipment_type_id) aParams.push(equipment_type_id);
    const aBaseFilter = base_id ? 'AND base_id = ?' : '';
    const aEqFilter = equipment_type_id ? 'AND equipment_type_id = ?' : '';

    const assigned = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total FROM assignments
      WHERE assigned_at BETWEEN ? AND ? AND assignment_type = 'assigned' ${aBaseFilter} ${aEqFilter}
    `).get(...aParams);

    const expended = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total FROM assignments
      WHERE assigned_at BETWEEN ? AND ? AND assignment_type = 'expended' ${aBaseFilter} ${aEqFilter}
    `).get(...aParams);

    const netMovement = purchases.total + transferIn.total - transferOut.total;

    res.json({
      opening_balance: assets.opening_balance || 0,
      closing_balance: assets.closing_balance || 0,
      net_movement: netMovement,
      purchases: purchases.total,
      transfer_in: transferIn.total,
      transfer_out: transferOut.total,
      assigned: assigned.total,
      expended: expended.total,
    });
  });

  router.get('/net-movement-detail', authorizeBaseAccess, (req, res) => {
    const { base_id, equipment_type_id, date_from, date_to } = req.query;
    const dateFrom = date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const dateTo = date_to || new Date().toISOString();

    let pWhere = 'WHERE p.purchased_at BETWEEN ? AND ?';
    let pParams = [dateFrom, dateTo];
    if (base_id) { pWhere += ' AND p.base_id = ?'; pParams.push(base_id); }
    if (equipment_type_id) { pWhere += ' AND p.equipment_type_id = ?'; pParams.push(equipment_type_id); }

    const purchasesList = db.prepare(`
      SELECT p.id, p.quantity, p.supplier, p.purchased_at, p.notes,
             e.name as equipment_name, e.category, b.name as base_name
      FROM purchases p
      JOIN equipment_types e ON p.equipment_type_id = e.id
      JOIN bases b ON p.base_id = b.id
      ${pWhere} ORDER BY p.purchased_at DESC LIMIT 50
    `).all(...pParams);

    let tInWhere = 'WHERE t.transferred_at BETWEEN ? AND ? AND t.status = ?';
    let tInParams = [dateFrom, dateTo, 'completed'];
    if (base_id) { tInWhere += ' AND t.to_base_id = ?'; tInParams.push(base_id); }
    if (equipment_type_id) { tInWhere += ' AND t.equipment_type_id = ?'; tInParams.push(equipment_type_id); }

    const transferInList = db.prepare(`
      SELECT t.id, t.quantity, t.transferred_at, t.notes,
             e.name as equipment_name, e.category,
             bf.name as from_base, bt.name as to_base
      FROM transfers t
      JOIN equipment_types e ON t.equipment_type_id = e.id
      JOIN bases bf ON t.from_base_id = bf.id
      JOIN bases bt ON t.to_base_id = bt.id
      ${tInWhere} ORDER BY t.transferred_at DESC LIMIT 50
    `).all(...tInParams);

    let tOutWhere = 'WHERE t.transferred_at BETWEEN ? AND ? AND t.status = ?';
    let tOutParams = [dateFrom, dateTo, 'completed'];
    if (base_id) { tOutWhere += ' AND t.from_base_id = ?'; tOutParams.push(base_id); }
    if (equipment_type_id) { tOutWhere += ' AND t.equipment_type_id = ?'; tOutParams.push(equipment_type_id); }

    const transferOutList = db.prepare(`
      SELECT t.id, t.quantity, t.transferred_at, t.notes,
             e.name as equipment_name, e.category,
             bf.name as from_base, bt.name as to_base
      FROM transfers t
      JOIN equipment_types e ON t.equipment_type_id = e.id
      JOIN bases bf ON t.from_base_id = bf.id
      JOIN bases bt ON t.to_base_id = bt.id
      ${tOutWhere} ORDER BY t.transferred_at DESC LIMIT 50
    `).all(...tOutParams);

    res.json({ purchases: purchasesList, transfer_in: transferInList, transfer_out: transferOutList });
  });

  router.get('/bases', (req, res) => {
    const bases = db.prepare('SELECT * FROM bases ORDER BY name').all();
    res.json(bases);
  });

  router.get('/equipment-types', (req, res) => {
    const types = db.prepare('SELECT * FROM equipment_types ORDER BY category, name').all();
    res.json(types);
  });

  return router;
};
