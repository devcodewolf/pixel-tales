/**
 * Controlador del juego de aventura gráfica.
 * Gestiona los endpoints de inicio y continuación de la historia.
 */

import { startGame, continueGame, fetchSceneImage } from '../services/game.service.js';

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

/**
 * GET /api/game/image?prompt=...&seed=...&sig=...
 * Proxy de imágenes: descarga la imagen desde Pollinations usando el token del
 * backend y la devuelve como binario. La carga directamente un <img>, por eso
 * no exige X-API-Key: su seguridad la aporta la firma (sig) de la URL.
 */
export async function image(req, res, next) {
	try {
		const { prompt, seed, sig } = req.query;
		const upstream = await fetchSceneImage({ prompt, seed, sig });

		if (!upstream.ok) {
			return res.status(502).json({
				error: 'No se pudo generar la imagen en Pollinations.',
				code: 'IMAGE_UPSTREAM_ERROR',
				status: upstream.status,
			});
		}

		const contentType = upstream.headers.get('content-type') || 'image/jpeg';
		const buffer = Buffer.from(await upstream.arrayBuffer());

		res.setHeader('Content-Type', contentType);
		res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
		res.status(200).send(buffer);
	} catch (error) {
		if (error.statusCode) {
			return res.status(error.statusCode).json({ error: error.message });
		}
		next(error);
	}
}
