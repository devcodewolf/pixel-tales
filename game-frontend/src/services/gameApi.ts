import type { GameMessage, GameTurnResponse } from '@/types/game'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined

/**
 * Construye los headers base para todas las peticiones.
 * Incluye X-API-Key solo si está configurada en el .env.
 */
function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['X-API-Key'] = API_KEY
  return headers
}

/**
 * Inicia una nueva partida en el backend.
 * POST /api/game/start
 */
export async function startGame(theme: string): Promise<GameTurnResponse> {
  const response = await fetch(`${BASE_URL}/game/start`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ theme }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error?.error ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<GameTurnResponse>
}

/**
 * Envía la acción del jugador y obtiene la siguiente escena.
 * POST /api/game/continue
 */
export async function continueGame(
  action: string,
  history: GameMessage[],
): Promise<GameTurnResponse> {
  const response = await fetch(`${BASE_URL}/game/continue`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ action, history }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error?.error ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<GameTurnResponse>
}
