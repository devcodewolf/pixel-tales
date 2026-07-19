import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startGame, continueGame } from '@/services/gameApi'
import type { GameMessage, GameScene, GameStatus, GameTheme } from '@/types/game'

export const useGameStore = defineStore('game', () => {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const status = ref<GameStatus>('idle')
  const currentScene = ref<GameScene | null>(null)
  const history = ref<GameMessage[]>([])
  const errorMessage = ref<string | null>(null)
  const turnCount = ref(0)
  const theme = ref<GameTheme>('')

  // ── Getters ─────────────────────────────────────────────────────────────────
  const isLoading = computed(() => status.value === 'loading')
  const isPlaying = computed(() => status.value === 'playing')
  const hasError = computed(() => status.value === 'error')

  // ── Acciones ─────────────────────────────────────────────────────────────────

  /** Inicia una nueva partida desde el principio */
  async function newGame(selectedTheme: string): Promise<void> {
    status.value = 'loading'
    errorMessage.value = null
    currentScene.value = null
    history.value = []
    turnCount.value = 0
    theme.value = selectedTheme

    try {
      const response = await startGame(selectedTheme)

      currentScene.value = {
        story: response.story,
        imageUrl: response.imageUrl,
        question: response.question,
      }
      history.value = response.history
      turnCount.value = 1
      status.value = 'playing'
    } catch (error) {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : 'Error al iniciar el juego.'
    }
  }

  /** Envía la acción del jugador y avanza la historia */
  async function sendAction(action: string): Promise<void> {
    if (!action.trim() || status.value !== 'playing') return

    status.value = 'loading'
    errorMessage.value = null

    try {
      const response = await continueGame(action, history.value)

      currentScene.value = {
        story: response.story,
        imageUrl: response.imageUrl,
        question: response.question,
      }
      history.value = response.history
      turnCount.value += 1
      status.value = 'playing'
    } catch (error) {
      status.value = 'error'
      errorMessage.value =
        error instanceof Error ? error.message : 'Error al continuar la historia.'
    }
  }

  /** Limpia el error y vuelve al estado de juego activo */
  function dismissError(): void {
    errorMessage.value = null
    status.value = currentScene.value ? 'playing' : 'idle'
  }

  /** Resetea todo el estado y vuelve a la pantalla de inicio */
  function resetToIdle(): void {
    status.value = 'idle'
    currentScene.value = null
    history.value = []
    errorMessage.value = null
    turnCount.value = 0
    theme.value = ''
  }

  return {
    // Estado
    status,
    currentScene,
    history,
    errorMessage,
    turnCount,
    theme,
    // Getters
    isLoading,
    isPlaying,
    hasError,
    // Acciones
    newGame,
    sendAction,
    dismissError,
    resetToIdle,
  }
})
