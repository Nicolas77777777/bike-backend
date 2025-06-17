// backend/src/index.js
// importiamo le librerie
import pool from './db/db.js';

console.log("DB config attuale:", {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';

//Importiamo le rotte dei vari moduli
import clienteRoutes from './routes/clienteRoutes.js';
import loginRoutes from './routes/loginRoutes.js';
import tipologicheRoutes from './routes/tipologicheRoutes.js';
import eventoRoutes from './routes/eventoRoutes.js';
import clienteEventoRoutes from './routes/clienteEventoRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname per ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const server = express();
const port = process.env.PORT || 3000;

// ✅ CORS configurato per RAILWAY + LOCAL
server.use(cors({
  origin: [
    'http://localhost:8081', 
    'http://127.0.0.1:8081',
    'https://bikefrontend-production.up.railway.app', // ✅ AGGIUNTO RAILWAY!
    'https://*.up.railway.app' // ✅ WILDCARD per tutti i domini Railway
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'Content-Length']
}));

// Middleware per parsing
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// ✅ IMPORTANTE: Crea cartella export se non esiste (SOLO PER PDF)
const exportPath = path.join(__dirname, '../export');
if (!fs.existsSync(exportPath)) {
  fs.mkdirSync(exportPath, { recursive: true });
  console.log('📁 Cartella export creata per PDF:', exportPath);
}

// ✅ Registriamo le rotte principali
server.use('/', loginRoutes);
server.use('/cliente', clienteRoutes);
server.use('/tipologiche', tipologicheRoutes);
server.use('/evento', eventoRoutes);
server.use('/iscrizioni', clienteEventoRoutes);

// ✅ CRUCIALE: Static files per download (già configurato perfettamente!)
server.use('/download', express.static(path.join(__dirname, '../export')));

// ✅ Rotta di test connessione DB
server.get('/testdb', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    console.error('❌ Errore connessione DB:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ NUOVO: Test endpoint per verificare cartella export
server.get('/test-export', (req, res) => {
  const exportExists = fs.existsSync(exportPath);
  const files = exportExists ? fs.readdirSync(exportPath) : [];
  
  res.json({
    exportPath: exportPath,
    exists: exportExists,
    files: files,
    downloadUrl: `http://localhost:${port}/download/`
  });
});


// ✅ TEST ROUTE per debug iscrizioni
server.get('/iscrizioni/test', (req, res) => {
  res.json({
    messaggio: 'Routes iscrizioni funzionanti!',
    timestamp: new Date().toISOString(),
    routes_disponibili: [
      'POST /iscrizioni/iscrivi',
      'GET /iscrizioni/evento/:id_evento/clienti',
      'GET /iscrizioni/evento/:id_evento/export',     // ← QUESTA DOVREBBE ESISTERE
      'GET /iscrizioni/evento/:id_evento/export-pdf',
      'DELETE /iscrizioni/rimuovi'
    ]
  });
});

// ✅ Error handling globale
server.use((err, req, res, next) => {
  console.error('❌ Errore server:', err);
  res.status(500).json({ 
    errore: 'Errore interno del server',
    dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Avvio server
server.listen(port, () => {
  console.log(`✅ Backend in ascolto su http://localhost:${port}`);
  console.log(`📁 Download disponibili su: http://localhost:${port}/download/`);
  console.log(`🔬 Test export: http://localhost:${port}/test-export`);
  console.log(`🧪 Test iscrizioni: http://localhost:${port}/iscrizioni/test`);
});