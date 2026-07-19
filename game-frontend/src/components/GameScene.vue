<script setup lang="ts">
/**
 * GameScene — Muestra la imagen pixel art generada para la escena actual.
 * Mantiene el skeleton visible mientras carga y reintenta automáticamente
 * si Pollinations.ai aún está generando la imagen (hasta MAX_RETRIES veces).
 */
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  imageUrl: string
  alt?: string
}>()

const imageLoaded = defineModel<boolean>('imageLoaded', { default: false })

const MAX_RETRIES = 6
const RETRY_DELAY_MS = 5000

const retryCount = ref(0)
const imgSrc = ref(props.imageUrl)

// Cuando cambia la URL (nuevo turno), reinicia el estado
watch(
  () => props.imageUrl,
  (newUrl) => {
    retryCount.value = 0
    imgSrc.value = newUrl
  },
)

function onImageLoad() {
  imageLoaded.value = true
}

function onImageError() {
  if (retryCount.value < MAX_RETRIES) {
    retryCount.value++
    // Fuerza al navegador a reintentar limpiando el src y restaurándolo
    setTimeout(async () => {
      imgSrc.value = ''
      await nextTick()
      imgSrc.value = props.imageUrl
    }, RETRY_DELAY_MS)
  } else {
    // Agotados los reintentos: oculta el skeleton con estado de error
    imageLoaded.value = true
  }
}
</script>

<template>
  <div class="game-scene">
    <!-- Skeleton mientras carga la imagen (incluye reintentos) -->
    <div v-if="!imageLoaded" class="skeleton" aria-hidden="true">
      <div class="skeleton-shimmer" />
      <span class="skeleton-text">
        {{
          retryCount === 0
            ? 'Generando imagen...'
            : `Generando imagen... (${retryCount}/${MAX_RETRIES})`
        }}
      </span>
    </div>

    <img
      :src="imgSrc"
      :alt="alt ?? 'Escena del juego'"
      class="scene-image"
      :class="{ 'scene-image--visible': imageLoaded }"
      @load="onImageLoad"
      @error="onImageError"
    />
  </div>
</template>

<style scoped>
.game-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 512px;
  margin: 0 auto;
  border: 3px solid #3d2060;
  box-shadow:
    0 0 20px rgba(150, 80, 220, 0.25),
    inset 0 0 10px rgba(0, 0, 0, 0.6);
  background: #0d0818;
  image-rendering: pixelated;
}

.skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #0d0818;
  z-index: 1;
}

.skeleton-shimmer {
  width: 80%;
  height: 60%;
  background: linear-gradient(90deg, #0d0818 25%, #1e0d30 50%, #0d0818 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  color: #5a3a7a;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  letter-spacing: 0.1em;
  animation: blink 1s step-end infinite;
}

.scene-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.scene-image--visible {
  opacity: 1;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
