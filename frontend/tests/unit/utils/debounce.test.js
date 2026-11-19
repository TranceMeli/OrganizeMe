import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounceById } from '@/utils/debounce'

describe('debounceById', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs once after the delay, with the latest arguments', async () => {
    const save = vi.fn().mockResolvedValue()
    const debounced = debounceById(save, 500)

    debounced({ id: 'a', title: 'one' })
    debounced({ id: 'a', title: 'two' })
    debounced({ id: 'a', title: 'three' })
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ id: 'a', title: 'three' })
  })

  it('does not run before the delay has passed', async () => {
    const save = vi.fn().mockResolvedValue()
    debounceById(save, 500)({ id: 'a' })

    await vi.advanceTimersByTimeAsync(499)
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps a separate timer per id, so switching items does not drop a pending save', async () => {
    const save = vi.fn().mockResolvedValue()
    const debounced = debounceById(save, 500)

    debounced({ id: 'a', title: 'first item' })
    await vi.advanceTimersByTimeAsync(200)
    debounced({ id: 'b', title: 'second item' })
    await vi.advanceTimersByTimeAsync(500)

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenCalledWith({ id: 'a', title: 'first item' })
    expect(save).toHaveBeenCalledWith({ id: 'b', title: 'second item' })
  })

  it('restarts the delay for the same id on every call', async () => {
    const save = vi.fn().mockResolvedValue()
    const debounced = debounceById(save, 500)

    debounced({ id: 'a' })
    await vi.advanceTimersByTimeAsync(400)
    debounced({ id: 'a' })
    await vi.advanceTimersByTimeAsync(400)
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('takes the id from a custom getter when the first argument is not an object', async () => {
    const save = vi.fn().mockResolvedValue()
    const debounced = debounceById(save, 100, (id) => id)

    debounced('x', 'title 1')
    debounced('y', 'title 2')
    debounced('x', 'title 3')
    await vi.advanceTimersByTimeAsync(100)

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenCalledWith('x', 'title 3')
    expect(save).toHaveBeenCalledWith('y', 'title 2')
  })

  it('logs a failed save instead of throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const save = vi.fn().mockRejectedValue(new Error('offline'))

    debounceById(save, 100)({ id: 'a' })
    await vi.advanceTimersByTimeAsync(100)

    expect(error).toHaveBeenCalledWith('Saving failed:', expect.any(Error))
    error.mockRestore()
  })
})
