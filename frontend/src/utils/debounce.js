// Debounce pro ID, damit ein Wechsel des Eintrags ausstehende Speicherungen nicht verwirft.
// `getId` liefert aus den Argumenten die ID, unter der der Timer geführt wird.
export function debounceById(fn, delay, getId = (first) => first.id) {
  const timers = new Map()
  return function (...args) {
    const id = getId(...args)
    clearTimeout(timers.get(id))
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      fn(...args).catch(err => console.error('Saving failed:', err))
    }, delay))
  }
}
