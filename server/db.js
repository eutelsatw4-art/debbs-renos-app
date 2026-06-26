const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, 'data.db');
const INIT_JSON = path.join(__dirname, 'data.json');

const db = new Database(DB_FILE);

function run(sql, params=[]) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

function all(sql, params=[]) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS site (k TEXT PRIMARY KEY, v TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY, title TEXT, desc TEXT, items TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, title TEXT, desc TEXT, image TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, role TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS invites (token TEXT PRIMARY KEY, email TEXT, used INTEGER DEFAULT 0, expires TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS password_resets (token TEXT PRIMARY KEY, username TEXT, used INTEGER DEFAULT 0, expires TEXT)`);
  // ensure images column exists for multiple images
  try {
    const info = await all(`PRAGMA table_info(projects)`);
    const cols = (info || []).map(r => r.name);
    if (!cols.includes('images')) {
      await run(`ALTER TABLE projects ADD COLUMN images TEXT`);
    }
  } catch (e) {
    // ignore
  }
  await run(`CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, message TEXT, phone TEXT, address TEXT, budget TEXT, preferred_date TEXT, project_type TEXT, extras TEXT, date TEXT)`);

  // ensure columns exist (for older DBs): add missing columns if needed
  const info = await all(`PRAGMA table_info(contacts)`);
  const cols = (info || []).map(r => r.name);
  const needed = ['phone','address','budget','preferred_date','project_type','extras'];
  for (const c of needed) {
    if (!cols.includes(c)) {
      try {
        await run(`ALTER TABLE contacts ADD COLUMN ${c} TEXT`);
      } catch (e) {
        // ignore
      }
    }
  }

  // populate from data.json if services empty
  const rows = await all(`SELECT COUNT(*) as c FROM services`);
  if (rows && rows[0] && rows[0].c === 0) {
    try {
      const init = JSON.parse(fs.readFileSync(INIT_JSON, 'utf8'));
      if (init.site) {
        await run(`INSERT OR REPLACE INTO site (k,v) VALUES (?,?)`, ['meta', JSON.stringify(init.site)]);
      }
      if (Array.isArray(init.services)) {
        for (const s of init.services) {
          await run(`INSERT INTO services (id,title,desc,items) VALUES (?,?,?,?)`, [s.id, s.title, s.desc, JSON.stringify(s.items||[])]);
        }
      }
      if (Array.isArray(init.projects)) {
        for (const p of init.projects) {
          await run(`INSERT INTO projects (id,title,desc,image) VALUES (?,?,?,?)`, [p.id, p.title, p.desc, p.image||'']);
        }
      }
    } catch (e) {
      console.warn('No initial JSON to import', e.message);
    }
  }
}

async function getAllData() {
  const siteRow = await all(`SELECT v FROM site WHERE k = ?`, ['meta']);
  const site = siteRow && siteRow[0] ? JSON.parse(siteRow[0].v) : {};
  const services = await all(`SELECT * FROM services ORDER BY id`);
  const projects = await all(`SELECT * FROM projects ORDER BY id`);
  // parse items
  const servicesParsed = services.map(s => ({ id: s.id, title: s.title, desc: s.desc, items: JSON.parse(s.items||'[]') }));
  const projectsParsed = projects.map(p => ({
    id: p.id,
    title: p.title,
    desc: p.desc,
    image: p.image || (p.images ? JSON.parse(p.images)[0] : ''),
    images: p.images ? JSON.parse(p.images) : (p.image ? [p.image] : [])
  }));
  return { site, services: servicesParsed, projects: projectsParsed };
}

async function saveAllData(payload) {
  if (payload.site) {
    await run(`INSERT OR REPLACE INTO site (k,v) VALUES (?,?)`, ['meta', JSON.stringify(payload.site)]);
  }
  if (payload.services) {
    // clear and reinsert
    await run(`DELETE FROM services`);
    for (const s of payload.services) {
      await run(`INSERT INTO services (id,title,desc,items) VALUES (?,?,?,?)`, [s.id, s.title, s.desc, JSON.stringify(s.items||[])]);
    }
  }
  if (payload.projects) {
    await run(`DELETE FROM projects`);
    for (const p of payload.projects) {
      const imgs = p.images ? JSON.stringify(p.images) : JSON.stringify(p.image ? [p.image] : []);
      await run(`INSERT INTO projects (id,title,desc,image,images) VALUES (?,?,?,?,?)`, [p.id, p.title, p.desc, p.image||'', imgs]);
    }
  }
}

async function getContacts() {
  const rows = await all(`SELECT * FROM contacts ORDER BY date DESC`);
  return rows || [];
}

  async function getUserByUsername(username) {
    const rows = await all(`SELECT * FROM users WHERE username = ?`, [username]);
    return rows && rows[0] ? rows[0] : null;
  }

  async function createUser(username, passwordHash, role='admin') {
    await run(`INSERT OR IGNORE INTO users (username,password_hash,role) VALUES (?,?,?)`, [username, passwordHash, role]);
  }

  async function usersCount() {
    const rows = await all(`SELECT COUNT(*) as c FROM users`);
    return rows && rows[0] ? rows[0].c : 0;
  }

  async function listUsers() {
    const rows = await all(`SELECT id,username,role FROM users ORDER BY username`);
    return rows || [];
  }

  async function updateUserPassword(username, passwordHash) {
    await run(`UPDATE users SET password_hash = ? WHERE username = ?`, [passwordHash, username]);
  }

  async function createInvite(token, email, expires) {
    await run(`INSERT OR REPLACE INTO invites (token,email,used,expires) VALUES (?,?,0,?)`, [token, email, expires]);
  }

  async function getInvite(token) {
    const rows = await all(`SELECT * FROM invites WHERE token = ?`, [token]);
    return rows && rows[0] ? rows[0] : null;
  }

  async function useInvite(token) {
    await run(`UPDATE invites SET used = 1 WHERE token = ?`, [token]);
  }

  async function createResetToken(token, username, expires) {
    await run(`INSERT OR REPLACE INTO password_resets (token,username,used,expires) VALUES (?,?,0,?)`, [token, username, expires]);
  }

  async function getResetToken(token) {
    const rows = await all(`SELECT * FROM password_resets WHERE token = ?`, [token]);
    return rows && rows[0] ? rows[0] : null;
  }

  async function useResetToken(token) {
    await run(`UPDATE password_resets SET used = 1 WHERE token = ?`, [token]);
  }

async function saveContact(contact) {
  const now = new Date().toISOString();
  await run(`INSERT INTO contacts (name,email,message,phone,address,budget,preferred_date,project_type,extras,date) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
    contact.name, contact.email, contact.message || '', contact.phone || '', contact.address || '', contact.budget || '', contact.preferred_date || '', contact.project_type || '', contact.extras || '', now
  ]);
}

module.exports = { init, getAllData, saveAllData, saveContact, getUserByUsername, createUser, usersCount, getContacts };
