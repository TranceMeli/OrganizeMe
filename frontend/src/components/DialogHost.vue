<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { dialog, closeDialog } from '../composables/useDialog'

defineProps({
  tool: { type: String, default: 'notebook' }
})

const panelRef = ref(null)
let previouslyFocused = null

function cancel() {
  closeDialog(false)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
    return
  }
  // Fokus bleibt im Dialog
  if (e.key === 'Tab' && panelRef.value) {
    const focusable = panelRef.value.querySelectorAll('button:not([disabled])')
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

watch(() => dialog.open, async (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    // Fokus auf "Cancel", damit Enter nichts Unwiderrufliches auslöst
    panelRef.value?.querySelector('.btn-cancel')?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    v-if="dialog.open"
    class="modal-backdrop"
    :style="{ '--accent': `var(--tool-${tool})` }"
    @mousedown.self="cancel"
  >
    <div
      ref="panelRef"
      class="modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-message"
    >
      <h3 id="modal-title" class="modal-title">{{ dialog.title }}</h3>
      <p v-if="dialog.message" id="modal-message" class="modal-message">{{ dialog.message }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" @click="cancel">Cancel</button>
        <button
          type="button"
          class="btn-confirm"
          :class="{ danger: dialog.danger }"
          @click="closeDialog(true)"
        >
          {{ dialog.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(28 17 9 / 0.55);
  animation: fade 0.12s ease-out;
}

.modal {
  width: min(420px, 100%);
  padding: 22px 24px 20px;
  background: var(--gray-bg);
  color: var(--text);
  border: 1px solid var(--cover-edge);
  border-radius: 12px;
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.35);
  font-family: var(--font);
}

.modal-title {
  font-family: var(--font-hand);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 10px;
}

.modal-message {
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.btn-cancel,
.btn-confirm {
  height: 34px;
  padding: 0 16px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--gray-border);
}

.btn-cancel:hover { background: var(--gray-card); }

.btn-confirm {
  background: var(--accent);
  color: var(--on-accent);
  border: 1px solid transparent;
}

.btn-confirm.danger { background: #A63D2F; color: #fff; }
.btn-confirm:hover { filter: brightness(1.08); }

.btn-cancel:focus-visible,
.btn-confirm:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@keyframes fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .modal-backdrop { animation: none; }
}
</style>
