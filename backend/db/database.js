const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production' ? '/tmp/military_assets.db' : path.join(__dirname, 'military_assets.db');

function initDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS bases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      location TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'base_commander', 'logistics_officer')),
      base_id TEXT REFERENCES bases(id),
      full_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipment_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('weapon', 'vehicle', 'ammunition', 'equipment'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id),
      base_id TEXT NOT NULL REFERENCES bases(id),
      quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
      opening_balance INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id),
      base_id TEXT NOT NULL REFERENCES bases(id),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      supplier TEXT,
      notes TEXT,
      purchased_at TEXT DEFAULT (datetime('now')),
      created_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id),
      from_base_id TEXT NOT NULL REFERENCES bases(id),
      to_base_id TEXT NOT NULL REFERENCES bases(id),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      notes TEXT,
      transferred_at TEXT DEFAULT (datetime('now')),
      created_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id),
      base_id TEXT NOT NULL REFERENCES bases(id),
      assigned_to TEXT NOT NULL,
      personnel_id TEXT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      assignment_type TEXT NOT NULL CHECK(assignment_type IN ('assigned', 'expended')),
      mission TEXT,
      notes TEXT,
      assigned_at TEXT DEFAULT (datetime('now')),
      created_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function seedDb(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  const { v4: uuidv4 } = require('uuid');

  const bases = [
    { id: uuidv4(), name: 'Alpha Base', location: 'Northern Sector' },
    { id: uuidv4(), name: 'Bravo Base', location: 'Southern Sector' },
    { id: uuidv4(), name: 'Charlie Base', location: 'Eastern Sector' },
  ];
  const insertBase = db.prepare('INSERT INTO bases (id, name, location) VALUES (?, ?, ?)');
  for (const b of bases) insertBase.run(b.id, b.name, b.location);

  const equipTypes = [
    { id: uuidv4(), name: 'M4 Carbine', category: 'weapon' },
    { id: uuidv4(), name: 'AK-47', category: 'weapon' },
    { id: uuidv4(), name: '9mm Pistol', category: 'weapon' },
    { id: uuidv4(), name: 'Humvee', category: 'vehicle' },
    { id: uuidv4(), name: 'MRAP', category: 'vehicle' },
    { id: uuidv4(), name: '5.56mm Ammo (Box)', category: 'ammunition' },
    { id: uuidv4(), name: '9mm Ammo (Box)', category: 'ammunition' },
    { id: uuidv4(), name: 'Night Vision Goggles', category: 'equipment' },
    { id: uuidv4(), name: 'Body Armor', category: 'equipment' },
    { id: uuidv4(), name: 'Radio Set', category: 'equipment' },
  ];
  const insertEq = db.prepare('INSERT INTO equipment_types (id, name, category) VALUES (?, ?, ?)');
  for (const e of equipTypes) insertEq.run(e.id, e.name, e.category);

  const adminPwd = bcrypt.hashSync('admin123', 10);
  const cmdPwd = bcrypt.hashSync('commander123', 10);
  const logPwd = bcrypt.hashSync('logistics123', 10);

  const users = [
    { id: uuidv4(), username: 'admin', password_hash: adminPwd, role: 'admin', base_id: null, full_name: 'System Administrator' },
    { id: uuidv4(), username: 'cmd_alpha', password_hash: cmdPwd, role: 'base_commander', base_id: bases[0].id, full_name: 'Commander Alpha' },
    { id: uuidv4(), username: 'cmd_bravo', password_hash: cmdPwd, role: 'base_commander', base_id: bases[1].id, full_name: 'Commander Bravo' },
    { id: uuidv4(), username: 'log_officer1', password_hash: logPwd, role: 'logistics_officer', base_id: bases[0].id, full_name: 'Lt. John Harris' },
    { id: uuidv4(), username: 'log_officer2', password_hash: logPwd, role: 'logistics_officer', base_id: bases[1].id, full_name: 'Lt. Sarah Chen' },
  ];
  const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, role, base_id, full_name) VALUES (?, ?, ?, ?, ?, ?)');
  for (const u of users) insertUser.run(u.id, u.username, u.password_hash, u.role, u.base_id, u.full_name);

  // Seed assets with opening balances
  const insertAsset = db.prepare('INSERT INTO assets (id, equipment_type_id, base_id, quantity, opening_balance) VALUES (?, ?, ?, ?, ?)');
  for (const base of bases) {
    for (const eq of equipTypes) {
      const qty = Math.floor(Math.random() * 50) + 10;
      insertAsset.run(uuidv4(), eq.id, base.id, qty, qty);
    }
  }

  // Seed purchases
  const insertPurchase = db.prepare('INSERT INTO purchases (id, equipment_type_id, base_id, quantity, supplier, purchased_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertAudit = db.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)');

  for (let i = 0; i < 20; i++) {
    const pid = uuidv4();
    const base = bases[Math.floor(Math.random() * bases.length)];
    const eq = equipTypes[Math.floor(Math.random() * equipTypes.length)];
    const qty = Math.floor(Math.random() * 20) + 1;
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 3600000).toISOString();
    const user = users.find(u => u.role !== 'admin' && u.base_id === base.id) || users[0];
    insertPurchase.run(pid, eq.id, base.id, qty, 'Defense Contractor Corp', date, user.id);
    db.prepare('UPDATE assets SET quantity = quantity + ?, last_updated = ? WHERE equipment_type_id = ? AND base_id = ?')
      .run(qty, date, eq.id, base.id);
    insertAudit.run(uuidv4(), user.id, 'CREATE', 'purchase', pid, JSON.stringify({ qty, base: base.name, equipment: eq.name }));
  }

  // Seed transfers
  const insertTransfer = db.prepare('INSERT INTO transfers (id, equipment_type_id, from_base_id, to_base_id, quantity, status, transferred_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 15; i++) {
    const tid = uuidv4();
    const fromBase = bases[Math.floor(Math.random() * bases.length)];
    const toBase = bases.filter(b => b.id !== fromBase.id)[Math.floor(Math.random() * 2)];
    const eq = equipTypes[Math.floor(Math.random() * equipTypes.length)];
    const qty = Math.floor(Math.random() * 10) + 1;
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 3600000).toISOString();
    const user = users[0];
    insertTransfer.run(tid, eq.id, fromBase.id, toBase.id, qty, 'completed', date, user.id);
    db.prepare('UPDATE assets SET quantity = quantity - ?, last_updated = ? WHERE equipment_type_id = ? AND base_id = ? AND quantity >= ?')
      .run(qty, date, eq.id, fromBase.id, qty);
    db.prepare('UPDATE assets SET quantity = quantity + ?, last_updated = ? WHERE equipment_type_id = ? AND base_id = ?')
      .run(qty, date, eq.id, toBase.id);
    insertAudit.run(uuidv4(), user.id, 'CREATE', 'transfer', tid, JSON.stringify({ qty, from: fromBase.name, to: toBase.name, equipment: eq.name }));
  }

  // Seed assignments
  const insertAssignment = db.prepare('INSERT INTO assignments (id, equipment_type_id, base_id, assigned_to, quantity, assignment_type, mission, assigned_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const personnel = ['Sgt. Johnson', 'Cpl. Martinez', 'Lt. Davis', 'Pvt. Thompson', 'Sgt. Wilson'];
  const missions = ['Patrol Alpha', 'Recon Bravo', 'Defense Charlie', 'Supply Run', 'Training Exercise'];
  for (let i = 0; i < 25; i++) {
    const aid = uuidv4();
    const base = bases[Math.floor(Math.random() * bases.length)];
    const eq = equipTypes.filter(e => e.category !== 'ammunition').slice(0,6)[Math.floor(Math.random() * 6)];
    const qty = Math.floor(Math.random() * 3) + 1;
    const type = Math.random() > 0.3 ? 'assigned' : 'expended';
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 3600000).toISOString();
    const user = users.find(u => u.base_id === base.id) || users[0];
    const person = personnel[Math.floor(Math.random() * personnel.length)];
    const mission = missions[Math.floor(Math.random() * missions.length)];
    insertAssignment.run(aid, eq.id, base.id, person, qty, type, mission, date, user.id);
    if (type === 'expended') {
      db.prepare('UPDATE assets SET quantity = MAX(0, quantity - ?), last_updated = ? WHERE equipment_type_id = ? AND base_id = ?')
        .run(qty, date, eq.id, base.id);
    }
    insertAudit.run(uuidv4(), user.id, 'CREATE', 'assignment', aid, JSON.stringify({ type, qty, person, mission, equipment: eq.name }));
  }

  console.log('Database seeded successfully');
}

module.exports = { initDb, seedDb, DB_PATH };
