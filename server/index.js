const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3020;
const JWT_SECRET = 'trajetx_secret_key_2024';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helpers
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Middleware auth
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token invalide' });
  }
}

// === ROUTES PUBLIQUES ===
app.get('/api/config', (req, res) => {
  const data = readData();
  res.json({
    tarifs: data.tarifs,
    prestations: data.prestations.filter(p => p.actif),
    phone: data.admin.phone
  });
});

// === ROUTES ADMIN ===
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  
  if (username !== data.admin.username) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  
  const valid = await bcrypt.compare(password, data.admin.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username });
});

app.get('/api/admin/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username });
});

app.get('/api/admin/data', authMiddleware, (req, res) => {
  const data = readData();
  res.json({
    username: data.admin.username,
    phone: data.admin.phone,
    tarifs: data.tarifs,
    prestations: data.prestations
  });
});

app.put('/api/admin/credentials', authMiddleware, async (req, res) => {
  const { username, password, phone } = req.body;
  const data = readData();
  
  if (username) data.admin.username = username;
  if (password) data.admin.password = await bcrypt.hash(password, 10);
  if (phone !== undefined) data.admin.phone = phone;
  
  writeData(data);
  res.json({ success: true });
});

app.put('/api/admin/tarifs', authMiddleware, (req, res) => {
  const data = readData();
  data.tarifs = { ...data.tarifs, ...req.body };
  writeData(data);
  res.json(data.tarifs);
});

// === PRESTATIONS ===
app.get('/api/admin/prestations', authMiddleware, (req, res) => {
  const data = readData();
  res.json(data.prestations);
});

app.post('/api/admin/prestations', authMiddleware, (req, res) => {
  const { nom, prix, actif = true } = req.body;
  const data = readData();
  const newId = Math.max(0, ...data.prestations.map(p => p.id)) + 1;
  const newPrestation = { id: newId, nom, prix: parseFloat(prix), actif };
  data.prestations.push(newPrestation);
  writeData(data);
  res.json(newPrestation);
});

app.put('/api/admin/prestations/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const { nom, prix, actif } = req.body;
  const data = readData();
  const index = data.prestations.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Prestation non trouvée' });
  
  if (nom !== undefined) data.prestations[index].nom = nom;
  if (prix !== undefined) data.prestations[index].prix = parseFloat(prix);
  if (actif !== undefined) data.prestations[index].actif = actif;
  
  writeData(data);
  res.json(data.prestations[index]);
});

app.delete('/api/admin/prestations/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();
  data.prestations = data.prestations.filter(p => p.id !== id);
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log('TrajetX server running on port ' + PORT);
});
