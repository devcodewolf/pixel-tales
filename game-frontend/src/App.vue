<script setup lang="ts">
/**
 * App — Componente raíz de Pixel Tales.
 * Orquesta el flujo de pantallas: inicio → selección de tema → juego.
 */
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import GameScene from '@/components/GameScene.vue'
import StoryPanel from '@/components/StoryPanel.vue'
import ActionInput from '@/components/ActionInput.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'

const THEME_EXAMPLES = [
  'Fantasía medieval',
  'El Salvaje Oeste',
  'Antigua Roma',
  'Piratas del Caribe',
  'Ciencia ficción espacial',
  'Detectives noir años 40',
  'Apocalipsis zombie',
  'Japón feudal samurái',
]

const store = useGameStore()
const imageLoaded = ref(false)
const themeInput = ref('')

function selectExample(example: string) {
  themeInput.value = example
}

async function handleStart() {
  if (!themeInput.value.trim()) return
  imageLoaded.value = false
  await store.newGame(themeInput.value.trim())
}

function handleNewGame() {
  imageLoaded.value = false
  themeInput.value = ''
  store.resetToIdle()
}

async function handleAction(action: string) {
  imageLoaded.value = false
  await store.sendAction(action)
}

async function handleRestart() {
  if (!themeInput.value.trim()) return
  imageLoaded.value = false
  await store.newGame(themeInput.value.trim())
}
</script>

<template>
  <div class="game-root">
    <!-- ── Fondo ─────────────────────────────────────────────────────────── -->
    <div class="bg-overlay" aria-hidden="true" />

    <!-- ── Pantalla de inicio / selector de tema ─────────────────────────── -->
    <Transition name="fade">
      <div v-if="store.status === 'idle'" class="start-screen">
        <div class="title-block">
          <p class="title-pre">▓ IA INTERACTIVE STORIES ▓</p>
          <h1 class="game-title">PIXEL<br />TALES</h1>
          <p class="title-sub">Elige tu aventura · La IA narra tu historia</p>
        </div>

        <!-- Input de tema -->
        <div class="theme-form">
          <label for="theme-input" class="theme-label">¿QUÉ HISTORIA QUIERES VIVIR?</label>
          <div class="theme-input-row">
            <input
              id="theme-input"
              v-model="themeInput"
              type="text"
              class="theme-input"
              placeholder="Describe tu aventura..."
              maxlength="120"
              autocomplete="off"
              @keydown.enter="handleStart"
            />
            <button class="start-btn" :disabled="!themeInput.trim()" @click="handleStart">
              ▶ JUGAR
            </button>
          </div>

          <!-- Ejemplos clicables -->
          <div class="examples-label">EJEMPLOS:</div>
          <div class="examples-grid">
            <button
              v-for="ex in THEME_EXAMPLES"
              :key="ex"
              class="example-chip"
              :class="{ 'example-chip--active': themeInput === ex }"
              @click="selectExample(ex)"
            >
              {{ ex }}
            </button>
          </div>
        </div>

        <p class="disclaimer">Historia generada por IA · Imágenes por Pollinations.ai</p>
      </div>
    </Transition>

    <!-- ── Pantalla de error ─────────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="store.hasError" class="error-screen">
        <div class="error-box">
          <p class="error-icon">⚠</p>
          <p class="error-title">ERROR DEL SISTEMA</p>
          <p class="error-message">{{ store.errorMessage }}</p>
          <div class="error-actions">
            <button class="start-btn" @click="handleRestart">↺ REINTENTAR</button>
            <button class="dismiss-btn" @click="handleNewGame">CAMBIAR TEMA</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Pantalla de carga inicial (sin escena aún) ─────────────────────── -->
    <Transition name="fade">
      <div v-if="store.isLoading && !store.currentScene" class="loading-cover">
        <LoadingScreen />
        <p class="loading-theme">Generando: "{{ store.theme }}"</p>
      </div>
    </Transition>

    <!-- ── Pantalla de juego ─────────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="store.isPlaying || (store.isLoading && store.currentScene)" class="game-screen">
        <!-- Header -->
        <header class="game-header">
          <div class="header-left">
            <span class="header-logo">▓ PIXEL TALES</span>
            <span class="header-theme">{{ store.theme }}</span>
          </div>
          <button class="new-game-btn" :disabled="store.isLoading" @click="handleNewGame">
            ↺ Nueva historia
          </button>
        </header>

        <!-- Área principal -->
        <main class="game-main">
          <!-- Columna imagen -->
          <section class="scene-column" aria-label="Escena visual">
            <div class="scene-wrapper">
              <GameScene
                v-if="store.currentScene"
                v-model:imageLoaded="imageLoaded"
                :image-url="store.currentScene.imageUrl"
                :alt="store.currentScene.story.slice(0, 80)"
              />
              <LoadingScreen v-if="store.isLoading" />
            </div>
          </section>

          <!-- Columna narrativa -->
          <section class="narrative-column" aria-label="Narración">
            <div class="narrative-wrapper">
              <template v-if="store.currentScene">
                <StoryPanel
                  :story="store.currentScene.story"
                  :question="store.currentScene.question"
                  :turn-count="store.turnCount"
                />
                <ActionInput :disabled="store.isLoading" @submit="handleAction" />
              </template>
            </div>
          </section>
        </main>
      </div>
    </Transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  background: #060408;
  color: #d4c5d9;
}
</style>

<style scoped>
/* ── Raíz ─────────────────────────────────────────────────────────────────── */
.game-root {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* ── Fondo ────────────────────────────────────────────────────────────────── */
.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 15% 40%, rgba(60, 10, 90, 0.45) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 60%, rgba(10, 40, 80, 0.4) 0%, transparent 55%), #060408;
  z-index: 0;
}

/* ── Pantalla de inicio ────────────────────────────────────────────────────── */
.start-screen {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  text-align: center;
  padding: 2rem 1.5rem;
  overflow-y: auto;
}

.title-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.title-pre {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  color: #7a5a9a;
  letter-spacing: 0.2em;
}

.game-title {
  font-family: 'Press Start 2P', monospace;
  font-size: clamp(1.6rem, 5vw, 2.8rem);
  line-height: 1.5;
  color: #c890f0;
  text-shadow:
    0 0 25px rgba(180, 100, 240, 0.6),
    3px 3px 0 #2a0a40;
  letter-spacing: 0.08em;
}

.title-sub {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  color: #5a4570;
  letter-spacing: 0.12em;
}

/* ── Formulario de tema ────────────────────────────────────────────────────── */
.start-screen > * {
  width: 100%;
  max-width: 640px;
}

.theme-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.theme-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  color: #7a5a9a;
  letter-spacing: 0.15em;
  align-self: flex-start;
}

.theme-input-row {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.theme-input {
  flex: 1;
  background: #0d0812;
  border: 2px solid #3d2060;
  color: #d4c5d9;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  padding: 0.7rem 0.9rem;
  outline: none;
  caret-color: #c890f0;
  transition: border-color 0.2s;
  min-width: 0;
}

.theme-input::placeholder {
  color: #5c3d70;
}

.theme-input:focus {
  border-color: #9050c0;
}

.examples-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.45rem;
  color: #9060b0;
  letter-spacing: 0.15em;
  margin-top: 0.25rem;
}

.examples-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  width: 100%;
}

.example-chip {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.45rem;
  color: #8a6aaa;
  background: #12091a;
  border: 1px solid #3a2050;
  padding: 0.4rem 0.65rem;
  cursor: pointer;
  letter-spacing: 0.05em;
  line-height: 1.4;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.example-chip:hover {
  background: #1e1030;
  border-color: #7040a0;
  color: #c890f0;
}

.example-chip--active {
  background: #2a1040;
  border-color: #9050c0;
  color: #c890f0;
}

/* ── Botón principal ──────────────────────────────────────────────────────── */
.start-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.65rem;
  color: #c890f0;
  background: #1a0a2a;
  border: 2px solid #9050c0;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  letter-spacing: 0.08em;
  box-shadow: 0 0 12px rgba(160, 80, 220, 0.25);
  transition:
    background 0.2s,
    box-shadow 0.2s,
    transform 0.1s;
  white-space: nowrap;
  flex-shrink: 0;
}

.start-btn:hover:not(:disabled) {
  background: #280f3d;
  box-shadow: 0 0 22px rgba(160, 80, 220, 0.5);
}

.start-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.start-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.disclaimer {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.42rem;
  color: #7f529c;
  letter-spacing: 0.08em;
}

/* ── Carga inicial ───────────────────────────────────────────────────────── */
.loading-cover {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.loading-theme {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  color: #7a5a9a;
  letter-spacing: 0.1em;
  max-width: 400px;
  text-align: center;
  line-height: 1.8;
}

/* ── Pantalla de error ──────────────────────────────────────────────────────── */
.error-screen {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.error-box {
  background: rgba(6, 2, 10, 0.96);
  border: 2px solid #602020;
  padding: 2rem;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  color: #c04040;
}

.error-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.65rem;
  color: #c04040;
  letter-spacing: 0.15em;
}

.error-message {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.52rem;
  color: #7a5a9a;
  line-height: 1.9;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.dismiss-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  color: #5a4570;
  background: transparent;
  border: 1px solid #2d1a40;
  padding: 0.7rem 1.25rem;
  cursor: pointer;
  letter-spacing: 0.08em;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.dismiss-btn:hover {
  border-color: #7a5a9a;
  color: #9a7aba;
}

/* ── Pantalla de juego ──────────────────────────────────────────────────────── */
.game-screen {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1.25rem;
  background: rgba(4, 2, 8, 0.96);
  border-bottom: 2px solid #1a0d28;
  flex-shrink: 0;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.header-logo {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  color: #7a5a9a;
  letter-spacing: 0.12em;
  flex-shrink: 0;
}

.header-theme {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.45rem;
  color: #9060b0;
  letter-spacing: 0.08em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-game-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  color: #9060b0;
  background: transparent;
  border: 1px solid #9060b0;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  letter-spacing: 0.08em;
  flex-shrink: 0;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.new-game-btn:hover:not(:disabled) {
  color: #9a7aba;
  border-color: #3d2060;
}

.new-game-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.game-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.scene-column {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 2, 8, 0.5);
  border-right: 2px solid #0d0818;
}

.scene-wrapper {
  position: relative;
  width: 100%;
  max-width: 512px;
}

.narrative-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.narrative-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.narrative-wrapper > :deep(.story-panel) {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #1a0d28 transparent;
}

/* ── Transiciones ─────────────────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.55s ease-in-out,
    transform 0.55s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .game-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
  }

  .scene-column {
    padding: 1rem;
    border-right: none;
    border-bottom: 2px solid #0d0818;
  }

  .scene-column .scene-wrapper {
    max-width: 320px;
  }
}
</style>
