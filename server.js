require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Arora456';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'blinkandglam_secret_key_2025';
const DATA_FILE = path.join(__dirname, 'db.json');

function loadDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ bookings: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(m[1], ADMIN_JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

app.post('/api/bookings/auth', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ success: false, message: 'Password required' });
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Invalid password' });
});

app.post('/api/bookings', (req, res) => {
  const { lashType, price, name, phone, date, time, paymentType, paymentAmount } = req.body || {};
  if (!lashType || !name || !phone) return res.status(400).json({ success: false, message: 'Missing required fields' });
  const db = loadDB();
  const booking = { id: nanoid(10), lashType, price, name, phone, date, time, paymentType, paymentAmount, status: 'pending', createdAt: new Date().toISOString() };
  db.bookings.push(booking);
  saveDB(db);
  res.status(201).json({ success: true, booking });
});

app.post('/api/bookings/cancel', (req, res) => {
  const { phone } = req.body || {};
  const db = loadDB();
  const idx = db.bookings.findIndex(b => b.phone === phone && b.status !== 'cancelled');
  if (idx === -1) return res.status(404).json({ success: false, message: 'Booking not found' });
  db.bookings[idx].status = 'cancelled';
  db.bookings[idx].cancelledAt = new Date().toISOString();
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/bookings', verifyToken, (req, res) => res.json({ success: true, bookings: loadDB().bookings }));

app.post('/api/bookings/:id/confirm', verifyToken, (req, res) => {
  const db = loadDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Not found' });
  booking.status = 'confirmed';
  saveDB(db);
  res.json({ success: true, booking });
});

app.delete('/api/bookings/:id', verifyToken, (req, res) => {
  const db = loadDB();
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  db.bookings.splice(idx, 1);
  saveDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`BlinkandGlam-booking-api running on port ${PORT}`));