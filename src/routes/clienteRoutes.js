import express from 'express';
import {
  creaCliente,
  ricercaCliente,
  getClienteById,
  modificaCliente,
  eliminaCliente
} from '../controllers/clienteController.js';

const router = express.Router();

router.post('/', creaCliente);
router.get('/ricerca', ricercaCliente);
router.get('/:id', getClienteById);
router.get('/:id/modifica', getClienteById);
router.post('/:id/modifica', modificaCliente);
router.delete('/clienti/:id', eliminaCliente);

export default router;

