/**
 * Rutas del módulo de Chat.
 */

import { Router } from 'express';
import {
  sendMessage,
  sendMessageStream,
  getProviders,
  resetProviderById,
} from '../controllers/chat.controller.js';

const router = Router();

// POST /api/chat  →  envía mensajes y recibe respuesta de la IA
router.post('/', sendMessage);

// POST /api/chat/stream  →  respuesta en Server-Sent Events (streaming)
router.post('/stream', sendMessageStream);

// GET /api/chat/providers  →  estado de los proveedores
router.get('/providers', getProviders);

// POST /api/chat/providers/:id/reset  →  rehabilita un proveedor
router.post('/providers/:id/reset', resetProviderById);

export default router;
