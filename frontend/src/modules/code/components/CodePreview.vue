<script setup>
import { computed } from 'vue'
import { useCodeStore } from '../stores/codeStore'
import ItemList from '../../../components/ItemList.vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/vs2015.css' // dunkles Theme passend zu Monaco

const store = useCodeStore()

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const highlightedCode = computed(() => {
  const snippet = store.activeSnippet
  if (!snippet?.code) return ''

  try {
    return hljs.highlight(snippet.code, {
      language: snippet.language || 'javascript'
    }).value
  } catch {
    return hljs.highlightAuto(snippet.code).value
  }
})
</script>

<template>
  <div class="preview-wrapper">

    <ItemList
      :items="store.snippets"
      :active-id="store.activeId"
      @select="store.setActive"
    />

    <div class="card code-card">

      <div class="datum-row">
        <span class="lang-badge">
          {{ store.activeSnippet?.language || '' }}
        </span>
        <div class="datum">
          {{ formatDate(store.activeSnippet?.created_at) }}
        </div>
      </div>

      <pre class="code-preview" v-if="store.activeSnippet?.code"><code v-html="highlightedCode"></code></pre>
      <div v-else class="empty">No code yet...</div>

    </div>
  </div>
</template>

<style scoped>
.preview-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card {
  flex: 1;
  background: #1e1e1e; /* ← passend zu vs-dark */
  border: 1px solid var(--gray-border);
  border-radius: 0 var(--radius-card) var(--radius-card) var(--radius-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.datum-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #333;
}

.lang-badge {
  padding: 4px 12px;
  background: var(--blue);
  color: var(--on-accent);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.datum {
  padding: 5px 14px;
  border: 1px solid #444;
  border-radius: 6px;
  font-size: 13px;
  background: #2a2a2a;
  color: #ccc;
}

.code-preview {
  flex: 1;
  padding: 16px;
  overflow: auto;
  margin: 0;
  background: #1e1e1e;
  color: #dcdcdc; /* Standardfarbe des vs2015-Themes, z. B. für Satzzeichen */
}

.code-preview code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: transparent;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #666;
  font-size: 14px;
}
</style>