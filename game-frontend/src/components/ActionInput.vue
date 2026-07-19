<script setup lang="ts">
/**
 * ActionInput — Input para que el jugador escriba su acción.
 * Se deshabilita durante la carga.
 */
import { ref } from 'vue'

const props = defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  submit: [action: string]
}>()

const inputValue = ref('')

function handleSubmit() {
  const action = inputValue.value.trim()
  if (!action || props.disabled) return
  emit('submit', action)
  inputValue.value = ''
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="action-input">
    <label for="action-field" class="action-label">
      <span class="action-prompt">¿QUÉ HACES?</span>
    </label>
    <div class="input-row">
      <input
        id="action-field"
        v-model="inputValue"
        type="text"
        class="action-field"
        :disabled="disabled"
        placeholder="Escribe tu acción..."
        maxlength="300"
        autocomplete="off"
        @keydown="handleKeydown"
      />
      <button
        type="button"
        class="submit-btn"
        :disabled="disabled || !inputValue.trim()"
        @click="handleSubmit"
      >
        <span v-if="disabled" class="btn-icon">⌛</span>
        <span v-else class="btn-icon">▶</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-input {
  padding: 1rem 1.25rem;
  background: rgba(6, 2, 10, 0.96);
  border: 2px solid #3d2060;
  border-top: none;
}

.action-label {
  display: block;
  margin-bottom: 0.6rem;
}

.action-prompt {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.55rem;
  color: #7a5a9a;
  letter-spacing: 0.15em;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.action-field {
  flex: 1;
  background: #0d0812;
  border: 2px solid #3d2060;
  color: #d4c5d9;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.65rem;
  padding: 0.6rem 0.75rem;
  outline: none;
  caret-color: #9060b0;
  transition: border-color 0.2s;
}

.action-field::placeholder {
  color: #603e81;
}

.action-field:focus {
  border-color: #9050c0;
}

.action-field:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.submit-btn {
  background: #1e0a30;
  border: 2px solid #7040a0;
  color: #c890f0;
  width: 44px;
  height: 44px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    transform 0.1s;
  flex-shrink: 0;
}

.submit-btn:hover:not(:disabled) {
  background: #6b3e18;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.submit-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-icon {
  display: block;
  line-height: 1;
}
</style>
