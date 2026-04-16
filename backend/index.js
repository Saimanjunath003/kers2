const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDb, seedDb } = require('./db/database');
const { createAuditLogger } = require('./middleware/audit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('combined'));

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuild = path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuild));
}

const db = initDb();
seedDb(db);
const logAudit = createAuditLogger(db);

app.use('/api/auth', require('./routes/auth')(db, logAudit));
app.use('/api/dashboard', require('./routes/dashboard')(db));
app.use('/api/purchases', require('./routes/purchases')(db, logAudit));
app.use('/api/transfers', require('./routes/transfers')(db, logAudit));
app.use('/api/assignments', require('./routes/assignments')(db, logAudit));
app.use('/api/audit', require('./routes/audit')(db));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Military Asset Management Server running on port ${PORT}`));

module.exports = app;
