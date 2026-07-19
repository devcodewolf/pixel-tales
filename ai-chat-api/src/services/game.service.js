/**
 * Servicio del juego de aventura gráfica.
 * Usa OpenRouter para generar la narrativa del master de rol y
 * Pollinations.ai para generar imágenes estilo pixel art.
 *
 * Pollinations pasó a requerir autenticación (Bearer token). Como un <img> no
 * puede enviar cabeceras, el backend actúa de proxy: buildImageUrl() devuelve una
 * URL firmada a /api/game/image, y fetchSceneImage() la resuelve contra Pollinations
 * añadiendo el token. Así el token nunca llega al navegador.
 */

import crypto from 'node:crypto';
import { config } from '../config/index.js';

/** @typedef {{ role: 'system'|'user'|'assistant', content: string }} Message */

/**
 * Aplica el estilo pixel art y trunca el prompt para no generar URLs enormes.
 * @param {string} imagePrompt
 * @returns {string}
 */
function stylizePrompt(imagePrompt) {
	const trimmed = imagePrompt.slice(0, 180);
	return `${trimmed}, pixel art, 16-bit retro game, dramatic lighting, detailed`;
}

/**
 * Cabeceras de autenticación para Pollinations (vacías si no hay token).
 * @returns {Record<string, string>}
 */
function pollinationsHeaders() {
	const { imageToken } = config.game;
	return imageToken ? { Authorization: `Bearer ${imageToken}` } : {};
}

/**
 * Firma (HMAC-SHA256) el par prompt+seed para que solo las URLs generadas por
 * este backend sean aceptadas por el proxy de imágenes.
 * @param {string} styledPrompt
 * @param {number|string} seed
 * @returns {string} firma hex (32 chars)
 */
function signImage(styledPrompt, seed) {
	return crypto
		.createHmac('sha256', config.game.imageProxySecret)
		.update(`${styledPrompt}|${seed}`)
		.digest('hex')
		.slice(0, 32);
}

/**
 * Construye la URL directa a Pollinations (uso interno del backend).
 * @param {string} styledPrompt
 * @param {number|string} seed
 * @returns {string}
 */
function buildPollinationsUrl(styledPrompt, seed) {
	const { imageBaseUrl, imageWidth, imageHeight, imageModel } = config.game;
	const encoded = encodeURIComponent(styledPrompt);
	return `${imageBaseUrl}/${encoded}?width=${imageWidth}&height=${imageHeight}&model=${imageModel}&nologo=true&seed=${seed}`;
}

/**
 * Genera la URL de imagen que consumirá el frontend. Apunta al proxy de esta
 * misma API (/api/game/image), va firmada, y NO contiene el token de Pollinations.
 *
 * @param {string} imagePrompt - Descripción de la escena en inglés
 * @returns {string} URL lista para usar en <img>
 */
function buildImageUrl(imagePrompt) {
	const { publicBaseUrl } = config.game;
	const styledPrompt = stylizePrompt(imagePrompt);
	const seed = Math.floor(Math.random() * 99999);

	// Fire-and-forget: pre-calienta la generación en Pollinations con el token,
	// para que cuando el <img> llame al proxy la imagen ya esté cacheada upstream.
	fetch(buildPollinationsUrl(styledPrompt, seed), {
		headers: pollinationsHeaders(),
		signal: AbortSignal.timeout(40000),
	}).catch(() => {});

	const params = new URLSearchParams({
		prompt: styledPrompt,
		seed: String(seed),
		sig: signImage(styledPrompt, seed),
	});
	return `${publicBaseUrl}/api/game/image?${params.toString()}`;
}

/**
 * Resuelve una petición del proxy de imágenes: valida la firma y descarga la
 * imagen desde Pollinations usando el token del backend.
 *
 * @param {{ prompt?: string, seed?: string, sig?: string }} query
 * @returns {Promise<Response>} respuesta fetch de Pollinations
 */
export async function fetchSceneImage({ prompt, seed, sig }) {
	if (!prompt || !seed || !sig) {
		const err = new Error('Parámetros de imagen incompletos.');
		err.statusCode = 400;
		throw err;
	}

	const expected = signImage(prompt, seed);
	const provided = Buffer.from(String(sig));
	const valid =
		provided.length === expected.length &&
		crypto.timingSafeEqual(provided, Buffer.from(expected));

	if (!valid) {
		const err = new Error('Firma de imagen inválida.');
		err.statusCode = 403;
		throw err;
	}

	return fetch(buildPollinationsUrl(prompt, seed), {
		headers: pollinationsHeaders(),
		signal: AbortSignal.timeout(60000),
	});
}

/**
 * Determina si un error de OpenRouter es de tipo cuota/rate-limit,
 * en cuyo caso tiene sentido probar el siguiente modelo.
 *
 * @param {number} status - Código HTTP de la respuesta
 * @param {string} message - Mensaje de error
 * @returns {boolean}
 */
function isQuotaError(status, message) {
	if (status === 429 || status === 503 || status === 529) return true;
	const lower = message.toLowerCase();
	return (
		lower.includes('rate limit') ||
		lower.includes('quota') ||
		lower.includes('capacity') ||
		lower.includes('overloaded') ||
		lower.includes('no endpoints') ||
		lower.includes('context length') ||
		lower.includes('model not found')
	);
}

/**
 * Llama a OpenRouter intentando cada modelo de `config.game.models` en orden.
 * Si uno falla por cuota o rate-limit, pasa automáticamente al siguiente.
 *
 * @param {Message[]} messages - Historial de mensajes del juego
 * @returns {Promise<{ story: string, imagePrompt: string, imageUrl: string, question: string }>}
 */
async function callGameMaster(messages) {
	const { apiKey, baseUrl } = config.openrouter;

	if (!apiKey || apiKey.startsWith('sk-or-v1-xxx') || apiKey === '') {
		throw new Error('API key de OpenRouter no configurada.');
	}

	const models = config.game.models;
	if (!models.length) throw new Error('No hay modelos de juego configurados.');

	/** @type {Error[]} */
	const errors = [];

	for (const model of models) {
		const body = {
			model,
			messages,
			max_tokens: 1024,
			temperature: 0.85,
		};

		let response, data;
		try {
			response = await fetch(`${baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
					'HTTP-Referer': 'https://ai-chat-api',
					'X-Title': 'Pixel Tales Game',
				},
				body: JSON.stringify(body),
			});
			data = await response.json();
		} catch (networkErr) {
			// Error de red: no intentamos el siguiente modelo, fallamos directamente
			throw networkErr;
		}

		if (!response.ok) {
			const message = data?.error?.message ?? `HTTP ${response.status}`;
			if (isQuotaError(response.status, message)) {
				console.warn(
					`[game] Modelo ${model} agotado (${response.status}): ${message}. Probando siguiente...`,
				);
				errors.push(new Error(`${model}: ${message}`));
				continue; // siguiente modelo
			}
			throw new Error(`OpenRouter error con ${model}: ${message}`);
		}

		const rawContent = data.choices[0].message.content;

		let parsed;
		try {
			parsed = JSON.parse(rawContent);
		} catch {
			const jsonMatch =
				rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) ??
				rawContent.match(/({[\s\S]*})/m);
			if (!jsonMatch) {
				// JSON inválido: intentamos con el siguiente modelo
				console.warn(
					`[game] Modelo ${model} devolvió JSON inválido. Probando siguiente...`,
				);
				errors.push(new Error(`${model}: JSON inválido`));
				continue;
			}
			try {
				parsed = JSON.parse(jsonMatch[1]);
			} catch {
				console.warn(
					`[game] Modelo ${model} devolvió JSON inválido (fallback). Probando siguiente...`,
				);
				errors.push(new Error(`${model}: JSON inválido`));
				continue;
			}
		}

		console.info(`[game] Usando modelo: ${model}`);
		const imageUrl = buildImageUrl(parsed.imagePrompt);

		return {
			story: parsed.story,
			imagePrompt: parsed.imagePrompt,
			imageUrl,
			question: parsed.question,
		};
	}

	// Todos los modelos fallaron
	throw new Error(
		`Todos los modelos están agotados. Intentos: ${errors.map((e) => e.message).join(' | ')}`,
	);
}

/**
 * Construye el prompt del sistema adaptado al tema elegido por el jugador.
 *
 * @param {string} theme - Tema de la historia descrito por el usuario
 * @returns {string}
 */
function buildSystemPrompt(theme) {
	return `Eres un maestro narrador y director de juego para una aventura gráfica interactiva.
Tu misión es crear una experiencia de historia inmersiva y cinematográfica.

TEMA DE LA HISTORIA: "${theme}"

REGLAS:
- Responde SIEMPRE con JSON válido, sin ningún texto fuera del JSON.
- Escribe la historia y la pregunta en ESPAÑOL.
- El campo imagePrompt debe estar en INGLÉS (se usa para generación de imágenes).
- Adapta el tono, ambientación y vocabulario al TEMA indicado.
- Genera párrafos narrativos cortos pero vívidos (2-4 frases).
- Crea una descripción visual distinta y detallada para cada escena.
- Pregunta al jugador qué quiere hacer a continuación.
- Mantén la historia coherente recordando eventos anteriores.
- Mantén un tono dramático y cinematográfico.
- Cada escena debe avanzar la trama de forma significativa.

FORMATO DE RESPUESTA (devuelve siempre JSON válido):
{
  "story": "Descripción narrativa vívida de la escena actual en ESPAÑOL (2-4 frases).",
  "imagePrompt": "Visual description of the scene in ENGLISH for image generation (scene, characters, atmosphere, lighting, mood). Be specific and descriptive.",
  "question": "Pregunta clara al jugador sobre qué quiere hacer a continuación, en ESPAÑOL."
}`;
}

/**
 * Inicia una nueva partida generando la escena de apertura.
 *
 * @param {string} theme - Tema de la historia elegido por el jugador
 * @returns {Promise<{ story: string, imageUrl: string, question: string, history: Message[] }>}
 */
export async function startGame(theme) {
	if (!theme || typeof theme !== 'string' || theme.trim() === '') {
		throw new Error('El tema de la historia no puede estar vacío.');
	}

	const systemPrompt = buildSystemPrompt(theme.trim());

	const messages = [
		{ role: 'system', content: systemPrompt },
		{
			role: 'user',
			content: `Inicia la aventura con el tema: "${theme.trim()}". Crea una escena de apertura atmosférica donde el jugador está a punto de embarcarse en una misión importante. Establece el tono adecuado para este tipo de historia. Recuerda: historia y pregunta en español, imagePrompt en inglés.`,
		},
	];

	const result = await callGameMaster(messages);

	/** @type {Message[]} */
	const history = [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: messages[1].content },
		{
			role: 'assistant',
			content: JSON.stringify({
				story: result.story,
				imagePrompt: result.imagePrompt,
				question: result.question,
			}),
		},
	];

	return { ...result, history };
}

/**
 * Continúa la historia basándose en la acción del jugador.
 *
 * @param {string} playerAction - Lo que el jugador quiere hacer
 * @param {Message[]} history - Historial previo de mensajes
 * @returns {Promise<{ story: string, imageUrl: string, question: string, history: Message[] }>}
 */
export async function continueGame(playerAction, history) {
	if (
		!playerAction ||
		typeof playerAction !== 'string' ||
		playerAction.trim() === ''
	) {
		throw new Error('La acción del jugador no puede estar vacía.');
	}

	if (!Array.isArray(history) || history.length === 0) {
		throw new Error('El historial de la partida no es válido.');
	}

	const updatedHistory = [
		...history,
		{ role: 'user', content: playerAction.trim() },
	];

	const result = await callGameMaster(updatedHistory);

	const newHistory = [
		...updatedHistory,
		{
			role: 'assistant',
			content: JSON.stringify({
				story: result.story,
				imagePrompt: result.imagePrompt,
				question: result.question,
			}),
		},
	];

	return { ...result, history: newHistory };
}
