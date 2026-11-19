import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

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
import DrawingCanvas from '@/modules/drawing/components/DrawingCanvas.vue'

// jsdom has no canvas. The 2D context is replaced by a recorder, so the tests can check what the
// component asks the browser to draw without needing real pixels.
let ctx
let resizeCallback
let observer

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()

  ctx = {
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), closePath: vi.fn(),
    clearRect: vi.fn(), drawImage: vi.fn(),
    lineWidth: 0, lineCap: '', lineJoin: '', strokeStyle: '', globalCompositeOperation: ''
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,STROKE')

  observer = { observe: vi.fn(), disconnect: vi.fn() }
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb) { resizeCallback = cb }
    observe(...args) { observer.observe(...args) }
    disconnect() { observer.disconnect() }
  })

  service.updateDrawing.mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mountCanvas(drawings = [{ id: 'a', title: 'Sketch', data: '' }]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useDrawingStore()
  store.drawings = drawings
  store.activeId = drawings[0]?.id ?? null
  store.loaded = true

  const wrapper = mount(DrawingCanvas, { global: { plugins: [pinia] }, attachTo: document.body })
  const canvas = wrapper.find('canvas')
  // Pixel position of the canvas on the page, so mouse coordinates can be turned into canvas coordinates
  canvas.element.getBoundingClientRect = () => ({ left: 10, top: 20 })
  return { wrapper, canvas, store }
}

const mouse = (clientX, clientY) => ({ clientX, clientY })

describe('tools', () => {
  it('starts with the pen selected', () => {
    const { wrapper } = mountCanvas()
    expect(wrapper.find('button[aria-label="Pen"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('button[aria-label="Eraser"]').attributes('aria-pressed')).toBe('false')
  })

  it('switches to the eraser and back', async () => {
    const { wrapper } = mountCanvas()
    await wrapper.find('button[aria-label="Eraser"]').trigger('click')

    expect(wrapper.find('button[aria-label="Eraser"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('button[aria-label="Pen"]').attributes('aria-pressed')).toBe('false')

    await wrapper.find('button[aria-label="Pen"]').trigger('click')
    expect(wrapper.find('button[aria-label="Pen"]').attributes('aria-pressed')).toBe('true')
  })

  it('offers a colour and a width with names for screen readers', () => {
    const { wrapper } = mountCanvas()
    expect(wrapper.find('input[type="color"]').attributes('aria-label')).toBe('Color')
    const width = wrapper.find('input[type="range"]')
    expect(width.attributes('aria-label')).toBe('Width')
    expect(width.attributes('min')).toBe('1')
    expect(width.attributes('max')).toBe('30')
  })

  it('shows the chosen width as a number', async () => {
    const { wrapper } = mountCanvas()
    expect(wrapper.find('.range-val').text()).toBe('4')

    await wrapper.find('input[type="range"]').setValue('12')
    expect(wrapper.find('.range-val').text()).toBe('12')
  })
})

describe('drawing', () => {
  it('starts a line at the mouse position relative to the canvas', async () => {
    const { canvas } = mountCanvas()
    await canvas.trigger('mousedown', mouse(60, 100))

    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalledWith(50, 80)
  })

  it('draws a round line in the chosen colour and width', async () => {
    const { wrapper, canvas } = mountCanvas()
    await wrapper.find('input[type="color"]').setValue('#ff0000')
    await wrapper.find('input[type="range"]').setValue('9')

    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mousemove', mouse(70, 90))

    expect(ctx.lineTo).toHaveBeenCalledWith(60, 70)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
    expect(ctx.strokeStyle).toBe('#ff0000')
    expect(Number(ctx.lineWidth)).toBe(9)
    expect(ctx.lineCap).toBe('round')
    expect(ctx.lineJoin).toBe('round')
    expect(ctx.globalCompositeOperation).toBe('source-over')
  })

  it('does not draw when the mouse moves without a pressed button', async () => {
    const { canvas } = mountCanvas()
    await canvas.trigger('mousemove', mouse(70, 90))

    expect(ctx.lineTo).not.toHaveBeenCalled()
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it('erases by cutting out ink, with a wider line than the pen', async () => {
    const { wrapper, canvas } = mountCanvas()
    await wrapper.find('input[type="range"]').setValue('5')
    await wrapper.find('button[aria-label="Eraser"]').trigger('click')

    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mousemove', mouse(70, 90))

    expect(ctx.globalCompositeOperation).toBe('destination-out')
    expect(Number(ctx.lineWidth)).toBe(20)
  })

  it('draws with the pen again after the eraser', async () => {
    const { wrapper, canvas } = mountCanvas()
    await wrapper.find('button[aria-label="Eraser"]').trigger('click')
    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mousemove', mouse(30, 40))
    await canvas.trigger('mouseup')

    await wrapper.find('button[aria-label="Pen"]').trigger('click')
    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mousemove', mouse(30, 40))
    expect(ctx.globalCompositeOperation).toBe('source-over')
  })

  it('stops drawing when the button is released', async () => {
    const { canvas } = mountCanvas()
    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mouseup')
    ctx.lineTo.mockClear()

    await canvas.trigger('mousemove', mouse(70, 90))
    expect(ctx.lineTo).not.toHaveBeenCalled()
  })

  it('treats leaving the canvas like releasing the button', async () => {
    const { canvas, store } = mountCanvas()
    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mouseleave')

    expect(ctx.closePath).toHaveBeenCalled()
    expect(store.activeDrawing.data).toBe('data:image/png;base64,STROKE')
  })
})

describe('saving', () => {
  it('stores the finished stroke as a PNG and saves it after the delay', async () => {
    const { canvas, store } = mountCanvas()
    await canvas.trigger('mousedown', mouse(20, 30))
    await canvas.trigger('mouseup')

    expect(store.activeDrawing.data).toBe('data:image/png;base64,STROKE')
    expect(service.updateDrawing).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateDrawing).toHaveBeenCalledWith({ id: 'a', title: 'Sketch', data: 'data:image/png;base64,STROKE' })
  })

  it('saves once for several strokes in a row', async () => {
    const { canvas } = mountCanvas()
    for (let i = 0; i < 3; i++) {
      await canvas.trigger('mousedown', mouse(20, 30))
      await canvas.trigger('mouseup')
    }
    await vi.advanceTimersByTimeAsync(800)
    expect(service.updateDrawing).toHaveBeenCalledTimes(1)
  })

  it('ignores a release without a stroke', async () => {
    const { canvas } = mountCanvas()
    await canvas.trigger('mouseup')
    expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled()
  })
})

describe('clearing', () => {
  it('asks first and keeps the drawing when the user cancels', async () => {
    confirmDialog.mockResolvedValue(false)
    const { wrapper, store } = mountCanvas([{ id: 'a', title: 'Sketch', data: 'data:old' }])

    await wrapper.find('.btn-clear').trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'Clear the canvas?', confirmLabel: 'Clear' }))
    expect(ctx.clearRect).not.toHaveBeenCalled()
    expect(store.activeDrawing.data).toBe('data:old')
  })

  it('empties the canvas and the saved image when confirmed', async () => {
    confirmDialog.mockResolvedValue(true)
    const { wrapper, store } = mountCanvas([{ id: 'a', title: 'Sketch', data: 'data:old' }])

    await wrapper.find('.btn-clear').trigger('click')
    await vi.advanceTimersByTimeAsync(800)

    expect(ctx.clearRect).toHaveBeenCalled()
    expect(store.activeDrawing.data).toBe('')
    expect(service.updateDrawing).toHaveBeenCalledWith(expect.objectContaining({ data: '' }))
  })
})

describe('lifecycle', () => {
  it('watches the size of the canvas area', () => {
    mountCanvas()
    expect(observer.observe).toHaveBeenCalledTimes(1)
  })

  it('fits the canvas to its area again when the size changes', () => {
    const { canvas } = mountCanvas()
    Object.defineProperty(canvas.element, 'offsetWidth', { value: 640, configurable: true })
    Object.defineProperty(canvas.element, 'offsetHeight', { value: 480, configurable: true })

    resizeCallback()
    expect(canvas.element.width).toBe(640)
    expect(canvas.element.height).toBe(480)
  })

  it('stops watching when the page is left', () => {
    const { wrapper } = mountCanvas()
    wrapper.unmount()
    expect(observer.disconnect).toHaveBeenCalledTimes(1)
  })

  it('clears the canvas when another drawing is selected', async () => {
    const { store } = mountCanvas([{ id: 'a', title: 'A', data: '' }, { id: 'b', title: 'B', data: '' }])
    ctx.clearRect.mockClear()

    store.setActive('b')
    await nextTick()
    expect(ctx.clearRect).toHaveBeenCalledTimes(1)
  })

  it('draws the saved image of the selected drawing', async () => {
    const drawn = []
    vi.stubGlobal('Image', class {
      set src(value) { drawn.push(value); this.onload?.() }
    })
    const { store } = mountCanvas([{ id: 'a', title: 'A', data: 'data:image/png;base64,ONE' }, { id: 'b', title: 'B', data: 'data:image/png;base64,TWO' }])
    expect(drawn).toContain('data:image/png;base64,ONE')

    store.setActive('b')
    await nextTick()
    expect(drawn).toContain('data:image/png;base64,TWO')
    expect(ctx.drawImage).toHaveBeenCalled()
  })
})

describe('page actions', () => {
  it('creates a drawing with New', async () => {
    service.createDrawing.mockResolvedValue({ id: 'n', title: 'Drawing 2', data: '' })
    const { wrapper } = mountCanvas()

    await wrapper.find('.btn-new').trigger('click')
    expect(service.createDrawing).toHaveBeenCalledWith({ title: 'Drawing 2', data: '' })
  })

  it('cannot delete when no drawing is selected', () => {
    const { wrapper } = mountCanvas([])
    expect(wrapper.find('button[aria-label="Delete"]').attributes('disabled')).toBeDefined()
  })

  it('asks before deleting the selected drawing', async () => {
    confirmDialog.mockResolvedValue(false)
    const { wrapper } = mountCanvas()
    await wrapper.find('button[aria-label="Delete"]').trigger('click')
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete drawing?' }))
  })
})
