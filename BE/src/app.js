require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({
  origin: process.env.FE_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date() }));

module.exports = app;
