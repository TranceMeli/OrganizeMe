import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

// Monaco needs a real browser, so it is replaced by a small fake that records the calls the
// component makes. The real editor is covered by the end-to-end tests.
const monaco = vi.hoisted(() => {
  const state = { instance: null, createOptions: null, listeners: [], theme: null, language: null }
  return {
    state,
    api: {
      editor: {
        defineTheme: vi.fn((name, definition) => { state.theme = { name, definition } }),
        setModelLanguage: vi.fn((_model, language) => { state.language = language }),
        create: vi.fn((element, options) => {
          state.createOptions = options
          state.listeners = []
          let value = options.value
          state.instance = {
            element,
            getValue: () => value,
            // Like Monaco, setValue reports a content change
            setValue: vi.fn((next) => { value = next; state.listeners.forEach(fn => fn()) }),
            getModel: () => ({ id: 'model' }),
            onDidChangeModelContent: (fn) => state.listeners.push(fn),
            type(next) { value = next; state.listeners.forEach(fn => fn()) },
            dispose: vi.fn()
          }
          return state.instance
        })
      }
    }
  }
})
vi.mock('monaco-editor', () => monaco.api)
// The worker import only works in a bundler, and the fake editor needs no worker
vi.mock('@/modules/code/monacoEnvironment', () => ({}))

vi.mock('@/modules/code/services/codeService', () => ({
  getSnippets: vi.fn(), createSnippet: vi.fn(), updateSnippet: vi.fn(), deleteSnippet: vi.fn()
}))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import * as service from '@/modules/code/services/codeService'
import { confirmDialog } from '@/composables/useDialog'
import { useCodeStore } from '@/modules/code/stores/codeStore'
import CodeEditor from '@/modules/code/components/CodeEditor.vue'
import CodePreview from '@/modules/code/components/CodePreview.vue'

const snippet = (id, extra = {}) => ({
  id, title: `Snippet ${id}`, code: `const ${id} = 1`, language: 'javascript', created_at: '2026-11-17 10:00:00', ...extra
})

let pinia
let store

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  store = useCodeStore()
  service.updateSnippet.mockResolvedValue()
})

afterEach(() => vi.useRealTimers())

function setup(snippets) {
  store.snippets = snippets
  store.activeId = snippets[0]?.id ?? null
  store.loaded = true
}

const mountEditor = () => mount(CodeEditor, { global: { plugins: [pinia] }, attachTo: document.body })
const mountPreview = () => mount(CodePreview, { global: { plugins: [pinia] } })

describe('CodeEditor', () => {
  it('opens the active snippet in the editor with its language', () => {
    setup([snippet('a', { code: 'let x', language: 'python' })])
    mountEditor()

    expect(monaco.state.createOptions).toMatchObject({ value: 'let x', language: 'python', theme: 'organizeme-dark' })
    expect(monaco.state.instance.element).toBeInstanceOf(HTMLElement)
  })

  it('falls back to an empty JavaScript editor when nothing is selected', () => {
    setup([])
    mountEditor()
    expect(monaco.state.createOptions).toMatchObject({ value: '', language: 'javascript' })
  })

  it('defines a dark theme whose comments meet the contrast target', () => {
    setup([snippet('a')])
    mountEditor()

    const { name, definition } = monaco.state.theme
    expect(name).toBe('organizeme-dark')
    expect(definition.base).toBe('vs-dark')
    expect(definition.rules).toContainEqual({ token: 'comment', foreground: '7FB069' })
  })

  it('wraps long lines and hides the minimap', () => {
    setup([snippet('a')])
    mountEditor()
    expect(monaco.state.createOptions).toMatchObject({ wordWrap: 'on', minimap: { enabled: false }, automaticLayout: true })
  })

  it('saves the code that is typed after the delay', async () => {
    setup([snippet('a')])
    mountEditor()

    monaco.state.instance.type('const a = 2')
    expect(store.activeSnippet.code).toBe('const a = 2')
    expect(service.updateSnippet).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', code: 'const a = 2' }))
  })

  it('loads another snippet into the editor without saving it as an edit', async () => {
    setup([snippet('a'), snippet('b', { code: 'print(1)', language: 'python' })])
    mountEditor()

    store.setActive('b')
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)

    expect(monaco.state.instance.setValue).toHaveBeenCalledWith('print(1)')
    expect(monaco.api.editor.setModelLanguage).toHaveBeenCalledWith(expect.anything(), 'python')
    expect(service.updateSnippet).not.toHaveBeenCalled()
  })

  it('still saves edits made after switching snippets', async () => {
    setup([snippet('a'), snippet('b')])
    mountEditor()
    store.setActive('b')
    await nextTick()

    monaco.state.instance.type('changed')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', code: 'changed' }))
  })

  it('shows the title and lets the user change it', async () => {
    setup([snippet('a')])
    const wrapper = mountEditor()
    const input = wrapper.find('.title-input')

    expect(input.element.value).toBe('Snippet a')
    expect(input.attributes('aria-label')).toBe('Snippet title')

    await input.setValue('Renamed')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ title: 'Renamed' }))
  })

  it('offers the ten languages and saves the chosen one', async () => {
    setup([snippet('a')])
    const wrapper = mountEditor()
    const select = wrapper.find('.lang-select')

    expect(select.attributes('aria-label')).toBe('Language')
    expect(select.findAll('option')).toHaveLength(10)

    await select.setValue('sql')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateSnippet).toHaveBeenCalledWith(expect.objectContaining({ language: 'sql' }))
  })

  it('switches the highlighting when the language changes', async () => {
    setup([snippet('a')])
    mountEditor()

    store.updateLanguage('typescript')
    await nextTick()
    expect(monaco.state.language).toBe('typescript')
  })

  it('creates a snippet with New and asks before deleting', async () => {
    setup([snippet('a')])
    service.createSnippet.mockResolvedValue(snippet('n'))
    confirmDialog.mockResolvedValue(false)
    const wrapper = mountEditor()

    await wrapper.find('.btn-new').trigger('click')
    expect(service.createSnippet).toHaveBeenCalledTimes(1)

    await wrapper.find('button[aria-label="Delete"]').trigger('click')
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete snippet?' }))
  })

  it('releases the editor when the page is left', () => {
    setup([snippet('a')])
    const wrapper = mountEditor()
    wrapper.unmount()
    expect(monaco.state.instance.dispose).toHaveBeenCalledTimes(1)
  })
})

describe('CodePreview', () => {
  it('highlights the code of the active snippet', () => {
    setup([snippet('a', { code: 'function f() { return 1 }' })])
    const wrapper = mountPreview()

    expect(wrapper.find('.code-preview code .hljs-keyword').exists()).toBe(true)
    expect(wrapper.find('.code-preview').text()).toContain('function f()')
  })

  it('shows the language and the date', () => {
    setup([snippet('a', { language: 'python' })])
    const wrapper = mountPreview()

    expect(wrapper.find('.lang-badge').text()).toBe('python')
    expect(wrapper.find('.datum').text()).toBe('Tuesday, 11/17/2026')
  })

  it('still shows the code when the language is one the highlighter does not know', () => {
    setup([snippet('a', { code: 'plain words here', language: 'klingon' })])
    const wrapper = mountPreview()

    expect(wrapper.find('.code-preview').text()).toContain('plain words here')
  })

  it('escapes HTML inside code instead of running it', () => {
    setup([snippet('a', { code: '<img src=x onerror="alert(1)">', language: 'html' })])
    const wrapper = mountPreview()

    expect(wrapper.find('.code-preview img').exists()).toBe(false)
    expect(wrapper.find('.code-preview').text()).toContain('<img')
  })

  it('says so when a snippet has no code', () => {
    setup([snippet('a', { code: '' })])
    const wrapper = mountPreview()

    expect(wrapper.find('.code-preview').exists()).toBe(false)
    expect(wrapper.text()).toContain('No code yet')
  })

  it('selects a snippet from the list', async () => {
    setup([snippet('a'), snippet('b', { code: 'let b' })])
    const wrapper = mountPreview()

    await wrapper.findAll('.item')[1].trigger('click')
    expect(store.activeId).toBe('b')
    expect(wrapper.find('.code-preview').text()).toContain('let b')
  })
})
