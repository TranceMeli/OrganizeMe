import { API_BASE } from '@/config'

const API = `${API_BASE}/entries`

export async function getEntries() {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function createEntry(entry) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function updateEntry(entry) {
  const res = await fetch(`${API}/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteEntry(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}