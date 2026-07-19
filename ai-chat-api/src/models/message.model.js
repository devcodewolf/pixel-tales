/**
 * Modelo de Mensaje de Chat.
 * Define la estructura y validación de los mensajes que se envían a la IA.
 */

/** @typedef {'user' | 'assistant' | 'system'} MessageRole */

/**
 * Roles válidos en una conversación de chat.
 */
const VALID_ROLES = new Set(['user', 'assistant', 'system']);

export class MessageModel {
  /**
   * @param {MessageRole} role - Rol del mensaje
   * @param {string} content - Contenido del mensaje
   */
  constructor(role, content) {
    this.role = role;
    this.content = content;
  }

  /**
   * Valida que un array de mensajes sea correcto.
   * @param {Array<{role: string, content: string}>} messages
   * @returns {{ valid: boolean, error?: string }}
   */
  static validate(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return { valid: false, error: 'El campo "messages" debe ser un array no vacío.' };
    }

    for (const [index, msg] of messages.entries()) {
      if (!msg || typeof msg !== 'object') {
        return { valid: false, error: `El mensaje en el índice ${index} no es un objeto válido.` };
      }

      if (!VALID_ROLES.has(msg.role)) {
        return {
          valid: false,
          error: `El rol "${msg.role}" en el índice ${index} no es válido. Usa: ${[...VALID_ROLES].join(', ')}.`,
        };
      }

      if (typeof msg.content !== 'string' || msg.content.trim() === '') {
        return {
          valid: false,
          error: `El mensaje en el índice ${index} debe tener un campo "content" de tipo string no vacío.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Normaliza un array de mensajes crudos a instancias de MessageModel.
   * @param {Array<{role: string, content: string}>} messages
   * @returns {MessageModel[]}
   */
  static fromArray(messages) {
    return messages.map((m) => new MessageModel(m.role, m.content.trim()));
  }
}
