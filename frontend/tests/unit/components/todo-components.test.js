import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/modules/todo/services/todoService', () => ({
  getTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn()
}))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import * as service from '@/modules/todo/services/todoService'
import { confirmDialog } from '@/composables/useDialog'
import { useTodoStore } from '@/modules/todo/stores/todoStore'
import TodoEditor from '@/modules/todo/components/TodoEditor.vue'
import TodoPreview from '@/modules/todo/components/TodoPreview.vue'

let pinia
let store

function setup(todos) {
  pinia = createPinia()
  setActivePinia(pinia)
  store = useTodoStore()
  store.todos = todos
  store.loaded = true
}

const mountEditor = () => mount(TodoEditor, { global: { plugins: [pinia] } })
const mountPreview = () => mount(TodoPreview, { global: { plugins: [pinia] } })

const todos = () => [
  { id: 'a', title: 'Water the plants', done: 0 },
  { id: 'b', title: 'Pay the rent', done: 1 },
  { id: 'c', title: 'Call mum', done: 0 }
]

beforeEach(() => {
  vi.clearAllMocks()
  service.updateTodo.mockResolvedValue()
})

describe('TodoEditor', () => {
  it('lists open and done todos in separate sections', () => {
    setup(todos())
    const wrapper = mountEditor()
    const sections = wrapper.findAll('.section')

    expect(sections[0].find('.section-label').text()).toBe('Open')
    expect(sections[0].findAll('.todo-item')).toHaveLength(2)
    expect(sections[1].find('.section-label').text()).toBe('Done')
    expect(sections[1].findAll('.todo-item')).toHaveLength(1)
  })

  it('shows the title of every todo in an editable field', () => {
    setup(todos())
    const titles = mountEditor().findAll('.todo-title').map(i => i.element.value)
    expect(titles).toEqual(['Water the plants', 'Call mum', 'Pay the rent'])
  })

  it('marks done todos with a checked box', () => {
    setup(todos())
    const wrapper = mountEditor()
    const doneItem = wrapper.find('.todo-item.done')
    expect(doneItem.find('.checkbox').element.checked).toBe(true)
  })

  it('says so when a section is empty', () => {
    setup([])
    const text = mountEditor().text()
    expect(text).toContain('No open todos')
    expect(text).toContain('Nothing done yet')
  })

  it('adds a todo with Enter and clears the field', async () => {
    setup([])
    service.createTodo.mockResolvedValue({ id: 'n', title: 'New one', done: 0 })
    const wrapper = mountEditor()

    await wrapper.find('.new-input').setValue('New one')
    await wrapper.find('.new-input').trigger('keydown.enter')
    await vi.waitFor(() => expect(wrapper.find('.new-input').element.value).toBe(''))

    expect(service.createTodo).toHaveBeenCalledWith({ title: 'New one' })
    expect(store.todos[0].title).toBe('New one')
  })

  it('adds a todo with the plus button', async () => {
    setup([])
    service.createTodo.mockResolvedValue({ id: 'n', title: 'Via button', done: 0 })
    const wrapper = mountEditor()

    await wrapper.find('.new-input').setValue('Via button')
    await wrapper.find('.add-btn').trigger('click')

    expect(service.createTodo).toHaveBeenCalledWith({ title: 'Via button' })
  })

  it('does not add an empty todo', async () => {
    setup([])
    const wrapper = mountEditor()
    await wrapper.find('.new-input').setValue('   ')
    await wrapper.find('.add-btn').trigger('click')
    expect(service.createTodo).not.toHaveBeenCalled()
  })

  it('toggles a todo with its checkbox', async () => {
    setup(todos())
    const wrapper = mountEditor()
    await wrapper.find('.todo-item .checkbox').trigger('change')

    expect(service.updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', done: true }))
  })

  it('renames a todo when the field changes', async () => {
    setup(todos())
    const wrapper = mountEditor()
    const input = wrapper.find('.todo-title')

    input.element.value = 'Water the cactus'
    await input.trigger('change')

    expect(service.updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', title: 'Water the cactus' }))
  })

  it('asks before deleting and removes the todo when confirmed', async () => {
    setup(todos())
    confirmDialog.mockResolvedValue(true)
    service.deleteTodo.mockResolvedValue()
    const wrapper = mountEditor()

    await wrapper.find('.todo-item button[aria-label="Delete"]').trigger('click')
    await vi.waitFor(() => expect(service.deleteTodo).toHaveBeenCalledWith('a'))
    expect(confirmDialog).toHaveBeenCalledTimes(1)
  })

  it('names every checkbox and title field after its todo, for screen readers', () => {
    setup(todos())
    const wrapper = mountEditor()

    expect(wrapper.findAll('.checkbox').map(c => c.attributes('aria-label')))
      .toEqual(['Done: Water the plants', 'Done: Call mum', 'Done: Pay the rent'])
    for (const input of wrapper.findAll('.todo-title')) expect(input.attributes('aria-label')).toBe('Todo title')
    expect(wrapper.find('.new-input').attributes('aria-label')).toBe('New todo')
  })

  it('has a named delete button for every todo', () => {
    setup(todos())
    expect(mountEditor().findAll('.todo-item button[aria-label="Delete"]')).toHaveLength(3)
  })
})

describe('TodoPreview', () => {
  it('shows how many todos are done', () => {
    setup(todos())
    const wrapper = mountPreview()
    expect(wrapper.find('.progress-label').text()).toBe('1 of 3 done')
    expect(wrapper.find('.progress-percent').text()).toBe('33%')
  })

  it('draws the progress bar with the matching width', () => {
    setup(todos())
    expect(mountPreview().find('.progress-fill').attributes('style')).toContain('width: 33%')
  })

  it('shows 0 percent without dividing by zero when there are no todos', () => {
    setup([])
    const wrapper = mountPreview()
    expect(wrapper.find('.progress-label').text()).toBe('0 of 0 done')
    expect(wrapper.find('.progress-percent').text()).toBe('0%')
  })

  it('shows 100 percent when everything is done', () => {
    setup([{ id: 'a', title: 'x', done: 1 }])
    expect(mountPreview().find('.progress-percent').text()).toBe('100%')
  })

  it('counts the open and done todos in the section labels', () => {
    setup(todos())
    const labels = mountPreview().findAll('.section-label').map(l => l.text())
    expect(labels).toEqual(['Open (2)', 'Done (1)'])
  })

  it('lists the todos and strikes through the done ones', () => {
    setup(todos())
    const wrapper = mountPreview()
    expect(wrapper.findAll('.preview-item')).toHaveLength(3)
    expect(wrapper.find('.preview-item.done').text()).toBe('Pay the rent')
  })

  it('celebrates when nothing is open', () => {
    setup([{ id: 'a', title: 'x', done: 1 }])
    expect(mountPreview().text()).toContain('All done!')
  })

  it('says so when nothing is done yet', () => {
    setup([{ id: 'a', title: 'x', done: 0 }])
    expect(mountPreview().text()).toContain('Nothing done yet')
  })
})
