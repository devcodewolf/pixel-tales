/**
 * Middlewares de rate limiting.
 * Limitan el número de peticiones por IP en una ventana de tiempo
 * para proteger la cuota gratuita de OpenRouter.
 *
 * Los valores se configuran desde variables de entorno:
 *   RATE_LIMIT_WINDOW_MINUTES  (defecto: 10)
 *   RATE_LIMIT_MAX             (defecto: 60) — rutas generales
 *   RATE_LIMIT_GAME_MAX        (defecto: 20) — rutas de juego
 */

import { rateLimit } from 'express-rate-limit';
import { config } from '../config/index.js';

const { windowMs, max, gameMax } = config.rateLimit;

/**
 * Formatea el tiempo restante en segundos o minutos para el mensaje de error.
 * @param {import('express').Request} req
 * @returns {string}
 */
function retryMessage(req) {
	const retryAfter = req.rateLimit?.resetTime ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) : Math.ceil(windowMs / 1000);

	const minutes = Math.ceil(retryAfter / 60);
	return minutes > 1 ? `Demasiadas peticiones. Inténtalo de nuevo en ${minutes} minutos.` : `Demasiadas peticiones. Inténtalo en unos segundos.`;
}

/**
 * Límite general: se aplica a todas las rutas /api.
 * Más permisivo para permitir navegación normal.
 */
export const generalLimiter = rateLimit({
	windowMs,
	max,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: (_req, res) => {
		res.status(429).json({
			error: `Demasiadas peticiones desde esta IP. Límite: ${max} peticiones cada ${windowMs / 60000} minutos.`,
			code: 'RATE_LIMIT_EXCEEDED',
			retryAfterMs: windowMs,
		});
	},
});

/**
 * Límite estricto: se aplica a las rutas /api/game/*.
 * Más restrictivo porque cada petición consume cuota de OpenRouter.
 */
export const gameLimiter = rateLimit({
	windowMs,
	max: gameMax,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: (_req, res) => {
		res.status(429).json({
			error: `Límite de partidas alcanzado. Máximo ${gameMax} peticiones cada ${windowMs / 60000} minutos por IP.`,
			code: 'GAME_RATE_LIMIT_EXCEEDED',
			retryAfterMs: windowMs,
		});
	},
});
