import express from 'express';
import { inserisciLogin, controllaLogin } from '../controllers/loginController.js';

const router = express.Router();

router.post('/login', inserisciLogin);
router.post('/controllologin', controllaLogin);

export default router;
