import { API_BASE } from '@/config'

const API = `${API_BASE}/todos`

export async function getTodos() {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function createTodo(todo) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function updateTodo(todo) {
  const res = await fetch(`${API}/${todo.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteTodo(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}