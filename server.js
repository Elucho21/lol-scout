require('dotenv').config();
const express = require('express');
const cors = require('cors');

const playerRoutes = require('./routes/player');
const championRoutes = require('./routes/champion');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Logging con timestamp
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// --- Routes ---
app.use('/api/player', playerRoutes);
app.use('/api/champion', championRoutes);

// La ruta de mastery vive en el router de player pero con prefijo distinto
// GET /api/mastery/:puuid/:championId → ya registrado en playerRoutes como /mastery/...
app.use('/api/mastery', playerRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] LoL Scout API running on http://localhost:${PORT}`);
});
