import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { stubMatchMedia } from './setup.js'

// The tool pages are replaced by stubs: Monaco, TipTap and the canvas need a real browser and
// are covered by the end-to-end tests. What is tested here is the book around them.
const stub = vi.hoisted(() => ({ make: null }))
vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal()
  stub.make = (name) => vue.defineComponent({ name, render: () => vue.h('div', { class: `stub-${name}` }, name) })
  return vue
})
for (const path of [
  '@/modules/entries/components/EntryEditor.vue', '@/modules/entries/components/EntryPreview.vue',
  '@/modules/drawing/components/DrawingCanvas.vue', '@/modules/drawing/components/DrawingPreview.vue',
  '@/modules/todo/components/TodoEditor.vue', '@/modules/todo/components/TodoPreview.vue',
  '@/modules/code/components/CodeEditor.vue', '@/modules/code/components/CodePreview.vue'
]) {
  const name = path.split('/').pop().replace('.vue', '')
  vi.doMock(path, () => ({ default: stub.make(name) }))
}

vi.mock('@/modules/entries/services/entryService', () => ({ getEntries: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn() }))
vi.mock('@/modules/drawing/services/drawingService', () => ({ getDrawings: vi.fn(), createDrawing: vi.fn(), updateDrawing: vi.fn(), deleteDrawing: vi.fn() }))
vi.mock('@/modules/todo/services/todoService', () => ({ getTodos: vi.fn(), createTodo: vi.fn(), updateTodo: vi.fn(), deleteTodo: vi.fn() }))
vi.mock('@/modules/code/services/codeService', () => ({ getSnippets: vi.fn(), createSnippet: vi.fn(), updateSnippet: vi.fn(), deleteSnippet: vi.fn() }))

const entries = await import('@/modules/entries/services/entryService')
const drawings = await import('@/modules/drawing/services/drawingService')
const todos = await import('@/modules/todo/services/todoService')
const snippets = await import('@/modules/code/services/codeService')
const { default: App } = await import('@/App.vue')

const entry = { id: 'e1', title: 'Shopping list', content: '<p>x</p>', mode: 'richtext', created_at: '2026-11-17 10:00:00' }

// App.vue listens on `document`, so every mounted app has to be unmounted again.
// Otherwise the listeners of earlier tests would answer the shortcuts of later ones.
const mounted = []

async function mountApp() {
  const wrapper = mount(App, { global: { plugins: [createPinia()] }, attachTo: document.body })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

afterEach(() => {
  mounted.splice(0).forEach(w => w.unmount())
})

const press = (code, extra = {}) =>
  document.dispatchEvent(new KeyboardEvent('keydown', { code, altKey: true, bubbles: true, cancelable: true, ...extra }))

beforeEach(() => {
  vi.clearAllMocks()
  stubMatchMedia(false)
  entries.getEntries.mockResolvedValue([entry])
  drawings.getDrawings.mockResolvedValue([{ id: 'd1', title: 'Sketch', data: '' }])
  todos.getTodos.mockResolvedValue([{ id: 't1', title: 'A', done: 0 }, { id: 't2', title: 'B', done: 1 }])
  snippets.getSnippets.mockResolvedValue([{ id: 's1', title: 'Fib', code: '', language: 'javascript' }])
})

describe('start-up', () => {
  it('opens the notebook with its two pages', async () => {
    const wrapper = await mountApp()

    expect(wrapper.find('.book').attributes('data-tool')).toBe('notebook')
    expect(wrapper.findAll('.pg-head h2').map(h => h.text())).toEqual(['Today', 'Entries'])
    expect(wrapper.find('.stub-EntryEditor').exists()).toBe(true)
    expect(wrapper.find('.stub-EntryPreview').exists()).toBe(true)
  })

  it('loads all four collections once', async () => {
    await mountApp()
    for (const call of [entries.getEntries, drawings.getDrawings, todos.getTodos, snippets.getSnippets]) {
      expect(call).toHaveBeenCalledTimes(1)
    }
  })

  it('shows a loading skeleton until the data has arrived', async () => {
    let release
    entries.getEntries.mockReturnValue(new Promise(resolve => { release = () => resolve([entry]) }))

    const wrapper = mount(App, { global: { plugins: [createPinia()] }, attachTo: document.body })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.find('.skeleton').exists()).toBe(true)

    release()
    await flushPromises()
    expect(wrapper.find('.skeleton').exists()).toBe(false)
  })

  it('shows the date and the number of entries in the page headers', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('.pg-sub').text()).toMatch(/\w+, \w+ \d+/)
    expect(wrapper.findAll('.pg-sub')[1].text()).toBe('1 entry')
  })

  it('has a save status region', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('.save[role="status"]').exists()).toBe(true)
  })
})

describe('tabs', () => {
  it('has one labelled tab per tool, and the notebook is current', async () => {
    const wrapper = await mountApp()
    const tabs = wrapper.findAll('.tab')

    expect(tabs.map(t => t.attributes('aria-label'))).toEqual(['Notebook', 'Drawing', 'Todos', 'Code'])
    expect(tabs[0].attributes('aria-current')).toBe('page')
    expect(tabs[1].attributes('aria-current')).toBeUndefined()
  })

  it('switches the tool, its pages and its accent when a tab is clicked', async () => {
    const wrapper = await mountApp()
    await wrapper.findAll('.tab')[2].trigger('click')

    expect(wrapper.find('.book').attributes('data-tool')).toBe('todo')
    expect(wrapper.findAll('.pg-head h2').map(h => h.text())).toEqual(['To do', 'Progress'])
    expect(wrapper.find('.stub-TodoEditor').exists()).toBe(true)
    expect(wrapper.find('.stub-EntryEditor').exists()).toBe(false)
  })

  it('shows the counts of the current tool', async () => {
    const wrapper = await mountApp()
    await wrapper.findAll('.tab')[2].trigger('click')
    expect(wrapper.findAll('.pg-sub')[1].text()).toBe('1 open')
  })

  it('gives every tab a tooltip with its shortcut, except the current one', async () => {
    const wrapper = await mountApp()
    const tips = wrapper.findAll('.tip').map(t => t.text())

    expect(tips).toEqual(['Drawing · Alt+2', 'Todos · Alt+3', 'Code · Alt+4'])
  })

  it('declares the shortcut for assistive technology', async () => {
    const wrapper = await mountApp()
    expect(wrapper.findAll('.tab').map(t => t.attributes('aria-keyshortcuts'))).toEqual(['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4'])
  })
})

describe('keyboard shortcuts', () => {
  it.each([
    ['Digit1', 'notebook'], ['Digit2', 'drawing'], ['Digit3', 'todo'], ['Digit4', 'code']
  ])('Alt+%s opens %s', async (code, tool) => {
    const wrapper = await mountApp()
    press(code)
    await flushPromises()
    expect(wrapper.find('.book').attributes('data-tool')).toBe(tool)
  })

  it('prevents the browser default for a handled shortcut', async () => {
    await mountApp()
    const event = new KeyboardEvent('keydown', { code: 'Digit2', altKey: true, cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores the digits without Alt, so typing is not affected', async () => {
    const wrapper = await mountApp()
    press('Digit2', { altKey: false })
    await flushPromises()
    expect(wrapper.find('.book').attributes('data-tool')).toBe('notebook')
  })

  it('leaves Ctrl+Alt and Meta combinations to the system', async () => {
    const wrapper = await mountApp()
    press('Digit2', { ctrlKey: true })
    press('Digit3', { metaKey: true })
    await flushPromises()
    expect(wrapper.find('.book').attributes('data-tool')).toBe('notebook')
  })

  it('Alt+N creates an entry in the notebook', async () => {
    entries.createEntry.mockResolvedValue({ ...entry, id: 'new', title: 'Entry 2' })
    await mountApp()

    press('KeyN')
    await flushPromises()
    expect(entries.createEntry).toHaveBeenCalledTimes(1)
  })

  it('Alt+N creates a snippet in the code tool', async () => {
    snippets.createSnippet.mockResolvedValue({ id: 'new', title: 'Snippet 2', code: '', language: 'javascript' })
    await mountApp()
    press('Digit4')
    await flushPromises()

    press('KeyN')
    await flushPromises()
    expect(snippets.createSnippet).toHaveBeenCalledTimes(1)
    expect(entries.createEntry).not.toHaveBeenCalled()
  })

  it('stops listening when the app is removed', async () => {
    const wrapper = await mountApp()
    wrapper.unmount()
    press('KeyN')
    await flushPromises()
    expect(entries.createEntry).not.toHaveBeenCalled()
  })
})

describe('empty states', () => {
  it('invites the user to write a first entry when there are none', async () => {
    entries.getEntries.mockResolvedValue([])
    const wrapper = await mountApp()

    expect(wrapper.find('.empty-state h3').text()).toBe('Your first page is waiting')
    expect(wrapper.find('.stub-EntryEditor').exists()).toBe(false)
    expect(wrapper.findAll('.pg-sub')[1].text()).toBe('0 entries')
  })

  it('creates the first entry from the empty state', async () => {
    entries.getEntries.mockResolvedValue([])
    entries.createEntry.mockResolvedValue({ ...entry, id: 'first' })
    const wrapper = await mountApp()

    await wrapper.find('.empty-state button').trigger('click')
    await flushPromises()

    expect(entries.createEntry).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.empty-state').exists()).toBe(false)
    expect(wrapper.find('.stub-EntryEditor').exists()).toBe(true)
  })

  it.each([
    [1, drawings, 'getDrawings', 'Start your first sketch'],
    [3, snippets, 'getSnippets', 'Save your first snippet']
  ])('tab %i shows its own empty state', async (index, service, method, headline) => {
    service[method].mockResolvedValue([])
    const wrapper = await mountApp()
    await wrapper.findAll('.tab')[index].trigger('click')

    expect(wrapper.find('.empty-state h3').text()).toBe(headline)
  })

  it('does not replace the todo editor, which already invites input', async () => {
    todos.getTodos.mockResolvedValue([])
    const wrapper = await mountApp()
    await wrapper.findAll('.tab')[2].trigger('click')

    expect(wrapper.find('.empty-state').exists()).toBe(false)
    expect(wrapper.find('.stub-TodoEditor').exists()).toBe(true)
  })
})

describe('server errors', () => {
  it('explains the problem and offers to try again', async () => {
    entries.getEntries.mockRejectedValue(new TypeError('Failed to fetch'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = await mountApp()

    const banner = wrapper.find('.load-error')
    expect(banner.attributes('role')).toBe('alert')
    expect(banner.text()).toContain("Can't reach the server")
    expect(banner.text()).toContain('npm start')
    expect(wrapper.find('.pg-note').text()).toContain('Nothing to show')
  })

  it('loads again and removes the banner when Try again works', async () => {
    entries.getEntries.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = await mountApp()

    await wrapper.find('.load-error button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.load-error').exists()).toBe(false)
    expect(wrapper.find('.stub-EntryEditor').exists()).toBe(true)
  })
})

describe('appearance settings', () => {
  it('switches to night mode and remembers it', async () => {
    const wrapper = await mountApp()
    await wrapper.find('.switch input').setValue(true)

    expect(wrapper.find('.layout').classes()).toContain('dark')
    expect(JSON.parse(localStorage.getItem('organizeme-ui')).dark).toBe(true)
  })

  it('starts in night mode when it was saved', async () => {
    localStorage.setItem('organizeme-ui', JSON.stringify({ dark: true }))
    const wrapper = await mountApp()
    expect(wrapper.find('.layout').classes()).toContain('dark')
  })

  it('switches the entry text between handwriting and easy-read', async () => {
    const wrapper = await mountApp()
    const [handwriting, easy] = wrapper.findAll('.topbar-controls .seg button')

    expect(handwriting.attributes('aria-pressed')).toBe('true')
    await easy.trigger('click')

    expect(wrapper.find('.layout').classes()).toContain('easy')
    expect(easy.attributes('aria-pressed')).toBe('true')
    expect(handwriting.attributes('aria-pressed')).toBe('false')
    expect(JSON.parse(localStorage.getItem('organizeme-ui')).easyRead).toBe(true)

    await handwriting.trigger('click')
    expect(wrapper.find('.layout').classes()).not.toContain('easy')
  })

  it('remembers the active tool for the next visit', async () => {
    const wrapper = await mountApp()
    await wrapper.findAll('.tab')[3].trigger('click')
    expect(JSON.parse(localStorage.getItem('organizeme-ui')).tool).toBe('code')

    wrapper.unmount()
    const next = await mountApp()
    expect(next.find('.book').attributes('data-tool')).toBe('code')
  })

  it('ignores a saved tool that does not exist', async () => {
    localStorage.setItem('organizeme-ui', JSON.stringify({ tool: 'removed-tool' }))
    const wrapper = await mountApp()
    expect(wrapper.find('.book').attributes('data-tool')).toBe('notebook')
  })

  it('works when the browser blocks local storage', async () => {
    // Private windows and strict privacy settings make every read and write throw
    const blocked = () => { throw new DOMException('blocked', 'SecurityError') }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)

    const wrapper = await mountApp()
    await wrapper.findAll('.tab')[2].trigger('click')
    await wrapper.find('.switch input').setValue(true)

    expect(wrapper.find('.book').attributes('data-tool')).toBe('todo')
    expect(wrapper.find('.layout').classes()).toContain('dark')
    vi.restoreAllMocks()
  })

  it('survives broken saved settings', async () => {
    localStorage.setItem('organizeme-ui', '{not json')
    const wrapper = await mountApp()
    expect(wrapper.find('.book').attributes('data-tool')).toBe('notebook')
  })
})

describe('book size', () => {
  it('starts at the minimum size when the window has no room to measure', async () => {
    const wrapper = await mountApp()
    const style = wrapper.find('.book').attributes('style')
    expect(style).toContain('width: 760px')
    expect(style).toContain('height: 480px')
  })

  it('restores the saved size', async () => {
    localStorage.setItem('organizeme-ui', JSON.stringify({ w: 1200, h: 700 }))
    const wrapper = await mountApp()
    const style = wrapper.find('.book').attributes('style')
    expect(style).toContain('width: 1200px')
    expect(style).toContain('height: 700px')
  })

  it('has a resize handle with a hint', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('.grip').attributes('title')).toContain('Drag to resize')
  })

  it('fits the window again on a double click', async () => {
    localStorage.setItem('organizeme-ui', JSON.stringify({ w: 2000, h: 1500 }))
    const wrapper = await mountApp()
    await wrapper.find('.grip').trigger('dblclick')

    const style = wrapper.find('.book').attributes('style')
    expect(style).toContain('width: 760px')
    expect(style).toContain('height: 480px')
  })
})

describe('narrow screens', () => {
  beforeEach(() => stubMatchMedia(true))

  it('shows one page at a time with a switch between them', async () => {
    const wrapper = await mountApp()
    const pages = wrapper.findAll('.pg')

    expect(wrapper.find('.layout').classes()).toContain('narrow')
    expect(wrapper.find('.page-switch').exists()).toBe(true)
    expect(pages[0].isVisible()).toBe(true)
    expect(pages[1].isVisible()).toBe(false)
  })

  it('names the pages after the current tool', async () => {
    const wrapper = await mountApp()
    expect(wrapper.findAll('.page-switch button').map(b => b.text())).toEqual(['Write', 'Entries'])
  })

  it('switches to the list page', async () => {
    const wrapper = await mountApp()
    await wrapper.findAll('.page-switch button')[1].trigger('click')

    const pages = wrapper.findAll('.pg')
    expect(pages[0].isVisible()).toBe(false)
    expect(pages[1].isVisible()).toBe(true)
    expect(wrapper.findAll('.page-switch button')[1].attributes('aria-pressed')).toBe('true')
  })

  it('goes back to the writing page when the tool changes', async () => {
    const wrapper = await mountApp()
    await wrapper.findAll('.page-switch button')[1].trigger('click')
    await wrapper.findAll('.tab')[1].trigger('click')

    expect(wrapper.findAll('.pg')[0].isVisible()).toBe(true)
  })

  it('has no resize handle, because the book fills the screen', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('.grip').exists()).toBe(false)
    expect(wrapper.find('.book').attributes('style')).toBeUndefined()
  })

  it('has no tooltips, because the tabs carry labels', async () => {
    const wrapper = await mountApp()
    expect(wrapper.findAll('.tab-label')).toHaveLength(4)
  })

  it('reacts when the window is resized across the breakpoint', async () => {
    const mql = stubMatchMedia(false)
    const wrapper = await mountApp()
    expect(wrapper.find('.page-switch').exists()).toBe(false)

    mql.change(true)
    await flushPromises()
    expect(wrapper.find('.page-switch').exists()).toBe(true)

    mql.change(false)
    await flushPromises()
    expect(wrapper.find('.page-switch').exists()).toBe(false)
  })
})
