const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'attendance.db');

let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      subgroup TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      synced_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDB();
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// POST /sync — receive array of offline records from client
app.post('/sync', (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'Expected array' });

  let saved = 0;
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO checkins (id, name, phone, subgroup, checked_in_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const r of records) {
    stmt.run([r.id, r.name, r.phone, r.subgroup, r.checked_in_at]);
    if (db.getRowsModified() > 0) saved++;
  }
  stmt.free();
  saveDB();

  res.json({ ok: true, saved, total: records.length });
});

// GET /records — all records
app.get('/records', (req, res) => {
  const result = db.exec('SELECT * FROM checkins ORDER BY checked_in_at DESC');
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  const rows = values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
  res.json(rows);
});

// GET /export.csv
app.get('/export.csv', (req, res) => {
  const result = db.exec('SELECT * FROM checkins ORDER BY checked_in_at ASC');
  const header = 'ID,Name,Phone,Sub-group,Checked In At,Synced At\n';
  let csv = header;
  if (result.length) {
    const { values } = result[0];
    csv += values.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
  res.send(csv);
});

// DELETE /records — clear all
app.delete('/records', (req, res) => {
  try {
    db.run('DELETE FROM checkins');
    saveDB();
    res.json({ ok: true });
  } catch (err) {
    console.error('Clear error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅  Queen's Attendance server running`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://<your-ip>:${PORT}\n`);
  });
});
