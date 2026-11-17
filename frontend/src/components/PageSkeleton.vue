<template>
  <div class="skeleton" role="status">
    <p class="label">Opening your notebook…</p>
    <span class="bar" style="width: 70%"></span>
    <span class="bar" style="width: 92%"></span>
    <span class="bar" style="width: 84%"></span>
    <span class="bar" style="width: 55%"></span>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.label {
  font-family: var(--font-hand);
  font-size: 1.75rem;
  line-height: 1.1;
}

.bar {
  height: 0.9rem;
  border-radius: 6px;
  background: var(--gray-border);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse { 50% { opacity: 0.45; } }

@media (prefers-reduced-motion: reduce) {
  .bar { animation: none; }
}
</style>
