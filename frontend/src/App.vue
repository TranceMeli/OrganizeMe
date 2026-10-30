<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useEntryStore } from './modules/entries/stores/entryStore'
import { useDrawingStore } from './modules/drawing/stores/drawingStore'
import { useTodoStore } from './modules/todo/stores/todoStore'
import { useCodeStore } from './modules/code/stores/codeStore'
import EntryEditor from './modules/entries/components/EntryEditor.vue'
import EntryPreview from './modules/entries/components/EntryPreview.vue'
import DrawingCanvas from './modules/drawing/components/DrawingCanvas.vue'
import DrawingPreview from './modules/drawing/components/DrawingPreview.vue'
import TodoEditor from './modules/todo/components/TodoEditor.vue'
import TodoPreview from './modules/todo/components/TodoPreview.vue'
import CodeEditor from './modules/code/components/CodeEditor.vue'
import CodePreview from './modules/code/components/CodePreview.vue'
import DialogHost from './components/DialogHost.vue'

const entryStore = useEntryStore()
const drawingStore = useDrawingStore()
const todoStore = useTodoStore()
const codeStore = useCodeStore()

const STORAGE_KEY = 'organizeme-ui'

// Jeder Reiter ist ein Werkzeug: Seiten, Symbol und Position am Seitenrand
const modules = [
  { id: 'notebook', label: 'Notebook', top: 46,  left: EntryEditor,   right: EntryPreview,   store: entryStore,
    icon: 'M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 4v16M13 8h3M13 12h3' },
  { id: 'drawing',  label: 'Drawing',  top: 112, left: DrawingCanvas, right: DrawingPreview, store: drawingStore,
    icon: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3' },
  { id: 'todo',     label: 'Todos',    top: 178, left: TodoEditor,    right: TodoPreview,    store: todoStore,
    icon: 'M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6' },
  { id: 'code',     label: 'Code',     top: 244, left: CodeEditor,    right: CodePreview,    store: codeStore,
    icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12' }
]

function loadUi() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}

const saved = loadUi()
const activeModule = ref(modules.some(m => m.id === saved.tool) ? saved.tool : 'notebook')
const darkMode = ref(!!saved.dark)
const bookW = ref(saved.w || 0)
const bookH = ref(saved.h || 0)
const stageRef = ref(null)
const resizing = ref(false)
const loadError = ref('')

function saveUi() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dark: darkMode.value, tool: activeModule.value, w: bookW.value, h: bookH.value
    }))
  } catch { /* Speicher nicht verfügbar */ }
}

const current = computed(() => modules.find(m => m.id === activeModule.value))

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const headings = computed(() => ({
  notebook: { left: 'Today',     right: 'Entries',  count: plural(entryStore.entries.length, 'entry', 'entries') },
  drawing:  { left: 'Sketchpad', right: 'Gallery',  count: plural(drawingStore.drawings.length, 'drawing', 'drawings') },
  todo:     { left: 'To do',     right: 'Progress', count: `${todoStore.openTodos.length} open` },
  code:     { left: 'Snippet',   right: 'Snippets', count: `${codeStore.snippets.length} saved` }
}[activeModule.value]))

const MIN_W = 760
const MIN_H = 480

function fitToStage() {
  const el = stageRef.value
  if (!el) return
  bookW.value = Math.max(MIN_W, Math.min(1500, el.clientWidth - 160))
  bookH.value = Math.max(MIN_H, el.clientHeight - 40)
}

let drag = null

function gripDown(e) {
  drag = { x: e.clientX, y: e.clientY, w: bookW.value, h: bookH.value }
  resizing.value = true
  e.currentTarget.setPointerCapture(e.pointerId)
}

function gripMove(e) {
  if (!drag) return
  // Das Heft ist zentriert, daher wächst die Breite doppelt so schnell wie die Maus
  bookW.value = Math.max(MIN_W, Math.min(2600, drag.w + (e.clientX - drag.x) * 2))
  bookH.value = Math.max(MIN_H, Math.min(1800, drag.h + (e.clientY - drag.y)))
}

function gripUp() {
  drag = null
  resizing.value = false
}

watch([darkMode, activeModule, bookW, bookH], saveUi)

onMounted(async () => {
  if (!bookW.value || !bookH.value) fitToStage()
  try {
    await Promise.all([
      entryStore.fetchEntries(),
      drawingStore.fetchDrawings(),
      todoStore.fetchTodos(),
      codeStore.fetchSnippets()
    ])
  } catch (err) {
    loadError.value = 'Backend unreachable. Please start the server.'
    console.error(err)
  }
})
</script>

<template>
  <div class="layout" :class="{ dark: darkMode, resizing }">

    <header class="topbar-global">
      <h1 class="app-title">OrganizeMe</h1>
      <div class="switch-group">
        <span class="switch-label">{{ darkMode ? 'Night' : 'Day' }}</span>
        <label class="switch">
          <input type="checkbox" v-model="darkMode" aria-label="Dark mode" />
          <span class="switch-slider"></span>
        </label>
      </div>
    </header>

    <div v-if="loadError" class="load-error">{{ loadError }}</div>

    <div class="stage" ref="stageRef">
      <div
        class="book"
        :data-tool="activeModule"
        :style="{ width: bookW + 'px', height: bookH + 'px' }"
      >
        <div class="ribbon"></div>

        <div class="spread">
          <section class="pg">
            <header class="pg-head">
              <h2>{{ headings.left }}</h2>
              <span class="pg-sub">{{ today }}</span>
            </header>
            <div class="pg-body">
              <component :is="current.left" v-if="current.store.loaded" />
              <div v-else class="pg-loading">Loading...</div>
            </div>
          </section>

          <section class="pg right">
            <header class="pg-head">
              <h2>{{ headings.right }}</h2>
              <span class="pg-sub">{{ headings.count }}</span>
            </header>
            <div class="pg-body">
              <component :is="current.right" v-if="current.store.loaded" />
            </div>
          </section>
        </div>

        <div class="edge"></div>

        <nav class="tabs" aria-label="Tools">
          <button
            v-for="m in modules"
            :key="m.id"
            class="tab"
            :class="{ active: m.id === activeModule }"
            :style="{ top: m.top + 'px', '--tab': `var(--tool-${m.id})` }"
            :title="m.label"
            :aria-label="m.label"
            :aria-current="m.id === activeModule"
            @click="activeModule = m.id"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path :d="m.icon" />
            </svg>
            <span class="tab-label">{{ m.label }}</span>
          </button>
        </nav>

        <div
          class="grip"
          title="Drag to resize"
          @pointerdown="gripDown"
          @pointermove="gripMove"
          @pointerup="gripUp"
          @pointercancel="gripUp"
          @dblclick="fitToStage"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M20 14v6h-6M4 10V4h6M20 20L14 14M4 4l6 6" />
          </svg>
        </div>
      </div>
    </div>

    <DialogHost :tool="activeModule" />

  </div>
</template>

<style>
/* Design-Variablen: Leder-Tagebuch "Cognac" mit Caveat und Nunito */
.layout {
  /* Papier */
  --gray-bg:     #F8F1E3;
  --gray-card:   #FBF5E8;
  --gray-border: #E8DCC4;
  --white:       #FFFDF6;
  --text:        #33291F;
  --muted:       #7A6A55;
  --spine:       #EADFC6;

  /* Einband */
  --cover:       #5A3B2A;
  --cover-edge:  #3B2619;
  --stitch:      #D2A86E;
  --ribbon:      #A63D2F;
  --desk:        #EFE7DA;

  /* Werkzeugfarben */
  --tool-notebook: #8C5A2B;
  --tool-drawing:  #B24A32;
  --tool-todo:     #A8731A;
  --tool-code:     #4F6D7A;
  --on-accent:     #ffffff;

  --radius-card: 16px;
  --radius-btn:  10px;
  --radius-tab:  8px;
  --radius-sm:   6px;

  --font:      'Nunito', Arial, sans-serif;
  --font-hand: 'Caveat', cursive;
}

.layout.dark {
  --gray-bg:     #2B2723;
  --gray-card:   #302B26;
  --gray-border: #403A33;
  --white:       #352F29;
  --text:        #EFE6D6;
  --muted:       #A39683;
  --spine:       #221E1A;

  --cover:       #3F2A1E;
  --cover-edge:  #24170F;
  --desk:        #151311;

  --tool-notebook: color-mix(in srgb, #8C5A2B 62%, #fff);
  --tool-drawing:  color-mix(in srgb, #B24A32 62%, #fff);
  --tool-todo:     color-mix(in srgb, #A8731A 62%, #fff);
  --tool-code:     color-mix(in srgb, #4F6D7A 62%, #fff);
  --on-accent:     #14100C;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: 'Nunito', Arial, sans-serif; }

.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--desk);
  color: var(--text);
  font-family: var(--font);
}

.layout.resizing { user-select: none; }

.topbar-global {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 28px 0;
}

.app-title {
  font-family: var(--font-hand);
  font-size: 34px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 13px;
  color: var(--muted);
}

.switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--gray-border);
  border-radius: 24px;
  transition: background 0.2s;
}

.switch-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: var(--white);
  border-radius: 50%;
  transition: transform 0.2s;
}

.switch input:checked + .switch-slider { background: var(--stitch); }
.switch input:checked + .switch-slider::before { transform: translateX(18px); }
.switch input:focus-visible + .switch-slider { outline: 2px solid var(--stitch); outline-offset: 2px; }

.load-error {
  background: #e85d5d;
  color: #fff;
  padding: 8px 14px;
  margin: 8px 28px 0;
  border-radius: var(--radius-sm);
  font-size: 13px;
}

/* Bühne: das Heft darf größer als das Fenster werden, dann scrollt die Bühne */
.stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 132px 28px 28px;
}
</style>
