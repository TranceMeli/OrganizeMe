import { reactive } from 'vue'

// State of the confirmation dialog, one at a time. DialogHost.vue renders it and
// confirmDialog() resolves with the answer, so callers can simply await it.
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

/** Asks for confirmation. Resolves with true or false. */
export function confirmDialog({ title, message = '', confirmLabel = 'Delete', danger = true }) {
  // A dialog that is still open counts as cancelled
  if (dialog.open) closeDialog(false)

  return new Promise((resolve) => {
    Object.assign(dialog, { open: true, title, message, confirmLabel, danger, resolve })
  })
}
