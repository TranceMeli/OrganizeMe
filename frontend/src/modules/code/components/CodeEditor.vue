<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCodeStore } from '../stores/codeStore'
import * as monaco from 'monaco-editor'

const store = useCodeStore()
const containerRef = ref(null)
let editorInstance = null
let syncing = false // verhindert Speichern beim Wechsel des Snippets

const languages = [
  'javascript', 'typescript', 'python', 'csharp',
  'java', 'html', 'css', 'json', 'sql', 'shell'
]

onMounted(() => {
  editorInstance = monaco.editor.create(containerRef.value, {
    value: store.activeSnippet?.code || '',
    language: store.activeSnippet?.language || 'javascript',
    theme: 'vs-dark',
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    wordWrap: 'on',
    automaticLayout: true
  })

  editorInstance.onDidChangeModelContent(() => {
    if (syncing) return
    store.updateCode(editorInstance.getValue())
  })
})

onUnmounted(() => {
  editorInstance?.dispose()
})

watch(() => store.activeId, () => {
  if (!editorInstance || !store.activeSnippet) return
  const model = editorInstance.getModel()
  monaco.editor.setModelLanguage(model, store.activeSnippet.language || 'javascript')
  syncing = true
  editorInstance.setValue(store.activeSnippet.code || '')
  syncing = false
})

function onLanguageChange(lang) {
  store.updateLanguage(lang)
  if (!editorInstance) return
  monaco.editor.setModelLanguage(editorInstance.getModel(), lang)
}
</script>

<template>
  <div class="editor-wrapper">

    <div class="topbar">
      <button class="btn-neu" @click="store.createSnippet">New</button>
      <button
        class="btn-trash"
        @click="store.deleteSnippet()"
        :disabled="!store.activeSnippet"
      >🗑</button>
    </div>

    <div class="card">

      <div class="toolbar">
        <input
          class="title-input"
          placeholder="Title..."
          :value="store.activeSnippet?.title"
          @input="store.updateTitle($event.target.value)"
        />

        <select
          class="lang-select"
          :value="store.activeSnippet?.language"
          @change="onLanguageChange($event.target.value)"
        >
          <option v-for="lang in languages" :key="lang" :value="lang">
            {{ lang }}
          </option>
        </select>
      </div>

      <div ref="containerRef" class="monaco-wrapper"></div>

    </div>
  </div>
</template>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 34px;
  padding: 0 2px;
}

.btn-neu {
  height: 34px;
  padding: 0 28px;
  background: var(--blue);
  color: var(--on-accent);
  border: none;
  border-radius: var(--radius-tab) var(--radius-tab) 0 0;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.btn-neu:hover { background: var(--blue-dark); }

.btn-trash {
  height: 34px;
  padding: 0 12px;
  background: var(--blue);
  border: none;
  border-radius: var(--radius-tab) 0 0 0;
  font-size: 18px;
  cursor: pointer;
  color: var(--on-accent);
}

.btn-trash:disabled { opacity: 0.4; cursor: not-allowed; }

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--gray-card);
  border: 1px solid var(--gray-border);
  border-radius: 0 0 var(--radius-card) var(--radius-card);
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--gray-border);
}

.title-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  outline: none;
}

.title-input::placeholder { color: var(--muted); }

.lang-select {
  padding: 6px 10px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
  font-family: var(--font);
  font-size: 13px;
  cursor: pointer;
}

.monaco-wrapper {
  flex: 1;
  overflow: hidden;
}
</style>