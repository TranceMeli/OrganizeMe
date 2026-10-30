<script setup>
defineProps({
  disabled: Boolean
})

defineEmits(['create', 'delete'])
</script>

<template>
  <div class="page-actions">
    <button class="btn-new" @click="$emit('create')">New</button>

    <button
      class="icon-btn"
      title="Delete"
      aria-label="Delete"
      :disabled="disabled"
      @click="$emit('delete')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.page-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.btn-new,
.icon-btn {
  height: 30px;
  background: var(--blue);
  color: var(--on-accent);
  border: none;
  border-radius: 8px;
  font-family: var(--font);
  cursor: pointer;
}

.btn-new {
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
}

.icon-btn {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-new:hover,
.icon-btn:hover:not(:disabled) { background: var(--blue-dark); }

.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-new:focus-visible,
.icon-btn:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}
</style>
