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
          <button class="tool-btn" :class="{ active: tool === 'pen' }" @click="tool = 'pen'" title="Pen">✏️</button>
          <button class="tool-btn" :class="{ active: tool === 'eraser' }" @click="tool = 'eraser'" title="Eraser">🧹</button>
        </div>

        <div class="tool-group">
          <label class="tool-label">Color</label>
          <input type="color" v-model="color" class="color-picker" />
        </div>

        <div class="tool-group">
          <label class="tool-label">Width</label>
          <input type="range" v-model="lineWidth" min="1" max="30" class="range" />
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
  font-size: 12px;
  color: var(--muted);
}

.tool-btn {
  padding: 4px 10px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  cursor: pointer;
  font-size: 15px;
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
  font-size: 12px;
  color: var(--muted);
  width: 20px;
}

.btn-clear {
  padding: 5px 12px;
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-btn);
  font-size: 13px;
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