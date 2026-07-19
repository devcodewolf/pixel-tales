/**
 * Configuración y arranque de la aplicación Express.
 */

import express from 'express';
import router from './routes/index.js';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requireJson } from './middleware/validate.middleware.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { requireApiKey } from './middleware/auth.middleware.js';
import { image } from './controllers/game.controller.js';

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOriginsSet = new Set(config.cors.allowedOrigins);

app.use((req, res, next) => {
	const origin = req.headers.origin;

	if (origin && allowedOriginsSet.has(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
	res.setHeader('Vary', 'Origin');

	if (req.method === 'OPTIONS') return res.sendStatus(204);
	next();
});

// ── Middlewares globales ────────────────────────────────────────────────────────
app.use(express.json());
app.use(requireJson);
app.use(generalLimiter);

// Proxy de imágenes: lo carga un <img>, que no puede enviar X-API-Key, así que
// va ANTES de requireApiKey. Su seguridad la aporta la firma HMAC de la URL.
app.get('/api/game/image', image);

app.use(requireApiKey);

// ── Rutas ──────────────────────────────────────────────────────────────────────
app.use('/api', router);

// Ruta raíz informativa
app.get('/', (_req, res) => {
	res.json({
		name: 'ai-chat-api',
		version: '1.0.0',
		description: 'API intermedia para chat de IA con múltiples proveedores',
		docs: '/api/health',
	});
});

// ── Manejo de rutas no encontradas ─────────────────────────────────────────────
app.use((_req, res) => {
	res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Middleware de errores (debe ir al final) ────────────────────────────────────
app.use(errorHandler);

export default app;
