import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

vi.mock('@/modules/entries/services/entryService', () => ({
  getEntries: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn()
}))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import * as service from '@/modules/entries/services/entryService'
import { confirmDialog } from '@/composables/useDialog'
import { useEntryStore } from '@/modules/entries/stores/entryStore'
import EntryEditor from '@/modules/entries/components/EntryEditor.vue'

// The rich text area is the real TipTap editor, running in jsdom. jsdom cannot measure layout,
// so these tests stick to content and commands and leave scrolling and caret behaviour to the
// end-to-end tests.

const entry = (id, extra = {}) => ({ id, title: `Title ${id}`, content: `<p>Body ${id}</p>`, mode: 'richtext', ...extra })

let pinia
let store

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  store = useEntryStore()
  service.updateEntry.mockResolvedValue()
})

afterEach(() => vi.useRealTimers())

async function mountEditor(entries) {
  store.entries = entries
  store.activeId = entries[0]?.id ?? null
  store.loaded = true
  const wrapper = mount(EntryEditor, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

/** The TipTap instance lives on the editable element. */
const tiptap = (wrapper) => wrapper.find('.tiptap').element.editor

describe('rich text mode', () => {
  it('shows the entry in the editor', async () => {
    const wrapper = await mountEditor([entry('a')])
    expect(wrapper.find('.tiptap').text()).toBe('Body a')
    expect(wrapper.find('.title-input').element.value).toBe('Title a')
  })

  it('announces the editable area as a text box with a name', async () => {
    const wrapper = await mountEditor([entry('a')])
    const area = wrapper.find('.tiptap')

    expect(area.attributes('role')).toBe('textbox')
    expect(area.attributes('aria-multiline')).toBe('true')
    expect(area.attributes('aria-label')).toBe('Entry text')
  })

  it('shows the formatting toolbar and the mode switch', async () => {
    const wrapper = await mountEditor([entry('a')])

    expect(wrapper.findAll('.mode-btn').map(b => b.text())).toEqual(['Rich Text', 'Markdown'])
    expect(wrapper.find('.mode-btn.active').text()).toBe('Rich Text')
    expect(wrapper.find('select[aria-label="Font size"]').exists()).toBe(true)
    expect(wrapper.findAll('.fmt-btn').map(b => b.attributes('aria-label'))).toEqual(['Bold', 'Italic', 'Strikethrough'])
  })

  it('offers six font sizes', async () => {
    const wrapper = await mountEditor([entry('a')])
    const sizes = wrapper.findAll('select[aria-label="Font size"] option').map(o => o.text())
    expect(sizes).toEqual(['Size', '12px', '14px', '16px', '18px', '24px', '32px'])
  })

  it('saves typed text after the delay', async () => {
    const wrapper = await mountEditor([entry('a')])
    tiptap(wrapper).commands.setContent('<p>Typed</p>', { emitUpdate: true })
    await vi.advanceTimersByTimeAsync(500)

    expect(service.updateEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', content: '<p>Typed</p>' }))
  })

  it('toggles bold and reports the state on the button', async () => {
    const wrapper = await mountEditor([entry('a')])
    const bold = wrapper.find('button[aria-label="Bold"]')
    expect(bold.attributes('aria-pressed')).toBe('false')

    tiptap(wrapper).commands.selectAll()
    await bold.trigger('click')
    await flushPromises()

    expect(tiptap(wrapper).getHTML()).toContain('<strong>')
    await vi.waitFor(() => expect(bold.attributes('aria-pressed')).toBe('true'))
  })

  it('applies a font size as an inline style', async () => {
    const wrapper = await mountEditor([entry('a')])
    tiptap(wrapper).commands.selectAll()

    const select = wrapper.find('select[aria-label="Font size"]')
    await select.setValue('24px')

    expect(tiptap(wrapper).getHTML()).toContain('font-size: 24px')
  })

  it('renames the entry from the title field', async () => {
    const wrapper = await mountEditor([entry('a')])
    await wrapper.find('.title-input').setValue('Renamed')
    await vi.advanceTimersByTimeAsync(500)

    expect(service.updateEntry).toHaveBeenCalledWith(expect.objectContaining({ title: 'Renamed' }))
  })
})

describe('switching entries', () => {
  it('shows the content of the selected entry', async () => {
    const wrapper = await mountEditor([entry('a'), entry('b')])
    store.setActive('b')
    await flushPromises()

    expect(wrapper.find('.tiptap').text()).toBe('Body b')
  })

  it('does not save the entry that was only loaded into the editor', async () => {
    const wrapper = await mountEditor([entry('a'), entry('b')])
    store.setActive('b')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)

    expect(service.updateEntry).not.toHaveBeenCalled()
    expect(wrapper.find('.tiptap').text()).toBe('Body b')
  })

  it('never writes the text of one entry into another', async () => {
    await mountEditor([entry('a'), entry('b')])
    store.setActive('b')
    await flushPromises()
    store.setActive('a')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)

    expect(store.entries.find(e => e.id === 'a').content).toBe('<p>Body a</p>')
    expect(store.entries.find(e => e.id === 'b').content).toBe('<p>Body b</p>')
    expect(service.updateEntry).not.toHaveBeenCalled()
  })

  it('saves an edit made after switching to the entry that was edited', async () => {
    const wrapper = await mountEditor([entry('a'), entry('b')])
    store.setActive('b')
    await flushPromises()

    tiptap(wrapper).commands.setContent('<p>Edited b</p>', { emitUpdate: true })
    await vi.advanceTimersByTimeAsync(500)

    expect(service.updateEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', content: '<p>Edited b</p>' }))
  })
})

describe('markdown mode', () => {
  const markdown = () => entry('m', { mode: 'markdown', content: '# Heading' })

  it('shows a plain text area with the Markdown instead of the toolbar', async () => {
    const wrapper = await mountEditor([markdown()])

    expect(wrapper.find('.markdown-editor').element.value).toBe('# Heading')
    expect(wrapper.find('.markdown-editor').attributes('aria-label')).toBe('Markdown text')
    expect(wrapper.find('.fmt-btn').exists()).toBe(false)
    expect(wrapper.find('.mode-btn.active').text()).toBe('Markdown')
  })

  it('saves what is typed', async () => {
    const wrapper = await mountEditor([markdown()])
    await wrapper.find('.markdown-editor').setValue('## New')
    await vi.advanceTimersByTimeAsync(500)

    expect(service.updateEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'm', content: '## New' }))
  })

  it('shows the text of the selected Markdown entry when switching', async () => {
    const wrapper = await mountEditor([entry('a'), markdown()])
    store.setActive('m')
    await flushPromises()

    expect(wrapper.find('.markdown-editor').element.value).toBe('# Heading')
  })

  it('never saves editor HTML into a Markdown entry', async () => {
    const wrapper = await mountEditor([entry('a')])
    // After a mode switch the rich text editor is hidden but still alive and can still fire updates
    const hidden = tiptap(wrapper)
    await wrapper.findAll('.mode-btn')[1].trigger('click')
    await flushPromises()

    hidden.commands.setContent('<p>stray</p>', { emitUpdate: true })
    await vi.advanceTimersByTimeAsync(2000)

    const saved = service.updateEntry.mock.calls.map(([e]) => e)
    expect(saved.every(e => e.mode === 'markdown' && e.content === '')).toBe(true)
    expect(store.activeEntry.content).toBe('')
  })
})

describe('mode switch', () => {
  it('switches to Markdown with an empty text', async () => {
    const wrapper = await mountEditor([entry('a')])
    await wrapper.findAll('.mode-btn')[1].trigger('click')
    await flushPromises()

    expect(store.activeEntry.mode).toBe('markdown')
    expect(store.activeEntry.content).toBe('')
    expect(wrapper.find('.markdown-editor').element.value).toBe('')
  })

  it('switches back to rich text with an empty paragraph', async () => {
    const wrapper = await mountEditor([entry('m', { mode: 'markdown', content: '# x' })])
    await wrapper.findAll('.mode-btn')[0].trigger('click')
    await flushPromises()

    expect(store.activeEntry.mode).toBe('richtext')
    expect(store.activeEntry.content).toBe('<p></p>')
    expect(wrapper.find('.tiptap').exists()).toBe(true)
  })
})

describe('page actions', () => {
  it('creates an entry with New', async () => {
    service.createEntry.mockResolvedValue(entry('n'))
    const wrapper = await mountEditor([entry('a')])

    await wrapper.find('.btn-new').trigger('click')
    expect(service.createEntry).toHaveBeenCalledWith({ title: 'Entry 2', content: '<p></p>', mode: 'richtext' })
  })

  it('asks before deleting and disables delete without an entry', async () => {
    confirmDialog.mockResolvedValue(false)
    const wrapper = await mountEditor([entry('a')])
    await wrapper.find('button[aria-label="Delete"]').trigger('click')
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete entry?' }))

    const empty = await mountEditor([])
    expect(empty.find('button[aria-label="Delete"]').attributes('disabled')).toBeDefined()
  })
})
