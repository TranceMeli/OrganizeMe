import { afterEach, vi } from 'vitest'

// jsdom has no matchMedia. App.vue uses it to switch to the narrow layout.
// Tests that need the narrow layout replace this stub.
export function stubMatchMedia(matches = false) {
  const listeners = new Set()
  const mql = {
    matches,
    media: '',
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
    // Lets a test simulate the window being resized across the breakpoint
    change(next) {
      mql.matches = next
      listeners.forEach(fn => fn({ matches: next }))
    }
  }
  window.matchMedia = vi.fn(() => mql)
  return mql
}

stubMatchMedia(false)

afterEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})
