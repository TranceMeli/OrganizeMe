<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDrawingStore } from '../stores/drawingStore'
import PageActions from '../../../components/PageActions.vue'
import { confirmDialog } from '@/composables/useDialog'

const store = useDrawingStore()

const canvasRef = ref(null)
let ctx = null
let drawing = false
let resizeObserver = null

const tool = ref('pen')
const color = ref('#000000')
const lineWidth = ref(4)

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')

  // Assigning canvas.width or height clears the bitmap, so the saved image has to be drawn again
  resizeObserver = new ResizeObserver(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    if (store.activeDrawing?.data) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = store.activeDrawing.data
    }
  })

  resizeObserver.observe(canvasRef.value.parentElement)
  loadDrawing()
})

onUnmounted(() => resizeObserver?.disconnect())

function loadDrawing() {
  const data = store.activeDrawing?.data
  if (!data || !ctx) return
  const img = new Image()
  img.onload = () => ctx.drawImage(img, 0, 0)
  img.src = data
}

watch(() => store.activeId, () => {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  loadDrawing()
})

function getPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function startDrawing(e) {
  drawing = true
  const pos = getPos(e)
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y)
}

function draw(e) {
  if (!drawing) return
  const pos = getPos(e)
  ctx.lineWidth = lineWidth.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = lineWidth.value * 4
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
  }
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
}

function stopDrawing() {
  if (!drawing) return
  drawing = false
  ctx.closePath()
  // The finished stroke is saved as a PNG; the store debounces the request
  const data = canvasRef.value.toDataURL('image/png')
  store.saveData(data)
}

async function clearCanvas() {
  const ok = await confirmDialog({
    title: 'Clear the canvas?',
    message: 'The drawing will be emptied. This cannot be undone.',
    confirmLabel: 'Clear'
  })
  if (!ok) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  store.saveData('')
}
</script>

<template>
  <div class="editor-wrapper">

    <PageActions
      :disabled="!store.activeDrawing"
      @create="store.createDrawing"
      @delete="store.deleteDrawing()"
    />

    <div class="card">
      <div class="toolbar">
        <div class="tool-group">
          <button class="tool-btn" :class="{ active: tool === 'pen' }" :aria-pressed="tool === 'pen'" aria-label="Pen" @click="tool = 'pen'" title="Pen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16zM14 7l3 3" /></svg></button>
          <button class="tool-btn" :class="{ active: tool === 'eraser' }" :aria-pressed="tool === 'eraser'" aria-label="Eraser" @click="tool = 'eraser'" title="Eraser"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 20h-10.5l-4.2-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4L9.1 20.2" /></svg></button>
        </div>

        <div class="tool-group">
          <label class="tool-label">Color</label>
          <input type="color" v-model="color" class="color-picker" aria-label="Color" />
        </div>

        <div class="tool-group">
          <label class="tool-label">Width</label>
          <input type="range" v-model="lineWidth" min="1" max="30" class="range" aria-label="Width" />
          <span class="range-val">{{ lineWidth }}</span>
        </div>

        <div class="tool-group right">
          <button class="btn-clear" @click="clearCanvas">Clear</button>
        </div>
      </div>

      <div class="canvas-wrapper">
        <canvas
          ref="canvasRef"
          class="canvas"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
        ></canvas>
      </div>
    </div>

  </div>
</template>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--gray-card);
  border: 1px solid var(--gray-border);
  border-radius: 0 var(--radius-card) var(--radius-card) var(--radius-card);
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--gray-border);
  flex-wrap: wrap;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-group.right { margin-left: auto; }

.tool-label {
  font-size: var(--fs-cap);
  color: var(--muted);
}

.tool-btn {
  padding: 4px 10px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  cursor: pointer;
  font-size: var(--fs-body);
}

.tool-btn.active {
  background: var(--blue);
  border-color: var(--blue);
}

.color-picker {
  width: 34px;
  height: 28px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 2px;
}

.range { width: 80px; cursor: pointer; }

.range-val {
  font-size: var(--fs-cap);
  color: var(--muted);
  width: 20px;
}

.btn-clear {
  padding: 5px 12px;
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-btn);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.btn-clear:hover { background: var(--gray-bg); }

.canvas-wrapper {
  flex: 1;
  background: var(--white);
  margin: 14px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  display: block;
}
</style>