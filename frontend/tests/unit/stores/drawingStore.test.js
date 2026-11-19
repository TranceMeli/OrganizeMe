import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/modules/drawing/services/drawingService', () => ({
  getDrawings: vi.fn(),
  createDrawing: vi.fn(),
  updateDrawing: vi.fn(),
  deleteDrawing: vi.fn()
}))
vi.mock('@/composables/useDialog', () => ({ confirmDialog: vi.fn() }))

import * as service from '@/modules/drawing/services/drawingService'
import { confirmDialog } from '@/composables/useDialog'
import { useDrawingStore } from '@/modules/drawing/stores/drawingStore'

const drawing = (id) => ({ id, title: `Drawing ${id}`, data: '' })

let store

beforeEach(async () => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  store = useDrawingStore()
  service.getDrawings.mockResolvedValue([drawing('a'), drawing('b')])
  service.updateDrawing.mockResolvedValue()
  await store.fetchDrawings()
})

afterEach(() => vi.useRealTimers())

describe('loading and creating', () => {
  it('selects the first drawing after loading', () => {
    expect(store.activeId).toBe('a')
    expect(store.activeDrawing.id).toBe('a')
    expect(store.loaded).toBe(true)
  })

  it('selects nothing for an empty gallery', async () => {
    service.getDrawings.mockResolvedValue([])
    await store.fetchDrawings()
    expect(store.activeId).toBeNull()
  })

  it('creates a numbered empty drawing and selects it', async () => {
    service.createDrawing.mockResolvedValue(drawing('new'))
    await store.createDrawing()

    expect(service.createDrawing).toHaveBeenCalledWith({ title: 'Drawing 3', data: '' })
    expect(store.drawings[0].id).toBe('new')
    expect(store.activeId).toBe('new')
  })
})

describe('saveData', () => {
  it('keeps the new image at once and saves it after 800 ms', async () => {
    store.saveData('data:image/png;base64,AAA')
    expect(store.activeDrawing.data).toBe('data:image/png;base64,AAA')
    expect(service.updateDrawing).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateDrawing).toHaveBeenCalledWith({ id: 'a', title: 'Drawing a', data: 'data:image/png;base64,AAA' })
  })

  it('saves only the last image of a series of strokes', async () => {
    store.saveData('one')
    store.saveData('two')
    store.saveData('three')
    await vi.advanceTimersByTimeAsync(800)

    expect(service.updateDrawing).toHaveBeenCalledTimes(1)
    expect(service.updateDrawing.mock.calls[0][0].data).toBe('three')
  })

  it('does not drop the pending save of a drawing when another one is selected', async () => {
    store.saveData('for a')
    store.setActive('b')
    store.saveData('for b')
    await vi.advanceTimersByTimeAsync(800)

    const saved = service.updateDrawing.mock.calls.map(([d]) => [d.id, d.data])
    expect(saved).toEqual(expect.arrayContaining([['a', 'for a'], ['b', 'for b']]))
  })

  it('does nothing without a selected drawing', async () => {
    store.activeId = null
    store.saveData('x')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateDrawing).not.toHaveBeenCalled()
  })

  it('saves an empty string when the canvas is cleared', async () => {
    store.saveData('')
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateDrawing.mock.calls[0][0].data).toBe('')
  })
})

describe('deleteDrawing', () => {
  it('keeps the drawing when the user cancels', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteDrawing('a')

    expect(service.deleteDrawing).not.toHaveBeenCalled()
    expect(store.drawings).toHaveLength(2)
  })

  it('removes the drawing and selects the first remaining one', async () => {
    confirmDialog.mockResolvedValue(true)
    service.deleteDrawing.mockResolvedValue()
    await store.deleteDrawing('a')

    expect(store.drawings.map(d => d.id)).toEqual(['b'])
    expect(store.activeId).toBe('b')
  })

  it('names the drawing in the dialog', async () => {
    confirmDialog.mockResolvedValue(false)
    await store.deleteDrawing('b')
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Drawing b') }))
  })
})
