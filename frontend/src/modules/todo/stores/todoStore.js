import { defineStore } from 'pinia'
import {
  getTodos,
  createTodo as apiCreate,
  updateTodo as apiUpdate,
  deleteTodo as apiDelete
} from '../services/todoService'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    loaded: false
  }),

  getters: {
    openTodos:  (state) => state.todos.filter(t => !t.done),
    doneTodos:  (state) => state.todos.filter(t => t.done)
  },

  actions: {
    async fetchTodos() {
      const data = await getTodos()
      this.todos = data
      this.loaded = true
    },

    async createTodo(title) {
      if (!title?.trim()) return
      const saved = await apiCreate({ title: title.trim() })
      this.todos.unshift(saved)
    },

    async toggleDone(id) {
      const todo = this.todos.find(t => t.id === id)
      if (!todo) return
      todo.done = !todo.done
      await apiUpdate(todo)
    },

    async updateTitle(id, title) {
      const todo = this.todos.find(t => t.id === id)
      if (!todo) return
      todo.title = title
      await apiUpdate(todo)
    },

    async deleteTodo(id) {
      const ok = window.confirm('Delete this todo?')
      if (!ok) return
      await apiDelete(id)
      this.todos = this.todos.filter(t => t.id !== id)
    }
  }
})