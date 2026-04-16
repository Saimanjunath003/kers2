const { v4: uuidv4 } = require('uuid');

function createAuditLogger(db) {
  return function logAudit(userId, action, entityType, entityId, details, ip) {
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, action, entityType, entityId, JSON.stringify(details), ip || 'unknown');
    } catch (err) {
      console.error('Audit log error:', err.message);
    }
  };
}

module.exports = { createAuditLogger };
