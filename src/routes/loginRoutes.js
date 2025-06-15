import express from 'express';
import { inserisciLogin, controllaLogin } from '../controllers/loginController.js';

const router = express.Router();

// ✅ CORRETTO: Route che il frontend sta chiamando
router.post('/controllologin', controllaLogin);

// ✅ OPZIONALE: Per registrare nuovi utenti (solo admin)
router.post('/registra', inserisciLogin);

export default router;