import { API_BASE } from '@/config'

const API = `${API_BASE}/snippets`

export async function getSnippets() {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function createSnippet(snippet) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snippet)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function updateSnippet(snippet) {
  const res = await fetch(`${API}/${snippet.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snippet)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteSnippet(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}