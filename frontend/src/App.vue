<script setup>
import { onMounted, ref } from 'vue'
import { useEntryStore } from './modules/entries/stores/entryStore'
import EntryEditor from './modules/entries/components/EntryEditor.vue'
import EntryPreview from './modules/entries/components/EntryPreview.vue'
import DrawingCanvas from './modules/drawing/components/DrawingCanvas.vue'
import DrawingPreview from './modules/drawing/components/DrawingPreview.vue'
import TodoEditor from './modules/todo/components/TodoEditor.vue'
import TodoPreview from './modules/todo/components/TodoPreview.vue'
import CodeEditor from './modules/code/components/CodeEditor.vue'
import CodePreview from './modules/code/components/CodePreview.vue'
import { useDrawingStore } from './modules/drawing/stores/drawingStore'
import { useTodoStore } from './modules/todo/stores/todoStore'
import { useCodeStore } from './modules/code/stores/codeStore'

const entryStore = useEntryStore()
const drawingStore = useDrawingStore()
const todoStore = useTodoStore()
const codeStore = useCodeStore()
const activeModule = ref('notebook')
const darkMode = ref(false)

const leftWidth = ref(50)
const isDragging = ref(false)
const workspaceRef = ref(null)

function startDrag() { isDragging.value = true }

function onDrag(e) {
  if (!isDragging.value || !workspaceRef.value) return
  const rect = workspaceRef.value.getBoundingClientRect()
  const percent = ((e.clientX - rect.left) / rect.width) * 100
  if (percent < 20 || percent > 80) return
  leftWidth.value = percent
}

function stopDrag() { isDragging.value = false }

const loadError = ref('')

onMounted(async () => {
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
  <div
    class="layout"
    :class="{ dark: darkMode }"
    @mousemove="onDrag"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
  >

    <nav class="module-nav">
      <div class="module-tab" :class="{ active: activeModule === 'notebook' }" @click="activeModule = 'notebook'">Notebook</div>
      <div class="module-tab" :class="{ active: activeModule === 'drawing' }" @click="activeModule = 'drawing'">Drawing</div>
      <div class="module-tab" :class="{ active: activeModule === 'todo' }" @click="activeModule = 'todo'">Todos</div>
      <div class="module-tab" :class="{ active: activeModule === 'code' }" @click="activeModule = 'code'">Code</div>
    </nav>

    <div class="main">

      <div class="topbar-global">
        <h1 class="app-title">OrganizeMe</h1>
        <div class="switch-group">
          <label class="switch">
            <input type="checkbox" v-model="darkMode" />
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ darkMode ? '🌙' : '☀️' }}</span>
        </div>
      </div>

      <div v-if="loadError" class="load-error">{{ loadError }}</div>

      <!-- Notebook -->
      <div v-if="activeModule === 'notebook'" class="workspace" ref="workspaceRef">
        <div v-if="!entryStore.loaded">Loading...</div>
        <template v-else>
          <div class="pane" :style="{ width: `calc(${leftWidth}% - 9px)` }"><EntryEditor /></div>
          <div class="divider" :class="{ dragging: isDragging }" @mousedown.prevent="startDrag"></div>
          <div class="pane" :style="{ width: `calc(${100 - leftWidth}% - 9px)` }"><EntryPreview /></div>
        </template>
      </div>

      <!-- Drawing -->
      <div v-if="activeModule === 'drawing'" class="workspace" ref="workspaceRef">
        <div v-if="!drawingStore.loaded">Loading...</div>
        <template v-else>
          <div class="pane" :style="{ width: `calc(${leftWidth}% - 9px)` }"><DrawingCanvas /></div>
          <div class="divider" :class="{ dragging: isDragging }" @mousedown.prevent="startDrag"></div>
          <div class="pane" :style="{ width: `calc(${100 - leftWidth}% - 9px)` }"><DrawingPreview /></div>
        </template>
      </div>

      <!-- Todo -->
      <div v-if="activeModule === 'todo'" class="workspace" ref="workspaceRef">
        <div v-if="!todoStore.loaded">Loading...</div>
        <template v-else>
          <div class="pane" :style="{ width: `calc(${leftWidth}% - 9px)` }"><TodoEditor /></div>
          <div class="divider" :class="{ dragging: isDragging }" @mousedown.prevent="startDrag"></div>
          <div class="pane" :style="{ width: `calc(${100 - leftWidth}% - 9px)` }"><TodoPreview /></div>
        </template>
      </div>

      <!-- Code -->
      <div v-if="activeModule === 'code'" class="workspace" ref="workspaceRef">
        <div v-if="!codeStore.loaded">Loading...</div>
        <template v-else>
          <div class="pane" :style="{ width: `calc(${leftWidth}% - 9px)` }"><CodeEditor /></div>
          <div class="divider" :class="{ dragging: isDragging }" @mousedown.prevent="startDrag"></div>
          <div class="pane" :style="{ width: `calc(${100 - leftWidth}% - 9px)` }"><CodePreview /></div>
        </template>
      </div>

    </div>
  </div>
</template>

<style>
:root {
  /* Light Mode – Petrol */
  --blue:        #0F7C86;
  --blue-dark:   #0B626A;
  --on-accent:   #ffffff;
  --gray-bg:     #EEF7F8;
  --gray-card:   #DCEEF0;
  --gray-border: #B7D8DC;
  --white:       #ffffff;
  --text:        #1B2A2E;
  --muted:       #55747A;

  --radius-card: 16px;
  --radius-btn:  10px;
  --radius-tab:  8px;
  --radius-sm:   6px;

  --font: Arial, sans-serif;
}

.dark {
  /* Dark Mode – Petrol */
  --blue:        #3CC0CA;
  --blue-dark:   #2AA3AD;
  --on-accent:   #0A1819;
  --gray-bg:     #141C1E;
  --gray-card:   #1F2A2D;
  --gray-border: #33454A;
  --white:       #26343A;
  --text:        #E6F1F2;
  --muted:       #8CA6AA;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--gray-bg);
  font-family: var(--font);
  color: var(--text);
}

.layout {
  display: flex;
  height: 100vh;
  user-select: none;
  background: var(--gray-bg);
}

.module-nav {
  display: flex;
  flex-direction: column;
  width: 44px;
  background: var(--gray-card);
  border-right: 1px solid var(--gray-border);
  padding: 12px 0;
  align-items: center;
  gap: 8px;
}

.module-tab {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: 12px 8px;
  border-radius: var(--radius-tab);
  font-size: 12px;
  cursor: pointer;
  color: var(--muted);
  font-family: var(--font);
  white-space: nowrap;
}

.module-tab.active {
  background: var(--blue);
  color: var(--on-accent);
  font-weight: bold;
}

.main {
  flex: 1;
  padding: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.topbar-global {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.app-title {
  font-size: 20px;
  font-weight: bold;
  color: var(--on-accent);
  background: var(--blue);
  padding: 8px 28px;
  border-radius: var(--radius-btn);
  letter-spacing: 1px;
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label { font-size: 16px; }

.switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--gray-border);
  border-radius: 24px;
  transition: background 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: var(--white);
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.switch input:checked + .slider { background: var(--blue); }
.switch input:checked + .slider::before { transform: translateX(18px); background: var(--on-accent); }

.load-error {
  background: #e85d5d;
  color: #fff;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  font-size: 13px;
}

.workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.pane {
  height: 100%;
  overflow: hidden;
  min-width: 0;
  flex-shrink: 0;
}

.divider {
  width: 10px;
  flex-shrink: 0;
  cursor: col-resize;
  background: transparent;
  border-radius: 4px;
  transition: background 0.2s;
  margin: 0 4px;
}

.divider:hover,
.divider.dragging { background: var(--blue); }
</style>