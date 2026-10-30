import { reactive } from 'vue'

// Gemeinsamer Zustand für den Bestätigungsdialog (ein Dialog gleichzeitig).
// DialogHost.vue zeigt ihn an, confirmDialog liefert ein Promise.
export const dialog = reactive({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'OK',
  danger: false,
  resolve: null
})

export function closeDialog(result) {
  const resolve = dialog.resolve
  dialog.open = false
  dialog.resolve = null
  resolve?.(result)
}

/** Bestätigungsdialog. Liefert true oder false. */
export function confirmDialog({ title, message = '', confirmLabel = 'Delete', danger = true }) {
  // Ein noch offener Dialog gilt als abgebrochen
  if (dialog.open) closeDialog(false)

  return new Promise((resolve) => {
    Object.assign(dialog, { open: true, title, message, confirmLabel, danger, resolve })
  })
}
