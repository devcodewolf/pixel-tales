/** Mensaje del historial de conversación con el modelo */
export interface GameMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Respuesta del backend para cada turno del juego */
export interface GameTurnResponse {
  story: string
  imageUrl: string
  imagePrompt: string
  question: string
  history: GameMessage[]
}

/** Estado de una escena del juego (guardado en el store) */
export interface GameScene {
  story: string
  imageUrl: string
  question: string
}

/** Estado global del juego */
export type GameStatus = 'idle' | 'loading' | 'playing' | 'error'

/** Tema elegido por el jugador para la partida actual */
export type GameTheme = string
