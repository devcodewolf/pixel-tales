/**
 * Modelo de Proveedor de IA.
 * Encapsula el estado de disponibilidad de cada proveedor
 * y la lógica para detectar errores de límite de cuota.
 */

/** @typedef {'openrouter' | 'groq'} ProviderId */

/**
 * Códigos HTTP que indican que el proveedor ha agotado su cuota gratuita
 * o que se ha alcanzado un rate-limit.
 * Nota: 503 se excluye intencionalmente — representa indisponibilidad temporal
 * del servicio upstream, no agotamiento de cuota.
 */
const QUOTA_ERROR_CODES = new Set([429, 402, 413]);

/**
 * Mensajes de error que confirman agotamiento de créditos/cuota
 * (comprobación adicional por texto para casos edge de algunos proveedores).
 */
const QUOTA_ERROR_KEYWORDS = [
  'rate limit',
  'quota exceeded',
  'insufficient credits',
  'out of tokens',
  'billing',
  'no_billing',
  'tokens per day',
  'requests per day',
];

export class ProviderModel {
  /**
   * @param {ProviderId} id - Identificador único del proveedor
   * @param {object} config - Configuración del proveedor
   * @param {number} retryAfterMinutes - Minutos antes de reintentar tras un fallo
   */
  constructor(id, config, retryAfterMinutes = 60) {
    /** @type {ProviderId} */
    this.id = id;
    this.config = config;
    this.retryAfterMinutes = retryAfterMinutes;

    /** @type {boolean} */
    this.available = true;

    /** @type {Date | null} */
    this.disabledAt = null;

    /** @type {string | null} */
    this.lastError = null;
  }

  /**
   * Comprueba si el proveedor está disponible para recibir peticiones.
   * Si estaba deshabilitado, verifica si ya ha pasado el tiempo de espera.
   * @returns {boolean}
   */
  isAvailable() {
    if (this.available) return true;

    if (this.disabledAt) {
      const elapsed = (Date.now() - this.disabledAt.getTime()) / 1000 / 60;
      if (elapsed >= this.retryAfterMinutes) {
        this.enable();
        return true;
      }
    }

    return false;
  }

  /**
   * Deshabilita el proveedor y registra el motivo.
   * @param {string} reason - Mensaje de error que causó la deshabilitación
   */
  disable(reason) {
    this.available = false;
    this.disabledAt = new Date();
    this.lastError = reason;
    console.warn(
      `[Provider:${this.id}] Deshabilitado. Motivo: ${reason}. Reintento en ${this.retryAfterMinutes} min.`,
    );
  }

  /**
   * Vuelve a habilitar el proveedor.
   */
  enable() {
    this.available = true;
    this.disabledAt = null;
    this.lastError = null;
    console.info(`[Provider:${this.id}] Rehabilitado.`);
  }

  /**
   * Determina si un error HTTP corresponde a agotamiento de cuota/créditos.
   * @param {number} statusCode - Código de estado HTTP
   * @param {string} [message] - Mensaje de error opcional
   * @returns {boolean}
   */
  static isQuotaError(statusCode, message = '') {
    if (QUOTA_ERROR_CODES.has(statusCode)) return true;

    const lower = message.toLowerCase();
    return QUOTA_ERROR_KEYWORDS.some((kw) => lower.includes(kw));
  }

  /**
   * Representación legible del estado del proveedor.
   * @returns {object}
   */
  toStatus() {
    return {
      id: this.id,
      available: this.isAvailable(),
      disabledAt: this.disabledAt,
      lastError: this.lastError,
      retryAfterMinutes: this.retryAfterMinutes,
    };
  }
}
