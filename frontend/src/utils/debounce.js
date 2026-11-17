// Debounces per item. A single shared timer would drop the pending save of the previous entry
// when the user switches entries within the delay.
// `getId` picks the timer key from the call arguments.
export function debounceById(fn, delay, getId = (first) => first.id) {
  const timers = new Map()
  return function (...args) {
    const id = getId(...args)
    clearTimeout(timers.get(id))
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      // The save indicator already reports the failure to the user
      fn(...args).catch(err => console.error('Saving failed:', err))
    }, delay))
  }
}
