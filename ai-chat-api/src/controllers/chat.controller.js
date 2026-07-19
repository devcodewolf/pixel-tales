/**
 * Controlador de Chat.
 * Gestiona las peticiones HTTP relacionadas con el chat de IA.
 */

import { MessageModel } from '../models/message.model.js';
import { chat, chatStream, getProvidersStatus, resetProvider } from '../services/ai.service.js';

/**
 * POST /api/chat
 * Envía un array de mensajes y devuelve la respuesta del modelo de IA.
 *
 * Body esperado:
 * {
 *   "messages": [
 *     { "role": "system", "content": "Eres un asistente útil." },
 *     { "role": "user", "content": "Hola, ¿cómo estás?" }
 *   ],
 *   "options": { "maxTokens": 512, "temperature": 0.7 }  // opcional
 * }
 */
export async function sendMessage(req, res, next) {
  try {
    const { messages, options = {} } = req.body;

    const validation = MessageModel.validate(messages);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const normalizedMessages = MessageModel.fromArray(messages);
    const result = await chat(normalizedMessages, options);

    return res.status(200).json({
      success: true,
      provider: result.provider,
      model: result.model,
      message: {
        role: 'assistant',
        content: result.content,
      },
      usage: result.usage,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chat/providers
 * Devuelve el estado actual de todos los proveedores configurados.
 */
export function getProviders(req, res) {
  const statuses = getProvidersStatus();
  return res.status(200).json({ providers: statuses });
}

/**
 * POST /api/chat/providers/:id/reset
 * Fuerza la rehabilitación de un proveedor concreto (útil para testing/admin).
 */
export function resetProviderById(req, res) {
  const { id } = req.params;
  const reset = resetProvider(id);

  if (!reset) {
    return res.status(404).json({ error: `Proveedor "${id}" no encontrado.` });
  }

  return res.status(200).json({ success: true, message: `Proveedor "${id}" rehabilitado.` });
}

/**
 * POST /api/chat/stream
 * Envía mensajes y devuelve la respuesta del modelo en formato Server-Sent Events (SSE).
 * Compatible con el formato de streaming de OpenAI.
 */
export async function sendMessageStream(req, res, next) {
  try {
    const { messages, options = {} } = req.body;

    const validation = MessageModel.validate(messages);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const normalizedMessages = MessageModel.fromArray(messages);
    const { stream, model, provider } = await chatStream(normalizedMessages, options);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Primer evento con metadatos del proveedor usado
    res.write(`data: ${JSON.stringify({ type: 'meta', provider, model })}\n\n`);

    // Proxy del stream del proveedor directamente al cliente
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
}
