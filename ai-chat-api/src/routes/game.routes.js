/**
 * Rutas del juego de aventura gráfica.
 * POST /api/game/start    → Inicia una nueva partida
 * POST /api/game/continue → Continúa la historia con la acción del jugador
 */

import { Router } from 'express';
import { start, continueStory } from '../controllers/game.controller.js';
import { gameLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// El gameLimiter se aplica a todas las rutas de este router
router.use(gameLimiter);

router.post('/start', start);
router.post('/continue', continueStory);

export default router;
