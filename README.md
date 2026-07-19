# Pixel Tales

> **Juego de aventura interactiva narrado por IA.**  
> Elige un tema, la IA genera la historia turno a turno e ilustra cada escena con imágenes generadas en tiempo real.

---

## ¿Qué es esto?

Pixel Tales es una aplicación full-stack que combina un frontend en Vue 3 con una API Node.js que actúa como proxy inteligente hacia múltiples proveedores de IA. El jugador elige el género de su aventura (fantasía medieval, ciencia ficción, noir...) y la IA narra la historia, propone decisiones y genera imágenes para cada escena usando [Pollinations.ai](https://pollinations.ai).

---

## Estructura del repositorio

```
pixel-tales/
├── ai-chat-api/       # API REST (Node.js + Express 5)
└── game-frontend/     # SPA (Vue 3 + TypeScript + Pinia + TailwindCSS)
```

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3, TypeScript, Vite, Pinia, TailwindCSS 4 |
| Backend | Node.js ≥ 18, Express 5, ESM |
| IA (texto) | OpenRouter → Groq (fallback automático) |
| IA (imágenes) | Pollinations.ai |
| Gestor de paquetes | pnpm |
| Contenedores | Docker / Docker Compose |

---

## Características principales

- **Fallback automático de proveedores**: si OpenRouter agota su cuota, la API conmuta a Groq sin interrumpir la experiencia.
- **Generación de imágenes por escena**: cada turno produce una imagen pixel-art a partir del texto narrativo.
- **Historial de conversación**: el contexto completo de la partida se pasa en cada turno para mantener coherencia narrativa.
- **Autenticación por API Key**: cabecera `X-API-Key` opcional; se desactiva automáticamente si no se configura (útil en desarrollo local).
- **Rate limiting**: protección integrada contra abuso de endpoints.

---

## Puesta en marcha

### Requisitos previos

- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)
- Clave de API de [OpenRouter](https://openrouter.ai) y/o [Groq](https://console.groq.com)

---

### 1. Backend — `ai-chat-api`

```bash
cd ai-chat-api
pnpm install
```

Crea un fichero `.env` en `ai-chat-api/`:

```env
PORT=3000

# Proveedores de IA (pon al menos uno)
OPENROUTER_API_KEY=sk-or-...
GROQ_API_KEY=gsk_...

# Orden de prioridad (separados por coma)
PROVIDER_ORDER=openrouter,groq

# Minutos de penalización cuando un proveedor agota su cuota
RETRY_AFTER_MINUTES=60

# API Key propia para proteger la API (dejar vacío = sin autenticación)
API_KEY=
```

```bash
# Desarrollo (con watch)
pnpm dev

# Producción
pnpm start
```

La API queda disponible en `http://localhost:3000`.

---

### 2. Frontend — `game-frontend`

```bash
cd game-frontend
pnpm install
```

Crea un fichero `.env` en `game-frontend/`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_API_KEY=          # igual que API_KEY del backend (dejar vacío si no usas autenticación)
```

```bash
# Desarrollo
pnpm dev

# Build de producción
pnpm build
```

---

### Docker Compose (opcional)

```bash
cd ai-chat-api
docker compose up --build
```

---

## API Reference

### `POST /api/game/start`

Inicia una nueva partida.

```json
{ "theme": "Fantasía medieval" }
```

**Respuesta:**
```json
{
  "story": "Texto narrativo de apertura...",
  "imageUrl": "https://image.pollinations.ai/...",
  "question": "¿Qué decides hacer?",
  "history": [...]
}
```

---

### `POST /api/game/continue`

Avanza la historia con la acción del jugador.

```json
{
  "action": "Entro al bosque oscuro",
  "history": [...]
}
```

**Respuesta:** mismo formato que `/start`.

---

### `POST /api/chat`

Endpoint genérico de chat con fallback automático entre proveedores.

```json
{
  "messages": [
    { "role": "system", "content": "Eres un asistente útil." },
    { "role": "user",   "content": "¿Qué es un closure?" }
  ],
  "options": { "maxTokens": 1024, "temperature": 0.7 }
}
```

---

### `GET /api/chat/providers`

Devuelve el estado actual de cada proveedor (disponible / en espera de recuperación).

---

### `POST /api/chat/providers/:id/reset`

Fuerza la reactivación inmediata de un proveedor deshabilitado.

---

## Flujo interno de la API

```
Cliente
  └─► POST /api/game/start  { theme }
        └─► game.controller → game.service
              ├─► Llama a ai.service.chat()  (genera la historia)
              │     ├─► Intenta OpenRouter
              │     │     ├─► OK  →  devuelve texto
              │     │     └─► QuotaError  →  deshabilita 60 min → prueba Groq
              │     └─► Si todos fallan  →  503
              └─► Construye URL de imagen Pollinations.ai
                    └─► Devuelve { story, imageUrl, question, history }
```

---

## Licencia

MIT
