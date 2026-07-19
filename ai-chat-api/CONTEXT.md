# ai-chat-api — Contexto para IA

## Propósito

API REST intermedia escrita en Node.js que actúa como proxy de chat hacia múltiples proveedores de IA. Su objetivo principal es **aprovechar los planes gratuitos** de cada proveedor: cuando uno agota su cuota, la aplicación hace **fallback automático** al siguiente sin interrumpir al cliente.

---

## Stack

| Elemento | Valor |
|---|---|
| Runtime | Node.js ≥ 18 (fetch nativo, sin dependencias HTTP extra) |
| Módulos | ESM (`"type": "module"`) |
| Framework | Express 5 |
| Config | dotenv |
| Gestor de paquetes | pnpm |
| Proveedores actuales | OpenRouter, Groq |

---

## Arquitectura

```
ai-chat-api/
├── server.js                      # Punto de entrada: carga .env y arranca Express
├── src/
│   ├── app.js                     # Instancia Express + middlewares globales + rutas
│   ├── config/
│   │   └── index.js               # Lee process.env y exporta objeto config tipado
│   ├── models/
│   │   ├── provider.model.js      # Estado de disponibilidad del proveedor + detección de quota errors
│   │   └── message.model.js       # Validación y normalización de mensajes de chat
│   ├── services/
│   │   ├── openrouter.service.js  # fetch → OpenRouter API (formato OpenAI-compatible)
│   │   ├── groq.service.js        # fetch → Groq API (formato OpenAI-compatible)
│   │   └── ai.service.js          # Orquestador: pool de proveedores + lógica de fallback
│   ├── controllers/
│   │   └── chat.controller.js     # Handlers HTTP: sendMessage, getProviders, resetProviderById
│   ├── routes/
│   │   ├── chat.routes.js         # Rutas bajo /api/chat
│   │   └── index.js               # Router raíz /api + health check
│   └── middleware/
│       ├── error.middleware.js    # Manejo centralizado de errores (último middleware)
│       └── validate.middleware.js # Rechaza peticiones POST sin Content-Type: application/json
└── tests/
    └── api.http                   # Colección REST Client para probar todos los endpoints
```

---

## Flujo de una petición de chat

```
Cliente
  └─► POST /api/chat  { messages: [...] }
        └─► validate.middleware  (Content-Type check)
              └─► chat.controller.sendMessage
                    └─► MessageModel.validate()  (validación de roles y contenido)
                          └─► ai.service.chat()
                                ├─► Intenta con provider[0] (openrouter por defecto)
                                │     ├─► OK  →  devuelve resultado
                                │     └─► QuotaError  →  deshabilita proveedor 60 min
                                │                         y continúa al siguiente
                                ├─► Intenta con provider[1] (groq)
                                │     ├─► OK  →  devuelve resultado
                                │     └─► QuotaError  →  deshabilita proveedor
                                └─► Si todos fallan  →  503 PROVIDERS_UNAVAILABLE
```

---

## API Reference

### `POST /api/chat`

Envía mensajes al modelo activo. Hace fallback automático si el proveedor principal falla.

**Request body:**
```json
{
  "messages": [
    { "role": "system",    "content": "Eres un asistente útil." },
    { "role": "user",      "content": "¿Qué es un closure?" }
  ],
  "options": {
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

Roles válidos: `user`, `assistant`, `system`.  
`options` es opcional; valores por defecto: `maxTokens=1024`, `temperature=0.7`.

**Response 200:**
```json
{
  "success": true,
  "provider": "openrouter",
  "model": "meta-llama/llama-3.1-8b-instruct:free",
  "message": { "role": "assistant", "content": "..." },
  "usage": { "prompt_tokens": 20, "completion_tokens": 80, "total_tokens": 100 }
}
```

**Errores posibles:**
| Status | Código | Causa |
|---|---|---|
| 400 | — | Mensajes inválidos (rol incorrecto, content vacío, array vacío) |
| 415 | — | Content-Type no es application/json |
| 503 | `PROVIDERS_UNAVAILABLE` | Todos los proveedores agotaron su cuota |
| 502 | — | Error no relacionado con cuota en el proveedor |

---

### `GET /api/chat/providers`

Devuelve el estado actual del pool de proveedores.

**Response 200:**
```json
{
  "providers": [
    {
      "id": "openrouter",
      "available": true,
      "disabledAt": null,
      "lastError": null,
      "retryAfterMinutes": 60
    },
    {
      "id": "groq",
      "available": false,
      "disabledAt": "2026-05-18T13:00:00.000Z",
      "lastError": "rate limit exceeded",
      "retryAfterMinutes": 60
    }
  ]
}
```

---

### `POST /api/chat/providers/:id/reset`

Rehabilita manualmente un proveedor deshabilitado. Útil para testing o cuando se sabe que el límite ya se renovó.

**Parámetro de ruta:** `id` — identificador del proveedor (`openrouter` | `groq`)

**Response 200:**
```json
{ "success": true, "message": "Proveedor \"groq\" rehabilitado." }
```

---

### `GET /api/health`

Health check básico.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-05-18T13:00:00.000Z" }
```

---

## Variables de entorno

| Variable | Requerida | Descripción | Ejemplo |
|---|---|---|---|
| `PORT` | No (def. 3000) | Puerto del servidor | `3000` |
| `OPENROUTER_API_KEY` | Sí | API key de OpenRouter | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | No | Modelo a usar en OpenRouter | `meta-llama/llama-3.1-8b-instruct:free` |
| `GROQ_API_KEY` | Sí | API key de Groq | `gsk_...` |
| `GROQ_MODEL` | No | Modelo a usar en Groq | `llama-3.1-8b-instant` |
| `PROVIDER_RETRY_MINUTES` | No (def. 60) | Minutos de espera antes de reintentar un proveedor fallido | `60` |
| `PROVIDER_ORDER` | No | Orden de preferencia de proveedores | `openrouter,groq` |

---

## Lógica de detección de agotamiento de cuota

`ProviderModel.isQuotaError(statusCode, message)` deshabilita un proveedor cuando:
- El status HTTP es **429** (rate limit), **402** (payment required), **413** o **503**
- O el mensaje de error contiene palabras clave: `rate limit`, `quota exceeded`, `insufficient credits`, `billing`, `tokens per day`, `requests per day`, etc.

Cuando la API key no está configurada (valor de ejemplo), se lanza directamente un `QuotaError` para activar el fallback.

---

## Convenciones de código

- **ESM puro**: todos los imports usan rutas con extensión `.js`
- **Sin clases en servicios**: funciones exportadas directamente
- **Errores tipados**: `QuotaError` (activa fallback) y `ProviderError` (error de proveedor no relacionado con cuota), definidos en `openrouter.service.js` y reutilizados en `groq.service.js`
- **Pool singleton**: `providerPool` en `ai.service.js` se construye una sola vez al arrancar
- **Sin ORMs ni bases de datos**: el estado de proveedores es en memoria (se resetea al reiniciar)

---

## Comandos

```bash
pnpm install    # instalar dependencias
pnpm dev        # arrancar con --watch (recarga automática)
pnpm start      # arrancar en producción
```
