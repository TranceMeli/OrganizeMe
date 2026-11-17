<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import SaveStatus from './components/SaveStatus.vue'
import EmptyState from './components/EmptyState.vue'
import PageSkeleton from './components/PageSkeleton.vue'
import { dialog } from './composables/useDialog'

const entryStore = useEntryStore()
const drawingStore = useDrawingStore()
const todoStore = useTodoStore()
const codeStore = useCodeStore()

const STORAGE_KEY = 'organizeme-ui'
const MIN_W = 760
const MIN_H = 480
const NARROW_QUERY = '(max-width: 899px)'

// One entry per tool. `top` staggers the tabs along the page edge; `empty` is shown instead of
// the editor while the tool has no items (todos have none: their editor already invites input).
const modules = [
  {
    id: 'notebook', label: 'Notebook', short: 'Write', top: 46, left: EntryEditor, right: EntryPreview,
    store: entryStore, count: () => entryStore.entries.length, create: () => entryStore.createEntry(),
    icon: 'M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 4v16M13 8h3M13 12h3',
    empty: { title: 'Your first page is waiting', text: 'Write a note. It is saved as you type.', action: 'New entry' }
  },
  {
    id: 'drawing', label: 'Drawing', short: 'Draw', top: 112, left: DrawingCanvas, right: DrawingPreview,
    store: drawingStore, count: () => drawingStore.drawings.length, create: () => drawingStore.createDrawing(),
    icon: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3',
    empty: { title: 'Start your first sketch', text: 'Pick a pen and draw. Your sketches collect here.', action: 'New drawing' }
  },
  {
    id: 'todo', label: 'Todos', short: 'To do', top: 178, left: TodoEditor, right: TodoPreview,
    store: todoStore, count: () => todoStore.todos.length, create: () => document.querySelector('.new-input')?.focus(),
    icon: 'M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6',
    empty: null
  },
  {
    id: 'code', label: 'Code', short: 'Code', top: 244, left: CodeEditor, right: CodePreview,
    store: codeStore, count: () => codeStore.snippets.length, create: () => codeStore.createSnippet(),
    icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12',
    empty: { title: 'Save your first snippet', text: 'Keep code you reuse, with highlighting.', action: 'New snippet' }
  }
]

function loadUi() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}

const saved = loadUi()
const activeModule = ref(modules.some(m => m.id === saved.tool) ? saved.tool : 'notebook')
const darkMode = ref(!!saved.dark)
const easyRead = ref(!!saved.easyRead)
const bookW = ref(saved.w || 0)
const bookH = ref(saved.h || 0)
const stageRef = ref(null)
const resizing = ref(false)
const loadError = ref(false)
const narrow = ref(false)
const page = ref('write')

function saveUi() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dark: darkMode.value, easyRead: easyRead.value, tool: activeModule.value, w: bookW.value, h: bookH.value
    }))
  } catch { /* storage can be blocked, the app works without it */ }
}

const current = computed(() => modules.find(m => m.id === activeModule.value))
const showEmpty = computed(() =>
  current.value.store.loaded && current.value.empty && current.value.count() === 0
)

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const headings = computed(() => ({
  notebook: { left: 'Today',     right: 'Entries',  count: plural(entryStore.entries.length, 'entry', 'entries') },
  drawing:  { left: 'Sketchpad', right: 'Gallery',  count: plural(drawingStore.drawings.length, 'drawing', 'drawings') },
  todo:     { left: 'To do',     right: 'Progress', count: `${todoStore.openTodos.length} open` },
  code:     { left: 'Snippet',   right: 'Snippets', count: `${codeStore.snippets.length} saved` }
}[activeModule.value]))

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
  // The book is centred, so the width has to grow twice as fast as the pointer moves
  bookW.value = Math.max(MIN_W, Math.min(2600, drag.w + (e.clientX - drag.x) * 2))
  bookH.value = Math.max(MIN_H, Math.min(1800, drag.h + (e.clientY - drag.y)))
}

function gripUp() {
  drag = null
  resizing.value = false
}

async function load() {
  loadError.value = false
  try {
    await Promise.all([
      entryStore.fetchEntries(),
      drawingStore.fetchDrawings(),
      todoStore.fetchTodos(),
      codeStore.fetchSnippets()
    ])
  } catch (err) {
    loadError.value = true
    console.error(err)
  }
}

// Alt+1..4 switch tools, Alt+N creates an item. Ctrl+digit and Ctrl+N are taken by the browser.
function onKeydown(e) {
  if (!e.altKey || e.ctrlKey || e.metaKey || dialog.open) return

  const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code)
  if (index !== -1) {
    e.preventDefault()
    activeModule.value = modules[index].id
  } else if (e.code === 'KeyN' && current.value.store.loaded) {
    e.preventDefault()
    page.value = 'write'
    current.value.create()
  }
}

const narrowQuery = window.matchMedia(NARROW_QUERY)
const onNarrowChange = (e) => { narrow.value = e.matches }

// Start on the writing page whenever the tool changes, so the narrow layout never opens on a stale page
watch(activeModule, () => { page.value = 'write' })
watch([darkMode, easyRead, activeModule, bookW, bookH], saveUi)

onMounted(() => {
  narrow.value = narrowQuery.matches
  narrowQuery.addEventListener('change', onNarrowChange)
  document.addEventListener('keydown', onKeydown)
  if (!bookW.value || !bookH.value) fitToStage()
  load()
})

onBeforeUnmount(() => {
  narrowQuery.removeEventListener('change', onNarrowChange)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="layout" :class="{ dark: darkMode, easy: easyRead, narrow, resizing }">

    <header class="topbar-global">
      <h1 class="app-title">OrganizeMe</h1>

      <div class="topbar-controls">
        <div class="seg" role="group" aria-label="Entry text">
          <button :aria-pressed="!easyRead" @click="easyRead = false">Handwriting</button>
          <button :aria-pressed="easyRead" @click="easyRead = true">Easy-read</button>
        </div>

        <div class="switch-group">
          <span class="switch-label">{{ darkMode ? 'Night' : 'Day' }}</span>
          <label class="switch">
            <input type="checkbox" v-model="darkMode" aria-label="Night mode" />
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
    </header>

    <div v-if="loadError" class="load-error" role="alert">
      <div>
        <strong>Can't reach the server</strong>
        <p>Your notes are safe. Start the backend with <code>npm start</code> in the backend folder, then try again.</p>
      </div>
      <button @click="load">Try again</button>
    </div>

    <div class="stage" ref="stageRef">
      <div
        class="book"
        :data-tool="activeModule"
        :style="narrow ? null : { width: bookW + 'px', height: bookH + 'px' }"
      >
        <div class="ribbon"></div>

        <div v-if="narrow" class="seg page-switch" role="group" aria-label="Page">
          <button :aria-pressed="page === 'write'" @click="page = 'write'">{{ current.short }}</button>
          <button :aria-pressed="page === 'list'" @click="page = 'list'">{{ headings.right }}</button>
        </div>

        <div class="spread">
          <section class="pg" v-show="!narrow || page === 'write'">
            <header class="pg-head">
              <div>
                <h2>{{ headings.left }}</h2>
                <span class="pg-sub">{{ today }}</span>
              </div>
              <SaveStatus />
            </header>
            <div class="pg-body">
              <PageSkeleton v-if="!current.store.loaded && !loadError" />
              <p v-else-if="loadError" class="pg-note">Nothing to show until the server is back.</p>
              <EmptyState
                v-else-if="showEmpty"
                v-bind="current.empty"
                @action="current.create()"
              />
              <component :is="current.left" v-else />
            </div>
          </section>

          <section class="pg right" v-show="!narrow || page === 'list'">
            <header class="pg-head">
              <h2>{{ headings.right }}</h2>
              <span class="pg-sub">{{ headings.count }}</span>
            </header>
            <div class="pg-body">
              <component :is="current.right" v-if="current.store.loaded && !showEmpty" />
            </div>
          </section>
        </div>

        <div class="edge"></div>

        <nav class="tabs" aria-label="Tools">
          <div
            v-for="(m, i) in modules"
            :key="m.id"
            class="tab-slot"
            :style="narrow ? null : { top: m.top + 'px' }"
          >
            <button
              class="tab"
              :class="{ active: m.id === activeModule }"
              :style="{ '--tab': `var(--tool-${m.id})`, '--tab-hover': `var(--tool-${m.id}-hover)` }"
              :aria-label="m.label"
              :aria-current="m.id === activeModule ? 'page' : null"
              :aria-keyshortcuts="`Alt+${i + 1}`"
              @click="activeModule = m.id"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="m.icon" />
              </svg>
              <span class="tab-label">{{ m.label }}</span>
            </button>
            <span v-if="m.id !== activeModule" class="tip" aria-hidden="true">{{ m.label }} · Alt+{{ i + 1 }}</span>
          </div>
        </nav>

        <div
          v-if="!narrow"
          class="grip"
          title="Drag to resize, double-click to fit the window"
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
/* Design tokens: leather diary "Cognac", Caveat for headings and entries, Nunito for the interface.
   Colours were checked against WCAG: text 4.5:1, controls and borders of inputs 3:1.
   --gray-border only draws decoration (ruled lines, dividers); --field-border outlines controls. */
.layout {
  --gray-bg:      #F8F1E3;
  --gray-card:    #FBF5E8;
  --gray-border:  #E8DCC4;
  --field-border: #958262;
  --white:        #FFFBF2;
  --text:         #33291F;
  --muted:        #6B5B47;
  --spine:        #EADFC6;
  --raised:       #FFFBF2;
  --raised-border: #CBBB9B;

  --cover:      #5A3B2A;
  --cover-edge: #3B2619;
  --stitch:     #D2A86E;
  --ribbon:     #A63D2F;
  --desk:       #EFE7DA;

  --danger:      #B03A2E;
  --danger-fill: #A63D2F;
  --on-danger:   #FFFBF2;
  --success:     #1F6A41;

  --tool-notebook: #8C5A2B;
  --tool-drawing:  #B24A32;
  --tool-todo:     #8F5F0E;
  --tool-code:     #4F6D7A;
  --tool-notebook-hover: #744A22;
  --tool-drawing-hover:  #94392A;
  --tool-todo-hover:     #75500B;
  --tool-code-hover:     #405A66;
  --on-accent: #FFFBF2;

  /* Type scale in rem so browser zoom and font settings are respected */
  --fs-cap:  0.75rem;
  --fs-sm:   0.875rem;
  --fs-body: 1rem;
  --font:      'Nunito', system-ui, sans-serif;
  --font-hand: 'Caveat', cursive;

  /* Entry text: handwriting by default, Nunito in "Easy-read" mode */
  --font-entry: var(--font-hand);
  --fs-entry:   1.5rem;
  --lh-entry:   2rem;

  --control-h: 2.5rem;
  --radius-card: 16px;
  --radius-btn:  10px;
  --radius-tab:  8px;
  --radius-sm:   6px;
}

.layout.easy {
  --font-entry: var(--font);
  --fs-entry:   1rem;
  --lh-entry:   1.75rem;
}

.layout.dark {
  --gray-bg:      #2B2723;
  --gray-card:    #302B26;
  --gray-border:  #403A33;
  --field-border: #857A6B;
  --white:        #352F29;
  --text:         #EFE6D6;
  --muted:        #B4A794;
  --spine:        #221E1A;
  --raised:       #3B342D;
  --raised-border: #5A5046;

  --cover:      #3F2A1E;
  --cover-edge: #24170F;
  --desk:       #151311;

  --danger:      #FF8A7A;
  --danger-fill: #FF8A7A;
  --on-danger:   #2A0E0A;
  --success:     #7FD3A0;

  /* Fixed tints instead of runtime colour mixing, so every value stays reviewable */
  --tool-notebook: #B8997C;
  --tool-drawing:  #CF8F80;
  --tool-todo:     #C9A871;
  --tool-code:     #92A4AD;
  --tool-notebook-hover: #C7AD93;
  --tool-drawing-hover:  #DBA79B;
  --tool-todo-hover:     #D6BC8E;
  --tool-code-hover:     #A9B8BF;
  --on-accent: #1C150F;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: 'Nunito', system-ui, sans-serif; }

.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--desk);
  color: var(--text);
  font-family: var(--font);
  font-size: var(--fs-body);
  line-height: 1.5;
}

.layout.resizing { user-select: none; }

.topbar-global {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 14px 28px 0;
}

.app-title {
  font-family: var(--font-hand);
  font-size: 2.25rem;
  font-weight: 600;
  line-height: 1;
}

.topbar-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Segmented control, used for the entry font and for the narrow page switch */
.seg {
  display: flex;
  border: 1px solid var(--field-border);
  border-radius: 8px;
  overflow: hidden;
}

.seg button {
  min-height: 2rem;
  padding: 0 12px;
  background: transparent;
  color: var(--text);
  border: none;
  font-family: var(--font);
  font-size: var(--fs-sm);
  font-weight: 600;
  cursor: pointer;
}

.seg button[aria-pressed='true'] {
  background: var(--tool-notebook);
  color: var(--on-accent);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  min-width: 2.75rem;
  font-size: var(--fs-sm);
  color: var(--muted);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
}

.switch input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; cursor: pointer; }

.switch-slider {
  position: absolute;
  inset: 0;
  background: var(--field-border);
  border-radius: 26px;
  transition: background 0.2s;
  pointer-events: none;
}

.switch-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  background: var(--on-accent);
  border-radius: 50%;
  transition: transform 0.2s;
}

.switch input:checked + .switch-slider { background: var(--stitch); }
.switch input:checked + .switch-slider::before { transform: translateX(18px); background: var(--cover-edge); }
.switch input:focus-visible + .switch-slider { outline: 2px solid var(--stitch); outline-offset: 2px; }

.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 10px 28px 0;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--danger) 10%, var(--white));
  color: var(--text);
  border: 1px solid var(--danger);
  border-radius: 8px;
}

.load-error p { color: var(--text); font-size: var(--fs-sm); }
.load-error code { font-family: ui-monospace, Consolas, monospace; }

.load-error button {
  flex-shrink: 0;
  height: var(--control-h);
  padding: 0 16px;
  background: var(--danger-fill);
  color: var(--on-danger);
  border: none;
  border-radius: 8px;
  font-family: var(--font);
  font-size: var(--fs-sm);
  font-weight: 600;
  cursor: pointer;
}

/* The book may grow larger than the window; the stage scrolls then */
.stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 132px 28px 28px;
}

@media (prefers-reduced-motion: reduce) {
  .layout * { transition: none !important; }
}
</style>
