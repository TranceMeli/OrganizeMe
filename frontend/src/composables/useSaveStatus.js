import { reactive } from 'vue'

// Shared save indicator state. Without it, a failed autosave would only show up in the console
// and the user would assume their text was stored.
export const saveStatus = reactive({
  state: 'idle', // idle | saving | saved | error
  savedAt: null,
  canRetry: false
})

let pending = 0

// key -> run function (retryable) or null (shown, but cannot be repeated safely)
const failed = new Map()

function refresh() {
  if (pending > 0) saveStatus.state = 'saving'
  else if (failed.size > 0) saveStatus.state = 'error'
  else saveStatus.state = saveStatus.savedAt ? 'saved' : 'idle'

  saveStatus.canRetry = [...failed.values()].some(Boolean)
}

/**
 * Runs a write request and keeps the indicator in sync.
 * `key` identifies the request, so a later successful write to the same target
 * replaces a stale failure instead of leaving the error on screen.
 */
export async function trackSave(key, run, { retryable = false } = {}) {
  pending++
  refresh()

  try {
    const result = await run()
    failed.delete(key)
    saveStatus.savedAt = new Date()
    return result
  } catch (err) {
    failed.set(key, retryable ? run : null)
    throw err
  } finally {
    pending--
    refresh()
  }
}

// Only PUT requests are retryable: they replace the whole record, so repeating them is safe.
// Repeating a POST could create duplicates, and the UI would not receive the new item anyway.
export async function retryFailed() {
  for (const [key, run] of [...failed]) {
    if (!run) continue
    try {
      await trackSave(key, run, { retryable: true })
    } catch {
      // trackSave keeps the failure visible
    }
  }
}

export function dismissFailed() {
  failed.clear()
  refresh()
}
