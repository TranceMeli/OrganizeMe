<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCodeStore } from '../stores/codeStore'
import PageActions from '../../../components/PageActions.vue'
import '../monacoEnvironment'
import * as monaco from 'monaco-editor'
import { languages } from '../languages'

const store = useCodeStore()
const containerRef = ref(null)
let editorInstance = null
// setValue() fires a change event. Without this flag, switching snippets would save the
// code that was just loaded and send a pointless request.
let syncing = false

// vs-dark paints comments at 4.2:1, below the 4.5:1 the rest of the app meets
monaco.editor.defineTheme('organizeme-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [{ token: 'comment', foreground: '7FB069' }],
  colors: {}
})

onMounted(() => {
  editorInstance = monaco.editor.create(containerRef.value, {
    value: store.activeSnippet?.code || '',
    language: store.activeSnippet?.language || 'javascript',
    theme: 'organizeme-dark',
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

// The highlighting follows the stored language, whichever control changed it
watch(() => store.activeSnippet?.language, (lang) => {
  if (!editorInstance || !lang) return
  monaco.editor.setModelLanguage(editorInstance.getModel(), lang)
})
</script>

<template>
  <div class="editor-wrapper">

    <PageActions
      :disabled="!store.activeSnippet"
      @create="store.createSnippet"
      @delete="store.deleteSnippet()"
    />

    <div class="card">

      <div class="toolbar">
        <input
          class="title-input"
          aria-label="Snippet title"
          placeholder="Title..."
          :value="store.activeSnippet?.title"
          @input="store.updateTitle($event.target.value)"
        />

        <select
          class="lang-select"
          aria-label="Language"
          :value="store.activeSnippet?.language"
          @change="store.updateLanguage($event.target.value)"
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
  font-size: var(--fs-body);
}

.title-input::placeholder { color: var(--muted); }

.lang-select {
  padding: 6px 10px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
  font-family: var(--font);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.monaco-wrapper {
  flex: 1;
  overflow: hidden;
}
</style>