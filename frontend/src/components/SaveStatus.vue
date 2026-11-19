<script setup>
// The element is always rendered, even while idle, because screen readers only announce
// changes in a live region that already exists. Every state has an icon and words, never colour alone.
import { computed } from 'vue'
import { saveStatus, retryFailed, dismissFailed } from '@/composables/useSaveStatus'

const time = computed(() =>
  saveStatus.savedAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) ?? ''
)
</script>

<template>
  <div class="save" :data-state="saveStatus.state" role="status" aria-live="polite">
    <template v-if="saveStatus.state === 'saving'">
      <svg class="spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
           stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-6.2-8.5" />
      </svg>
      Saving…
    </template>

    <template v-else-if="saveStatus.state === 'saved'">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
           stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 12l5 5 9-10" />
      </svg>
      Saved {{ time }}
    </template>

    <template v-else-if="saveStatus.state === 'error'">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
           stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <path d="M12 7v6M12 17h.01" />
      </svg>
      Couldn't save
      <button v-if="saveStatus.canRetry" class="link" @click="retryFailed">Retry</button>
      <button v-else class="link" @click="dismissFailed">Dismiss</button>
    </template>
  </div>
</template>

<style scoped>
.save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 1.75rem;
  padding: 2px 10px;
  border: 1px solid transparent;
  border-radius: 99px;
  font-size: var(--fs-sm);
  font-weight: 600;
  white-space: nowrap;
}

.save[data-state='idle'] { visibility: hidden; }

.save[data-state='saving'] {
  color: var(--text);
  background: color-mix(in srgb, var(--muted) 16%, transparent);
}

.save[data-state='saved'] {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 16%, transparent);
}

.save[data-state='error'] {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-color: var(--danger);
}

.link {
  padding: 0 2px;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.spin { animation: spin 0.9s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
}
</style>
