import express from 'express';
import {
  creaEvento,
  ricercaEventi,
  getEventoById,
  modificaEvento,
  eliminaEvento
} from '../controllers/eventoController.js';

const router = express.Router();

// 🔽 Crea un nuovo evento
router.post('/nuovo', creaEvento);

// 🔽 Ricerca eventi (filtro opzionale per titolo o categoria)
router.get('/ricerca', ricercaEventi);

// 🔽 Ottieni evento per ID
router.get('/:id', getEventoById);

// 🔽 Modifica evento
router.put('/:id/modifica', modificaEvento);

// 🔽 Elimina evento
router.delete('/:id/elimina', eliminaEvento);

export default router;

