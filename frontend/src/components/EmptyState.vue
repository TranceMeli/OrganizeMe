<script setup>
defineProps({
  title: String,
  text: String,
  action: String
})

defineEmits(['action'])
</script>

<template>
  <div class="empty-state">
    <svg viewBox="0 0 64 48" width="64" height="48" fill="none" stroke="var(--blue)"
         stroke-width="2.5" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 8c10-3 20-3 28 3v34c-8-6-18-6-28-3zM60 8c-10-3-20-3-28 3v34c8-6 18-6 28-3z" />
    </svg>
    <h3>{{ title }}</h3>
    <p>{{ text }}</p>
    <button class="primary" @click="$emit('action')">{{ action }}</button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding-top: 8px;
}

h3 {
  font-family: var(--font-hand);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.1;
}

p {
  max-width: 32ch;
  color: var(--muted);
}

.primary {
  height: var(--control-h);
  padding: 0 18px;
  background: var(--blue);
  color: var(--on-accent);
  border: none;
  border-radius: 8px;
  font-family: var(--font);
  font-size: var(--fs-sm);
  font-weight: 600;
  cursor: pointer;
}

.primary:hover { background: var(--blue-dark); }
</style>
