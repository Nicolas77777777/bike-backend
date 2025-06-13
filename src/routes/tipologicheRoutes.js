// ✅ Importiamo express per creare le rotte
import express from 'express';

// ✅ Importiamo le funzioni dal controller (AGGIUNTA getTipologicaById)
import {
  creaTipologica,
  ricercaTipologiche,
  getTipologicaById,    // ✅ NUOVO
  modificaTipologica,
  eliminaTipologica
} from '../controllers/tipologicheController.js';

// ✅ Creiamo il router (come un mini-server per gestire le rotte)
const router = express.Router();

// ✅ POST → Crea una nuova tipologica
// URL: POST /tipologiche/nuovo
router.post('/nuovo', creaTipologica);

// ✅ GET → Cerca tipologiche per descrizione
// URL: GET /tipologiche/ricerca?descrizione=qualcosa
router.get('/ricerca', ricercaTipologiche);

// ✅ NUOVO: GET → Recupera una tipologica per ID (per form modifica)
// URL: GET /tipologiche/:id
router.get('/:id', getTipologicaById);

// ✅ PUT → Modifica una tipologica esistente
// URL: PUT /tipologiche/:id
router.put('/:id', modificaTipologica);

// ✅ NUOVO: PUT → Modifica tipologica con endpoint /modifica (per compatibilità frontend)
// URL: PUT /tipologiche/:id/modifica
router.put('/:id/modifica', modificaTipologica);

// ✅ DELETE → Elimina una tipologica
// URL: DELETE /tipologiche/:id
router.delete('/:id', eliminaTipologica);

// ✅ Esportiamo il router così possiamo usarlo in index.js
export default router;