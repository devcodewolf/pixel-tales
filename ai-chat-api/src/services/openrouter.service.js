/**
 * Servicio de OpenRouter.
 * Implementa la llamada a la API de OpenRouter usando fetch nativo (Node 18+).
 * OpenRouter es compatible con el formato de la API de OpenAI.
 */

import { config } from '../config/index.js';
import { ProviderModel } from '../models/provider.model.js';

/**
 * Realiza una petición de chat completions a OpenRouter.
 *
 * @param {import('../models/message.model.js').MessageModel[]} messages
 * @param {object} [options]
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @returns {Promise<{ content: string, usage: object, model: string }>}
 */
export async function openrouterChat(messages, options = {}) {
  const { apiKey, model, baseUrl } = config.openrouter;

  if (!apiKey || apiKey.startsWith('sk-or-v1-xxx')) {
    throw new QuotaError('openrouter', 'API key de OpenRouter no configurada.');
  }

  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai-chat-api',
      'X-Title': 'ai-chat-api',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
    if (ProviderModel.isQuotaError(response.status, message)) {
      throw new QuotaError('openrouter', message);
    }
    throw new ProviderError('openrouter', message, response.status);
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage ?? {},
    model: data.model ?? model,
    provider: 'openrouter',
  };
}

/**
 * Realiza una petición de chat en modo streaming a OpenRouter.
 * Devuelve el ReadableStream del cuerpo de la respuesta para ser enviado al cliente.
 *
 * @param {import('../models/message.model.js').MessageModel[]} messages
 * @param {object} [options]
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @returns {Promise<{ stream: ReadableStream, model: string, provider: string }>}
 */
export async function openrouterChatStream(messages, options = {}) {
  const { apiKey, model, baseUrl } = config.openrouter;

  if (!apiKey || apiKey.startsWith('sk-or-v1-xxx')) {
    throw new QuotaError('openrouter', 'API key de OpenRouter no configurada.');
  }

  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
    stream: true,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai-chat-api',
      'X-Title': 'ai-chat-api',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    const message = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
    if (ProviderModel.isQuotaError(response.status, message)) {
      throw new QuotaError('openrouter', message);
    }
    throw new ProviderError('openrouter', message, response.status);
  }

  return { stream: response.body, model, provider: 'openrouter' };
}

/**
 * Error que indica que el proveedor alcanzó su límite de cuota o créditos.
 */
export class QuotaError extends Error {
  /**
   * @param {string} providerId
   * @param {string} message
   */
  constructor(providerId, message) {
    super(message);
    this.name = 'QuotaError';
    this.providerId = providerId;
  }
}

/**
 * Error genérico de proveedor (no relacionado con cuota).
 */
export class ProviderError extends Error {
  /**
   * @param {string} providerId
   * @param {string} message
   * @param {number} [statusCode]
   */
  constructor(providerId, message, statusCode) {
    super(message);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.statusCode = statusCode;
  }
}
