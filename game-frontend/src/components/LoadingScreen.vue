<script setup lang="ts">
/**
 * LoadingScreen — Pantalla de carga animada mientras la IA genera la historia.
 */
</script>

<template>
  <div class="loading-screen">
    <div class="loading-inner">
      <div class="crystal-ball" aria-hidden="true">
        <div class="crystal-glow" />
        <span class="crystal-icon">🔮</span>
      </div>
      <p class="loading-title">EL MAESTRO PIENSA...</p>
      <div class="dot-row" aria-hidden="true">
        <span class="dot" style="animation-delay: 0s" />
        <span class="dot" style="animation-delay: 0.3s" />
        <span class="dot" style="animation-delay: 0.6s" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-screen {
  position: absolute;
  inset: 0;
  background: rgba(5, 3, 1, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(2px);
}

.loading-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.crystal-ball {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crystal-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(160, 80, 220, 0.25), transparent 70%);
  animation: pulse 1.5s ease-in-out infinite;
}

.crystal-icon {
  font-size: 3rem;
  filter: drop-shadow(0 0 8px rgba(160, 80, 220, 0.7));
  animation: float 2s ease-in-out infinite;
}

.loading-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  color: #7a5a9a;
  letter-spacing: 0.2em;
}

.dot-row {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #9060b0;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation: dotBlink 0.9s step-end infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes dotBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.1;
  }
}
</style>
