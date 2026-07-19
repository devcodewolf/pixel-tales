/**
 * Servicio de Groq.
 * Implementa la llamada a la API de Groq usando fetch nativo (Node 18+).
 * Groq es compatible con el formato de la API de OpenAI.
 */

import { config } from '../config/index.js';
import { ProviderModel } from '../models/provider.model.js';
import { QuotaError, ProviderError } from './openrouter.service.js';

/**
 * Realiza una petición de chat completions a Groq.
 *
 * @param {import('../models/message.model.js').MessageModel[]} messages
 * @param {object} [options]
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @returns {Promise<{ content: string, usage: object, model: string, provider: string }>}
 */
export async function groqChat(messages, options = {}) {
  const { apiKey, model, baseUrl } = config.groq;

  if (!apiKey || apiKey.startsWith('gsk_xxx')) {
    throw new QuotaError('groq', 'API key de Groq no configurada.');
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
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
    if (ProviderModel.isQuotaError(response.status, message)) {
      throw new QuotaError('groq', message);
    }
    throw new ProviderError('groq', message, response.status);
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage ?? {},
    model: data.model ?? model,
    provider: 'groq',
  };
}

/**
 * Realiza una petición de chat en modo streaming a Groq.
 *
 * @param {import('../models/message.model.js').MessageModel[]} messages
 * @param {object} [options]
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @returns {Promise<{ stream: ReadableStream, model: string, provider: string }>}
 */
export async function groqChatStream(messages, options = {}) {
  const { apiKey, model, baseUrl } = config.groq;

  if (!apiKey || apiKey.startsWith('gsk_xxx')) {
    throw new QuotaError('groq', 'API key de Groq no configurada.');
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
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    const message = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
    if (ProviderModel.isQuotaError(response.status, message)) {
      throw new QuotaError('groq', message);
    }
    throw new ProviderError('groq', message, response.status);
  }

  return { stream: response.body, model, provider: 'groq' };
}
