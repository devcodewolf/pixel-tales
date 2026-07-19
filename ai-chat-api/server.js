/**
 * Punto de entrada del servidor.
 * Carga las variables de entorno y arranca Express.
 */

import 'dotenv/config';
import app from './src/app.js';
import { config } from './src/config/index.js';

const { port } = config;

app.listen(port, () => {
  console.log(`\n🚀 ai-chat-api corriendo en http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/api/health`);
  console.log(`   Estado proveedores: http://localhost:${port}/api/chat/providers\n`);
});
