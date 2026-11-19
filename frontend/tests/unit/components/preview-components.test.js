import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/modules/entries/services/entryService', () => ({ getEntries: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn() }))
vi.mock('@/modules/drawing/services/drawingService', () => ({ getDrawings: vi.fn(), createDrawing: vi.fn(), updateDrawing: vi.fn(), deleteDrawing: vi.fn() }))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import { useEntryStore } from '@/modules/entries/stores/entryStore'
import { useDrawingStore } from '@/modules/drawing/stores/drawingStore'
import EntryPreview from '@/modules/entries/components/EntryPreview.vue'
import DrawingPreview from '@/modules/drawing/components/DrawingPreview.vue'

let pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

function entryPreview(entries, activeId = entries[0]?.id) {
  const store = useEntryStore()
  store.entries = entries
  store.activeId = activeId ?? null
  return { store, wrapper: mount(EntryPreview, { global: { plugins: [pinia] } }) }
}

const richtext = { id: 'r', title: 'Rich', content: '<p>Hello <strong>world</strong></p>', mode: 'richtext', created_at: '2026-11-17 10:00:00' }
const markdown = { id: 'm', title: 'MD', content: '# Heading\n\n- one\n- two\n\n**bold**', mode: 'markdown', created_at: '2026-05-08 10:00:00' }

describe('EntryPreview', () => {
  it('shows rich text as the HTML it was written in', () => {
    const { wrapper } = entryPreview([richtext])
    expect(wrapper.find('.content strong').text()).toBe('world')
    expect(wrapper.find('.content').classes()).not.toContain('markdown')
  })

  it('renders Markdown to HTML', () => {
    const { wrapper } = entryPreview([markdown])
    const content = wrapper.find('.content')

    expect(content.classes()).toContain('markdown')
    expect(content.find('h1').text()).toBe('Heading')
    expect(content.findAll('li')).toHaveLength(2)
    expect(content.find('strong').text()).toBe('bold')
  })

  it.each([[richtext, 'RT'], [markdown, 'MD']])('labels the mode with a badge', (entry, badge) => {
    const { wrapper } = entryPreview([entry])
    expect(wrapper.find('.mode-badge').text()).toBe(badge)
  })

  it('shows the creation date of the entry', () => {
    const { wrapper } = entryPreview([richtext])
    expect(wrapper.find('.datum').text()).toBe('Tuesday, 11/17/2026')
  })

  it('says so when an entry has no content yet', () => {
    const { wrapper } = entryPreview([{ ...richtext, content: '' }])
    expect(wrapper.find('.content').text()).toContain('No content yet')
  })

  it('renders nothing for Markdown without content', () => {
    const { wrapper } = entryPreview([{ ...markdown, content: '' }])
    expect(wrapper.find('.content').text()).toBe('')
  })

  it('lists the entries and selects the one that is clicked', async () => {
    const { wrapper, store } = entryPreview([richtext, markdown], 'r')
    expect(wrapper.findAll('.item')).toHaveLength(2)

    await wrapper.findAll('.item')[1].trigger('click')
    expect(store.activeId).toBe('m')
    expect(wrapper.find('.content h1').exists()).toBe(true)
  })

  it('does not break when there are no entries', () => {
    const { wrapper } = entryPreview([], null)
    expect(wrapper.find('.content').text()).toBe('')
    expect(wrapper.text()).toContain('Nothing here yet')
  })
})

describe('DrawingPreview', () => {
  function drawingPreview(drawings) {
    const store = useDrawingStore()
    store.drawings = drawings
    store.activeId = drawings[0]?.id ?? null
    return mount(DrawingPreview, { global: { plugins: [pinia] } })
  }

  it('shows the saved image', () => {
    const wrapper = drawingPreview([{ id: 'd', title: 'Art', data: 'data:image/png;base64,AAAA', created_at: '2026-05-08 10:00:00' }])
    const img = wrapper.find('img.preview-img')

    expect(img.attributes('src')).toBe('data:image/png;base64,AAAA')
    expect(img.attributes('alt')).toBe('Preview')
  })

  it('says so when the drawing is still empty', () => {
    const wrapper = drawingPreview([{ id: 'd', title: 'Art', data: '', created_at: '2026-05-08 10:00:00' }])
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('No drawing yet')
  })

  it('shows the date of the drawing', () => {
    const wrapper = drawingPreview([{ id: 'd', title: 'Art', data: '', created_at: '2026-05-08 10:00:00' }])
    expect(wrapper.find('.datum').text()).toBe('Friday, 05/08/2026')
  })
})
