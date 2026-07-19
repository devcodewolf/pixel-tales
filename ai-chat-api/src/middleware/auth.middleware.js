/**
 * Middleware de autenticación por API Key propia.
 *
 * El cliente debe enviar el header:
 *   X-API-Key: <valor de API_KEY en .env>
 *
 * Si API_KEY está vacía en el .env, el middleware se desactiva automáticamente
 * (útil para desarrollo local sin tener que configurar nada).
 *
 * En producción, define siempre API_KEY con un valor largo y aleatorio.
 */

import { config } from '../config/index.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireApiKey(req, res, next) {
	const expectedKey = config.auth.apiKey;

	// Si no hay clave configurada, la autenticación está desactivada
	if (!expectedKey) {
		return next();
	}

	const clientKey = req.headers['x-api-key'];

	if (!clientKey || clientKey !== expectedKey) {
		return res.status(401).json({
			error: 'No autorizado. Header X-API-Key inválido o ausente.',
			code: 'UNAUTHORIZED',
		});
	}

	next();
}
