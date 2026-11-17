import { resource } from '@/utils/api'

const todos = resource('todos')

export const getTodos = todos.list
export const createTodo = todos.create
export const updateTodo = todos.update
export const deleteTodo = todos.remove
