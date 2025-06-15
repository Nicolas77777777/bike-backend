import express from 'express';
import {
  creaCliente,
  listaClienti,        // ✅ NUOVO: Lista completa clienti
  statisticheClienti,  // ✅ NUOVO: Statistiche clienti
  ricercaCliente,
  getClienteById,
  modificaCliente,
  eliminaCliente
} from '../controllers/clienteController.js';

const router = express.Router();

// ✅ POST: Crea nuovo cliente
router.post('/', creaCliente);

// ✅ GET: Lista completa di tutti i clienti
// Supporta parametri query: ?orderBy=cognome_rag_soc&order=ASC&limit=50&offset=0&attivi_solo=true
router.get('/lista', listaClienti);

// ✅ GET: Statistiche dei clienti
router.get('/statistiche', statisticheClienti);

// ✅ GET: Ricerca clienti con filtri
router.get('/ricerca', ricercaCliente);

// ✅ CORRETTO: Recupera cliente per ID (con validazione migliorata)
router.get('/:id', getClienteById);

// ✅ GET: Recupera cliente per modifica (usa lo stesso controller)
router.get('/:id/modifica', getClienteById);

// ✅ POST: Modifica cliente (con validazione migliorata)
router.post('/:id/modifica', modificaCliente);

// ✅ DELETE: Elimina cliente (con validazione migliorata)
router.delete('/:id', eliminaCliente);

export default router;