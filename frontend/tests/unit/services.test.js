import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as entries from '@/modules/entries/services/entryService'
import * as drawings from '@/modules/drawing/services/drawingService'
import * as todos from '@/modules/todo/services/todoService'
import * as snippets from '@/modules/code/services/codeService'

// Each service is a thin wrapper around one collection of the backend.
// These tests make sure none of them points at the wrong path or uses the wrong method.

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }))
})

afterEach(() => vi.unstubAllGlobals())

const lastCall = () => {
  const [url, init] = fetch.mock.calls.at(-1)
  return `${init.method} ${url.replace('http://localhost:3001', '')}`
}

describe.each([
  ['entries', entries, ['getEntries', 'createEntry', 'updateEntry', 'deleteEntry']],
  ['drawings', drawings, ['getDrawings', 'createDrawing', 'updateDrawing', 'deleteDrawing']],
  ['todos', todos, ['getTodos', 'createTodo', 'updateTodo', 'deleteTodo']],
  ['snippets', snippets, ['getSnippets', 'createSnippet', 'updateSnippet', 'deleteSnippet']]
])('%s service', (path, service, [list, create, update, remove]) => {
  it('lists the collection', async () => {
    await service[list]()
    expect(lastCall()).toBe(`GET /${path}`)
  })

  it('creates an item', async () => {
    await service[create]({ title: 'x' })
    expect(lastCall()).toBe(`POST /${path}`)
    expect(JSON.parse(fetch.mock.calls.at(-1)[1].body)).toEqual({ title: 'x' })
  })

  it('updates an item by id', async () => {
    await service[update]({ id: '42', title: 'x' })
    expect(lastCall()).toBe(`PUT /${path}/42`)
  })

  it('removes an item by id', async () => {
    await service[remove]('42')
    expect(lastCall()).toBe(`DELETE /${path}/42`)
  })
})
