import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const todo = (id, done = 0) => ({ id, title: `Todo ${id}`, done })

let store

beforeEach(async () => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  store = useTodoStore()
  service.getTodos.mockResolvedValue([todo('a', 0), todo('b', 1), todo('c', 0)])
  service.updateTodo.mockResolvedValue()
  await store.fetchTodos()
})

describe('getters', () => {
  it('splits todos into open and done', () => {
    expect(store.openTodos.map(t => t.id)).toEqual(['a', 'c'])
    expect(store.doneTodos.map(t => t.id)).toEqual(['b'])
  })

  it('is loaded after fetching', () => {
    expect(store.loaded).toBe(true)
  })
})

describe('createTodo', () => {
  it('trims the title and puts the new todo first', async () => {
    service.createTodo.mockResolvedValue(todo('new'))
    await store.createTodo('  Water plants  ')

    expect(service.createTodo).toHaveBeenCalledWith({ title: 'Water plants' })
    expect(store.todos[0].id).toBe('new')
  })

  it.each([['an empty title', ''], ['only spaces', '   '], ['undefined', undefined]])(
    'ignores %s', async (_label, title) => {
      await store.createTodo(title)
      expect(service.createTodo).not.toHaveBeenCalled()
    }
  )
})

describe('toggleDone', () => {
  it('flips the flag and saves the whole todo', async () => {
    await store.toggleDone('a')

    expect(store.todos.find(t => t.id === 'a').done).toBe(true)
    expect(service.updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', done: true }))
  })

  it('moves a done todo back to open', async () => {
    await store.toggleDone('b')
    expect(store.openTodos.map(t => t.id)).toContain('b')
  })

  it('flips at once, before the request has finished', async () => {
    let finish
    service.updateTodo.mockReturnValue(new Promise(resolve => { finish = resolve }))

    const pending = store.toggleDone('a')
    expect(store.todos.find(t => t.id === 'a').done).toBe(true)

    finish()
    await pending
  })

  it('ignores an unknown id', async () => {
    await store.toggleDone('missing')
    expect(service.updateTodo).not.toHaveBeenCalled()
  })
})

describe('updateTitle', () => {
  it('renames and saves', async () => {
    await store.updateTitle('a', 'Renamed')
    expect(store.todos.find(t => t.id === 'a').title).toBe('Renamed')
    expect(service.updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', title: 'Renamed' }))
  })

  it('ignores an unknown id', async () => {
    await store.updateTitle('missing', 'x')
    expect(service.updateTodo).not.toHaveBeenCalled()
  })
})

describe('deleteTodo', () => {
  it('asks first and names the todo', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteTodo('a')
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Todo a') }))
  })

  it('keeps the todo when the user cancels', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteTodo('a')

    expect(service.deleteTodo).not.toHaveBeenCalled()
    expect(store.todos).toHaveLength(3)
  })

  it('removes the todo when confirmed', async () => {
    confirmDialog.mockResolvedValue(true)
    service.deleteTodo.mockResolvedValue()
    await store.deleteTodo('a')

    expect(service.deleteTodo).toHaveBeenCalledWith('a')
    expect(store.todos.map(t => t.id)).toEqual(['b', 'c'])
  })
})
