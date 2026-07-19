/**
 * Controlador del juego de aventura gráfica.
 * Gestiona los endpoints de inicio y continuación de la historia.
 */

import { startGame, continueGame } from '../services/game.service.js';

/**
 * POST /api/game/start
 * Inicia una nueva partida y devuelve la escena de apertura.
 *
 * Response:
 * {
 *   "story": "Narrative text...",
 *   "imageUrl": "https://image.pollinations.ai/...",
 *   "question": "What do you do?",
 *   "history": [...]
 * }
 */
export async function start(req, res, next) {
	try {
		const { theme } = req.body;

		if (!theme || typeof theme !== 'string' || theme.trim() === '') {
			return res.status(400).json({ error: 'El campo "theme" es requerido. Describe el tipo de historia que quieres jugar.' });
		}

		const result = await startGame(theme);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/**
 * POST /api/game/continue
 * Continúa la historia con la acción del jugador.
 *
 * Body esperado:
 * {
 *   "action": "I want to enter the dark forest",
 *   "history": [...]
 * }
 *
 * Response:
 * {
 *   "story": "Narrative text...",
 *   "imageUrl": "https://image.pollinations.ai/...",
 *   "question": "What do you do?",
 *   "history": [...]
 * }
 */
export async function continueStory(req, res, next) {
	try {
		const { action, history } = req.body;

		if (!action || typeof action !== 'string') {
			return res.status(400).json({ error: 'El campo "action" es requerido y debe ser un string.' });
		}

		if (!Array.isArray(history) || history.length === 0) {
			return res.status(400).json({ error: 'El campo "history" es requerido y debe ser un array no vacío.' });
		}

		const result = await continueGame(action, history);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
