/**
 * Router raíz.
 * Agrega todos los sub-routers de la aplicación bajo el prefijo /api.
 */

import { Router } from 'express';
import chatRoutes from './chat.routes.js';
import gameRoutes from './game.routes.js';

const router = Router();

router.use('/chat', chatRoutes);
router.use('/game', gameRoutes);

// Health check básico
router.get('/health', (_req, res) => {
	res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
