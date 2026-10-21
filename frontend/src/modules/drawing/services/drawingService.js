import { API_BASE } from '@/config'

const API = `${API_BASE}/drawings`

export async function getDrawings() {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function createDrawing(drawing) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drawing)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function updateDrawing(drawing) {
  const res = await fetch(`${API}/${drawing.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drawing)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteDrawing(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}