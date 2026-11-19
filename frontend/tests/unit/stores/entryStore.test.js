import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/modules/entries/services/entryService', () => ({
  getEntries: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn()
}))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import * as service from '@/modules/entries/services/entryService'
import { confirmDialog } from '@/composables/useDialog'
import { useEntryStore } from '@/modules/entries/stores/entryStore'

const entry = (id, extra = {}) => ({ id, title: `Title ${id}`, content: '<p>x</p>', mode: 'richtext', ...extra })

let store

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  store = useEntryStore()
  service.updateEntry.mockResolvedValue()
})

afterEach(() => vi.useRealTimers())

describe('loading', () => {
  it('fills the list, selects the first entry and marks the store as loaded', async () => {
    service.getEntries.mockResolvedValue([entry('a'), entry('b')])
    await store.fetchEntries()

    expect(store.entries).toHaveLength(2)
    expect(store.activeId).toBe('a')
    expect(store.activeEntry.id).toBe('a')
    expect(store.loaded).toBe(true)
  })

  it('selects nothing when there are no entries', async () => {
    service.getEntries.mockResolvedValue([])
    await store.fetchEntries()

    expect(store.activeId).toBeNull()
    expect(store.activeEntry).toBeNull()
    expect(store.loaded).toBe(true)
  })

  it('stays unloaded when the request fails', async () => {
    service.getEntries.mockRejectedValue(new Error('down'))
    await expect(store.fetchEntries()).rejects.toThrow('down')
    expect(store.loaded).toBe(false)
  })
})

describe('creating', () => {
  it('adds a numbered rich text entry at the top and selects it', async () => {
    service.getEntries.mockResolvedValue([entry('a')])
    await store.fetchEntries()
    service.createEntry.mockResolvedValue(entry('new', { title: 'Entry 2' }))

    await store.createEntry()

    expect(service.createEntry).toHaveBeenCalledWith({ title: 'Entry 2', content: '<p></p>', mode: 'richtext' })
    expect(store.entries[0].id).toBe('new')
    expect(store.activeId).toBe('new')
  })
})

describe('deleting', () => {
  beforeEach(async () => {
    service.getEntries.mockResolvedValue([entry('a'), entry('b'), entry('c')])
    await store.fetchEntries()
  })

  it('asks first and names the entry', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteEntry('b')

    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Delete entry?',
      message: expect.stringContaining('Title b')
    }))
  })

  it('keeps everything when the user cancels', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteEntry('b')

    expect(service.deleteEntry).not.toHaveBeenCalled()
    expect(store.entries).toHaveLength(3)
  })

  it('removes the entry and selects the first remaining one when confirmed', async () => {
    confirmDialog.mockResolvedValue(true)
    service.deleteEntry.mockResolvedValue()
    store.setActive('b')

    await store.deleteEntry()

    expect(service.deleteEntry).toHaveBeenCalledWith('b')
    expect(store.entries.map(e => e.id)).toEqual(['a', 'c'])
    expect(store.activeId).toBe('a')
  })

  it('selects nothing after the last entry is deleted', async () => {
    confirmDialog.mockResolvedValue(true)
    service.deleteEntry.mockResolvedValue()
    for (const id of ['a', 'b', 'c']) await store.deleteEntry(id)

    expect(store.entries).toEqual([])
    expect(store.activeId).toBeNull()
  })

  it('does nothing without a selected entry', async () => {
    store.activeId = null
    await store.deleteEntry()
    expect(confirmDialog).not.toHaveBeenCalled()
  })

  it('keeps the entry when the server refuses to delete it', async () => {
    confirmDialog.mockResolvedValue(true)
    service.deleteEntry.mockRejectedValue(new Error('down'))

    await expect(store.deleteEntry('b')).rejects.toThrow('down')
    expect(store.entries).toHaveLength(3)
  })
})

describe('editing', () => {
  beforeEach(async () => {
    service.getEntries.mockResolvedValue([entry('a'), entry('b')])
    await store.fetchEntries()
  })

  it('shows a new title at once and saves it after 500 ms', async () => {
    store.updateTitle('Renamed')
    expect(store.activeEntry.title).toBe('Renamed')
    expect(service.updateEntry).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)
    expect(service.updateEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', title: 'Renamed' }))
  })

  it('sends one request for a burst of keystrokes', async () => {
    for (const text of ['<p>h</p>', '<p>he</p>', '<p>hel</p>']) store.updateContent(text)
    await vi.advanceTimersByTimeAsync(500)

    expect(service.updateEntry).toHaveBeenCalledTimes(1)
    expect(service.updateEntry).toHaveBeenCalledWith(expect.objectContaining({ content: '<p>hel</p>' }))
  })

  it('still saves the previous entry when the user switches within the delay', async () => {
    store.updateTitle('Edited A')
    store.setActive('b')
    store.updateTitle('Edited B')
    await vi.advanceTimersByTimeAsync(500)

    const saved = service.updateEntry.mock.calls.map(([e]) => [e.id, e.title])
    expect(saved).toEqual(expect.arrayContaining([['a', 'Edited A'], ['b', 'Edited B']]))
  })

  it('sends a copy, so later edits cannot change a request that is already queued', async () => {
    store.updateTitle('first')
    store.updateTitle('second')
    await vi.advanceTimersByTimeAsync(500)
    expect(service.updateEntry.mock.calls[0][0].title).toBe('second')
  })

  it('ignores edits when nothing is selected', async () => {
    store.activeId = null
    store.updateTitle('x')
    store.updateContent('x')
    store.updateMode('markdown')
    await vi.advanceTimersByTimeAsync(500)
    expect(service.updateEntry).not.toHaveBeenCalled()
  })

  it('starts an empty Markdown entry when the mode switches to Markdown', async () => {
    store.updateMode('markdown')
    expect(store.activeEntry.mode).toBe('markdown')
    expect(store.activeEntry.content).toBe('')
  })

  it('starts an empty paragraph when the mode switches back to rich text', async () => {
    store.updateMode('markdown')
    store.updateMode('richtext')
    expect(store.activeEntry.mode).toBe('richtext')
    expect(store.activeEntry.content).toBe('<p></p>')
  })
})
