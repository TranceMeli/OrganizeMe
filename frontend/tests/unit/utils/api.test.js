import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let api, resource, status

function respond(body, { ok = true, status: code = 200 } = {}) {
  return Promise.resolve({ ok, status: code, json: () => Promise.resolve(body) })
}

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn())
  ;({ api, resource } = await import('@/utils/api'))
  ;({ saveStatus: status } = await import('@/composables/useSaveStatus'))
})

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('reads JSON from the backend address', async () => {
    fetch.mockReturnValue(respond([{ id: '1' }]))

    await expect(api('/todos')).resolves.toEqual([{ id: '1' }])
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/todos', expect.objectContaining({ method: 'GET' }))
  })

  it('does not touch the save status for reads', async () => {
    fetch.mockReturnValue(respond([]))
    await api('/todos')
    expect(status.state).toBe('idle')
  })

  it('throws on a failed read with the status in the message', async () => {
    fetch.mockReturnValue(respond({}, { ok: false, status: 500 }))
    await expect(api('/todos')).rejects.toThrow('GET /todos failed with HTTP 500')
  })

  it('sends a JSON body for POST and returns the created item', async () => {
    fetch.mockReturnValue(respond({ id: 'new', title: 'A' }))

    const created = await api('/todos', { method: 'POST', body: { title: 'A' } })

    expect(created).toEqual({ id: 'new', title: 'A' })
    const [, init] = fetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ title: 'A' }))
    expect(status.state).toBe('saved')
  })

  it('returns nothing for PUT and DELETE, whose answer nobody needs', async () => {
    fetch.mockReturnValue(respond({ success: true }))
    await expect(api('/todos/1', { method: 'PUT', body: { title: 'x' } })).resolves.toBeUndefined()
    await expect(api('/todos/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('sends no content type header when there is no body', async () => {
    fetch.mockReturnValue(respond({ success: true }))
    await api('/todos/1', { method: 'DELETE' })
    expect(fetch.mock.calls[0][1].headers).toBeUndefined()
  })

  it('marks a failed PUT as retryable', async () => {
    fetch.mockReturnValue(respond({}, { ok: false, status: 500 }))

    await expect(api('/todos/1', { method: 'PUT', body: {} })).rejects.toThrow('HTTP 500')
    expect(status.state).toBe('error')
    expect(status.canRetry).toBe(true)
  })

  it('does not mark a failed DELETE or POST as retryable', async () => {
    fetch.mockReturnValue(respond({}, { ok: false, status: 500 }))

    await expect(api('/todos/1', { method: 'DELETE' })).rejects.toThrow()
    expect(status.canRetry).toBe(false)
  })

  it('reports a network failure as a failed save', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api('/todos/1', { method: 'PUT', body: {} })).rejects.toThrow('Failed to fetch')
    expect(status.state).toBe('error')
  })
})

describe('resource', () => {
  it('builds the paths for a collection', async () => {
    fetch.mockReturnValue(respond({}))
    const todos = resource('todos')

    await todos.list()
    await todos.create({ title: 'a' })
    await todos.update({ id: '7', title: 'b' })
    await todos.remove('7')

    const calls = fetch.mock.calls.map(([url, init]) => `${init.method} ${url}`)
    expect(calls).toEqual([
      'GET http://localhost:3001/todos',
      'POST http://localhost:3001/todos',
      'PUT http://localhost:3001/todos/7',
      'DELETE http://localhost:3001/todos/7'
    ])
  })

  it('sends the whole item as the body of an update', async () => {
    fetch.mockReturnValue(respond({}))
    await resource('entries').update({ id: '1', title: 'T', content: 'C' })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ id: '1', title: 'T', content: 'C' })
  })
})
