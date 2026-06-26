const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

// ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || 'change_this_secret';

// initialize sqlite DB (imports from data.json on first run)
db.init().catch(err => console.error('DB init error', err));

// seed admin user from env if none exist
(async function seedAdmin(){
  try{
    const count = await db.usersCount();
    if (count === 0 && process.env.ADMIN_USER && process.env.ADMIN_PASSWORD) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt);
      await db.createUser(process.env.ADMIN_USER, hash, 'admin');
      console.log('Seeded admin user from env:', process.env.ADMIN_USER);
    }
  }catch(e){/* ignore */}
})();

app.get('/api/site', async (req, res) => {
  try {
    const d = await db.getAllData();
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

function requireAdmin(req, res, next) {
  // allow legacy header
  const adminPass = process.env.ADMIN_PASSWORD;
  const provided = req.headers['x-admin-password'];
  if (provided && adminPass && provided === adminPass) return next();

  // allow bearer token
  const auth = req.headers['authorization'];
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'invalid token' });
    }
  }

  return res.status(401).json({ error: 'unauthorized' });
}

// admin login -> returns JWT
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  // if username provided, validate against users table
  if (username) {
    try {
      const user = await db.getUserByUsername(username);
      if (!user) return res.status(401).json({ error: 'invalid credentials' });
      const ok = bcrypt.compareSync(password || '', user.password_hash || '');
      if (!ok) return res.status(401).json({ error: 'invalid credentials' });
      const token = jwt.sign({ role: user.role || 'admin', username: user.username }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // fallback: compare to ADMIN_PASSWORD env
  if (!adminPass) return res.status(500).json({ error: 'ADMIN_PASSWORD not configured on server' });
  if (!password || password !== adminPass) return res.status(401).json({ error: 'invalid credentials' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// register a new admin user (requires server admin secret via header)
app.post('/api/admin/register', async (req, res) => {
  const adminSecret = req.headers['x-admin-password'];
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass || adminSecret !== adminPass) return res.status(401).json({ error: 'unauthorized' });
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    await db.createUser(username, hash, 'admin');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

app.post('/api/site', requireAdmin, async (req, res) => {
  try {
    await db.saveAllData(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// admin: list contacts
app.get('/api/contacts', requireAdmin, async (req, res) => {
  try {
    const rows = await db.getContacts();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// admin: export contacts CSV
app.get('/api/contacts/export', requireAdmin, async (req, res) => {
  try {
    const rows = await db.getContacts();
    const fields = ['id','name','email','phone','address','budget','preferred_date','project_type','extras','message','date'];
    const csv = [fields.join(',')].concat(rows.map(r => fields.map(f => {
      const v = r[f] == null ? '' : String(r[f]).replace(/"/g, '""');
      return `"${v.replace(/\"/g,'\"')}"`;
    }).join(','))).join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.type('text/csv').send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contact', async (req, res) => {
  console.log('Contact submit:', req.body);
  const { name, email, message, phone, address, budget, preferred_date, project_type, extras } = req.body;

  // try send email if SMTP configured
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || 'no-reply@debbsrenos.com',
      to: process.env.CONTACT_RECEIVER || process.env.SMTP_USER,
      subject: `Website contact: ${name || 'New message'}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || ''}\nAddress: ${address || ''}\nBudget: ${budget || ''}\nPreferred date: ${preferred_date || ''}\nProject type: ${project_type || ''}\n\nMessage:\n${message || ''}\n\nExtras:\n${extras || ''}`
    };

    transporter.sendMail(mailOptions).then(() => {
      // also save to DB
      db.saveContact({ name, email, message, phone, address, budget, preferred_date, project_type, extras }).catch(() => {});
      res.json({ ok: true, sent: true });
    }).catch(err => {
      console.error('Mail error', err);
      res.json({ ok: false, error: 'mail error' });
    });
  } else {
    // fallback: store to sqlite contacts
    try {
      await db.saveContact({ name, email, message, phone, address, budget, preferred_date, project_type, extras });
      res.json({ ok: true, saved: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
});

app.post('/api/test-smtp', requireAdmin, async (req, res) => {
  const cfg = req.body;
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: parseInt(cfg.port || '587', 10),
      secure: cfg.secure === true || cfg.secure === 'true',
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined
    });
    await transporter.sendMail({ from: cfg.from || cfg.user, to: cfg.to || cfg.user, subject: 'SMTP test', text: 'This is a test' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
