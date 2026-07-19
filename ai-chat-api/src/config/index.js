/**
 * Configuración central de la aplicación.
 * Lee las variables de entorno y expone valores tipados y validados.
 */

const getEnv = (key, fallback) => {
	const value = process.env[key];
	if (value === undefined || value === '') {
		if (fallback !== undefined) return fallback;
		throw new Error(`Variable de entorno requerida no definida: ${key}`);
	}
	return value;
};

export const config = {
	port: parseInt(getEnv('PORT', '3000'), 10),

	providers: {
		order: getEnv('PROVIDER_ORDER', 'openrouter,groq')
			.split(',')
			.map((p) => p.trim()),
		retryAfterMinutes: parseInt(getEnv('PROVIDER_RETRY_MINUTES', '60'), 10),
	},

	openrouter: {
		apiKey: getEnv('OPENROUTER_API_KEY', ''),
		model: getEnv('OPENROUTER_MODEL', 'openai/gpt-oss-120b:free'),
		baseUrl: 'https://openrouter.ai/api/v1',
	},

	groq: {
		apiKey: getEnv('GROQ_API_KEY', ''),
		model: getEnv('GROQ_MODEL', 'llama-3.1-8b-instant'),
		baseUrl: 'https://api.groq.com/openai/v1',
	},

	rateLimit: {
		/** Ventana de tiempo en ms para contar peticiones */
		windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MINUTES', '10'), 10) * 60 * 1000,
		/** Máximo de peticiones por IP en la ventana (rutas generales) */
		max: parseInt(getEnv('RATE_LIMIT_MAX', '60'), 10),
		/** Máximo de peticiones por IP en la ventana (rutas de juego) */
		gameMax: parseInt(getEnv('RATE_LIMIT_GAME_MAX', '20'), 10),
	},

	auth: {
		/**
		 * Clave que el cliente debe enviar en el header X-API-Key.
		 * Si está vacía, la autenticación está DESACTIVADA (útil en local).
		 * En producción, ponla siempre.
		 */
		apiKey: getEnv('API_KEY', ''),
	},

	cors: {
		/**
		 * Lista de orígenes permitidos (URLs del frontend).
		 * Configurable vía ALLOWED_ORIGINS (CSV).
		 * Ejemplo producción: "https://mifrontend.com"
		 * Ejemplo local:      "http://localhost:5173,http://localhost:5174"
		 */
		allowedOrigins: getEnv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174')
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean),
	},

	game: {
		/**
		 * Lista de modelos gratuitos de OpenRouter en orden de prioridad.
		 * Se intentan en secuencia; si uno falla por cuota/rate-limit se prueba el siguiente.
		 * Configurable vía GAME_MODELS (CSV). Ej: "modelA:free,modelB:free"
		 */
		models: getEnv('GAME_MODELS', 'openai/gpt-oss-120b:free,z-ai/glm-4.5-air:free,poolside/laguna-m.1:free,minimax/minimax-m2.5:free')
			.split(',')
			.map((m) => m.trim())
			.filter(Boolean),
		/** Base URL de Pollinations.ai para generación de imágenes */
		imageBaseUrl: 'https://image.pollinations.ai/prompt',
		/** Dimensiones de imagen para el juego */
		imageWidth: parseInt(getEnv('GAME_IMAGE_WIDTH', '512'), 10),
		imageHeight: parseInt(getEnv('GAME_IMAGE_HEIGHT', '512'), 10),
	},
};
