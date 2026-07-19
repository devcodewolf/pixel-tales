/**
 * Servicio orquestador de IA.
 * Gestiona el pool de proveedores, aplica la lógica de fallback automático
 * y expone una interfaz única para el resto de la aplicación.
 */

import { config } from '../config/index.js';
import { ProviderModel } from '../models/provider.model.js';
import { openrouterChat, openrouterChatStream, QuotaError } from './openrouter.service.js';
import { groqChat, groqChatStream } from './groq.service.js';

/** Mapa de ID de proveedor a su función de chat */
const PROVIDER_FUNCTIONS = {
  openrouter: openrouterChat,
  groq: groqChat,
};

/** Mapa de ID de proveedor a su función de chat en streaming */
const PROVIDER_STREAM_FUNCTIONS = {
  openrouter: openrouterChatStream,
  groq: groqChatStream,
};

/**
 * Construye el pool de proveedores en el orden definido por la configuración.
 * Se ejecuta una sola vez al arrancar la aplicación (singleton).
 */
function buildProviderPool() {
  const { order, retryAfterMinutes } = config.providers;

  return order
    .filter((id) => id in PROVIDER_FUNCTIONS)
    .map((id) => {
      const providerConfig = config[id];
      return new ProviderModel(id, providerConfig, retryAfterMinutes);
    });
}

/** @type {ProviderModel[]} Pool singleton de proveedores */
const providerPool = buildProviderPool();

/**
 * Envía una petición de chat al primer proveedor disponible.
 * Si el proveedor activo devuelve un error de cuota, lo deshabilita
 * temporalmente y reintenta con el siguiente de la lista.
 *
 * @param {import('../models/message.model.js').MessageModel[]} messages
 * @param {object} [options]
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @returns {Promise<{ content: string, usage: object, model: string, provider: string }>}
 */
export async function chat(messages, options = {}) {
  const available = providerPool.filter((p) => p.isAvailable());

  if (available.length === 0) {
    throw new Error(
      'Todos los proveedores de IA están temporalmente no disponibles. Inténtalo más tarde.',
    );
  }

  for (const provider of available) {
    const fn = PROVIDER_FUNCTIONS[provider.id];
    try {
      const result = await fn(messages, options);
      return result;
    } catch (err) {
      if (err instanceof QuotaError) {
        console.warn(`[ai-service] Proveedor "${provider.id}" deshabilitado: ${err.message}`);
        provider.disable(err.message);
        // Continúa con el siguiente proveedor
        continue;
      }
      // Error no relacionado con cuota: lo relanzamos directamente
      console.error(`[ai-service] Error en proveedor "${provider.id}": ${err.message}`);
      throw err;
    }
  }

  throw new Error(
    'Se agotó la cuota de todos los proveedores disponibles. Inténtalo más tarde.',
  );
}

/**
 * Devuelve el estado actual de todos los proveedores.
 * @returns {object[]}
 */
export function getProvidersStatus() {
  return providerPool.map((p) => p.toStatus());
}

/**
 * Fuerza la rehabilitación de un proveedor concreto (útil para testing).
 * @param {string} providerId
 * @returns {boolean} true si se encontró y rehabilitó
 */
export function resetProvider(providerId) {
  const provider = providerPool.find((p) => p.id === providerId);
  if (!provider) return false;
  provider.enable();
  return true;
}

/**
 * Envía una petición de chat en modo streaming al primer proveedor disponible.
 * Devuelve el stream crudo del proveedor para ser enviado directamente al cliente.
 *
 * @param {import('../models/message.model.js').MessageModel[]} messages
 * @param {object} [options]
 * @returns {Promise<{ stream: ReadableStream, model: string, provider: string }>}
 */
export async function chatStream(messages, options = {}) {
  const available = providerPool.filter((p) => p.isAvailable());

  if (available.length === 0) {
    throw new Error(
      'Todos los proveedores de IA están temporalmente no disponibles. Inténtalo más tarde.',
    );
  }

  for (const provider of available) {
    const fn = PROVIDER_STREAM_FUNCTIONS[provider.id];
    try {
      const result = await fn(messages, options);
      return result;
    } catch (err) {
      if (err instanceof QuotaError) {
        console.warn(`[ai-service] Proveedor "${provider.id}" deshabilitado (stream): ${err.message}`);
        provider.disable(err.message);
        continue;
      }
      console.error(`[ai-service] Error en proveedor "${provider.id}" (stream): ${err.message}`);
      throw err;
    }
  }

  throw new Error(
    'Se agotó la cuota de todos los proveedores disponibles. Inténtalo más tarde.',
  );
}
