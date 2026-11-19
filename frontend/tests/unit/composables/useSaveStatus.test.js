import { beforeEach, describe, expect, it, vi } from 'vitest'

// The status is module state, so every test starts with a freshly imported copy
let status, track, retryFailed, dismissFailed

beforeEach(async () => {
  vi.resetModules()
  ;({ saveStatus: status, trackSave: track, retryFailed, dismissFailed } = await import('@/composables/useSaveStatus'))
})

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('trackSave', () => {
  it('starts idle', () => {
    expect(status.state).toBe('idle')
    expect(status.savedAt).toBeNull()
    expect(status.canRetry).toBe(false)
  })

  it('reports saving while the request is open, then saved with a time', async () => {
    const gate = deferred()
    const pending = track('PUT /a', () => gate.promise)
    expect(status.state).toBe('saving')

    gate.resolve('ok')
    await expect(pending).resolves.toBe('ok')
    expect(status.state).toBe('saved')
    expect(status.savedAt).toBeInstanceOf(Date)
  })

  it('stays in saving until every parallel request has finished', async () => {
    const first = deferred()
    const second = deferred()
    const a = track('PUT /a', () => first.promise)
    const b = track('PUT /b', () => second.promise)

    first.resolve()
    await a
    expect(status.state).toBe('saving')

    second.resolve()
    await b
    expect(status.state).toBe('saved')
  })

  it('reports an error and rethrows when the request fails', async () => {
    await expect(track('PUT /a', () => Promise.reject(new Error('down')), { retryable: true })).rejects.toThrow('down')
    expect(status.state).toBe('error')
    expect(status.canRetry).toBe(true)
  })

  it('does not offer a retry for requests that are unsafe to repeat', async () => {
    await expect(track('POST /a', () => Promise.reject(new Error('down')))).rejects.toThrow()
    expect(status.state).toBe('error')
    expect(status.canRetry).toBe(false)
  })

  it('replaces a stale failure when a later write to the same target succeeds', async () => {
    await expect(track('PUT /a', () => Promise.reject(new Error('down')), { retryable: true })).rejects.toThrow()
    await track('PUT /a', () => Promise.resolve(), { retryable: true })
    expect(status.state).toBe('saved')
    expect(status.canRetry).toBe(false)
  })

  it('keeps the error when a different target saves successfully', async () => {
    await expect(track('PUT /a', () => Promise.reject(new Error('down')), { retryable: true })).rejects.toThrow()
    await track('PUT /b', () => Promise.resolve(), { retryable: true })
    expect(status.state).toBe('error')
  })
})

describe('retryFailed', () => {
  it('repeats the failed request and clears the error when it works', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('ok')

    await expect(track('PUT /a', run, { retryable: true })).rejects.toThrow()
    await retryFailed()

    expect(run).toHaveBeenCalledTimes(2)
    expect(status.state).toBe('saved')
  })

  it('keeps the error visible when the retry fails again', async () => {
    const run = vi.fn().mockRejectedValue(new Error('still down'))
    await expect(track('PUT /a', run, { retryable: true })).rejects.toThrow()

    await expect(retryFailed()).resolves.toBeUndefined()
    expect(run).toHaveBeenCalledTimes(2)
    expect(status.state).toBe('error')
    expect(status.canRetry).toBe(true)
  })

  it('skips requests that cannot be repeated safely', async () => {
    const run = vi.fn().mockRejectedValue(new Error('down'))
    await expect(track('POST /a', run)).rejects.toThrow()

    await retryFailed()
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('dismissFailed', () => {
  it('clears every failure', async () => {
    await expect(track('POST /a', () => Promise.reject(new Error('down')))).rejects.toThrow()
    dismissFailed()
    expect(status.state).toBe('idle')
    expect(status.canRetry).toBe(false)
  })

  it('falls back to saved when something was saved before', async () => {
    await track('PUT /ok', () => Promise.resolve(), { retryable: true })
    await expect(track('PUT /bad', () => Promise.reject(new Error('down')), { retryable: true })).rejects.toThrow()
    dismissFailed()
    expect(status.state).toBe('saved')
  })
})
