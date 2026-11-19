import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadConfig() {
  vi.resetModules()
  return (await import('@/config')).API_BASE
}

describe('API_BASE', () => {
  it('points at the local backend by default', async () => {
    vi.stubEnv('VITE_API_BASE', '')
    expect(await loadConfig()).toBe('http://localhost:3001')
  })

  it('can be overridden with VITE_API_BASE', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://localhost:4000')
    expect(await loadConfig()).toBe('http://localhost:4000')
  })

  it('is used by the API client for every request', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://example.test:9')
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }))

    const { api } = await import('@/utils/api')
    await api('/todos')

    expect(fetch.mock.calls[0][0]).toBe('http://example.test:9/todos')
    vi.unstubAllGlobals()
  })
})
