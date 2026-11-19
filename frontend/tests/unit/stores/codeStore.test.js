import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/modules/code/services/codeService', () => ({
  getSnippets: vi.fn(),
  createSnippet: vi.fn(),
  updateSnippet: vi.fn(),
  deleteSnippet: vi.fn()
}))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import * as service from '@/modules/code/services/codeService'
import { confirmDialog } from '@/composables/useDialog'
import { useCodeStore } from '@/modules/code/stores/codeStore'
import { languages } from '@/modules/code/languages'

const snippet = (id) => ({ id, title: `Snippet ${id}`, code: 'let a = 1', language: 'javascript' })

let store

beforeEach(async () => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  store = useCodeStore()
  service.getSnippets.mockResolvedValue([snippet('a'), snippet('b')])
  service.updateSnippet.mockResolvedValue()
  await store.fetchSnippets()
})

afterEach(() => vi.useRealTimers())

describe('loading and creating', () => {
  it('selects the first snippet', () => {
    expect(store.activeId).toBe('a')
    expect(store.activeSnippet.id).toBe('a')
    expect(store.loaded).toBe(true)
  })

  it('creates a numbered JavaScript snippet and selects it', async () => {
    service.createSnippet.mockResolvedValue(snippet('new'))
    await store.createSnippet()

    expect(service.createSnippet).toHaveBeenCalledWith({
      title: 'Snippet 3',
      code: '// Write here...',
      language: 'javascript'
    })
    expect(store.activeId).toBe('new')
    expect(store.snippets[0].id).toBe('new')
  })
})

describe('editing', () => {
  it('saves a new title after 800 ms', async () => {
    store.updateTitle('Renamed')
    expect(service.updateSnippet).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', title: 'Renamed' }))
  })

  it('saves new code', async () => {
    store.updateCode('const b = 2')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ code: 'const b = 2' }))
  })

  it('saves a new language', async () => {
    store.updateLanguage('python')
    expect(store.activeSnippet.language).toBe('python')

    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ language: 'python' }))
  })

  it('combines changes made within the delay into one request', async () => {
    store.updateTitle('T')
    store.updateCode('C')
    store.updateLanguage('sql')
    await vi.advanceTimersByTimeAsync(800)

    expect(service.updateSnippet).toHaveBeenCalledTimes(1)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ title: 'T', code: 'C', language: 'sql' }))
  })

  it('ignores edits without a selected snippet', async () => {
    store.activeId = null
    store.updateTitle('x')
    store.updateCode('x')
    store.updateLanguage('x')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).not.toHaveBeenCalled()
  })
})

describe('deleteSnippet', () => {
  it('keeps the snippet when the user cancels', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteSnippet('a')
    expect(service.deleteSnippet).not.toHaveBeenCalled()
    expect(store.snippets).toHaveLength(2)
  })

  it('removes the snippet and selects the first remaining one', async () => {
    confirmDialog.mockResolvedValue(true)
    service.deleteSnippet.mockResolvedValue()
    await store.deleteSnippet('a')

    expect(store.snippets.map(s => s.id)).toEqual(['b'])
    expect(store.activeId).toBe('b')
  })
})

describe('languages', () => {
  it('offers the ten languages the editor supports, without duplicates', () => {
    expect(languages).toHaveLength(10)
    expect(new Set(languages).size).toBe(languages.length)
    expect(languages).toContain('javascript')
  })
})
