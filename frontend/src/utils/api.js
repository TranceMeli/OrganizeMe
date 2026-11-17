import { API_BASE } from '@/config'
import { trackSave } from '@/composables/useSaveStatus'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`${method} ${path} failed with HTTP ${res.status}`)
  // The backend answers PUT and DELETE with { success: true }, which no caller needs
  return method === 'GET' || method === 'POST' ? res.json() : undefined
}

// Reads are not tracked: the app shows its own error state when loading fails.
export function api(path, options = {}) {
  const method = options.method || 'GET'
  if (method === 'GET') return request(path, options)
  return trackSave(`${method} ${path}`, () => request(path, options), { retryable: method === 'PUT' })
}

/** CRUD calls for one backend collection, e.g. resource('todos'). */
export function resource(name) {
  return {
    list: () => api(`/${name}`),
    create: (item) => api(`/${name}`, { method: 'POST', body: item }),
    update: (item) => api(`/${name}/${item.id}`, { method: 'PUT', body: item }),
    remove: (id) => api(`/${name}/${id}`, { method: 'DELETE' })
  }
}
