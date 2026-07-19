<script setup lang="ts">
/**
 * StoryPanel — Muestra el texto narrativo del master y la pregunta al jugador.
 * Incluye animación de escritura (typewriter) al aparecer nuevo contenido.
 */
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  story: string
  question: string
  turnCount: number
}>()

const displayedStory = ref('')
const displayedQuestion = ref('')
const isTyping = ref(false)

async function typewrite(text: string, target: { value: string }, speed = 18): Promise<void> {
  target.value = ''
  for (const char of text) {
    target.value += char
    await new Promise((r) => setTimeout(r, speed))
  }
}

async function animateText() {
  isTyping.value = true
  displayedStory.value = ''
  displayedQuestion.value = ''
  await typewrite(props.story, displayedStory, 16)
  await new Promise((r) => setTimeout(r, 300))
  await typewrite(props.question, displayedQuestion, 20)
  isTyping.value = false
}

onMounted(animateText)
watch(() => props.turnCount, animateText)
</script>

<template>
  <div class="story-panel">
    <div class="story-header">
      <span class="turn-label">TURNO {{ turnCount }}</span>
    </div>

    <div class="story-body">
      <p class="story-text">
        {{ displayedStory }}<span v-if="isTyping && !displayedQuestion" class="cursor">▊</span>
      </p>
    </div>

    <div v-if="displayedQuestion" class="question-body">
      <p class="question-text">
        <span class="question-icon">❯</span>
        {{ displayedQuestion }}<span v-if="isTyping" class="cursor">▊</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.story-panel {
  background: rgba(6, 2, 10, 0.92);
  border: 2px solid #3d2060;
  border-top: 3px solid #7a5a9a;
  padding: 1.25rem;
  min-height: 160px;
}

.story-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #1a0d28;
}

.turn-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.55rem;
  color: #9060b0;
  letter-spacing: 0.15em;
}

.story-body {
  margin-bottom: 1rem;
}

.story-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.65rem;
  line-height: 1.9;
  color: #d4c5d9;
  white-space: pre-wrap;
}

.question-body {
  border-top: 1px solid #1a0d28;
  padding-top: 0.75rem;
}

.question-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.65rem;
  line-height: 1.8;
  color: #c890f0;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.question-icon {
  color: #9060b0;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.cursor {
  display: inline-block;
  animation: blink 0.7s step-end infinite;
  color: #9060b0;
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
