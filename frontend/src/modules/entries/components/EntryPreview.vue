<script setup>
import { computed } from 'vue'
import { useEntryStore } from '../stores/entryStore'
import TabBar from '../../../components/TabBar.vue'
import { marked } from 'marked'

const store = useEntryStore()

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const renderedContent = computed(() => {
  const entry = store.activeEntry
  if (!entry) return ''
  if (entry.mode === 'markdown') {
    return marked(entry.content || '')
  }
  return entry.content || '<p>No content yet...</p>'
})
</script>

<template>
  <div class="preview-wrapper">

    <TabBar
      :items="store.entries"
      :active-id="store.activeId"
      @select="store.setActive"
    />

    <div class="card">
      <div class="datum-row">
        <span class="mode-badge" :class="store.activeEntry?.mode">
          {{ store.activeEntry?.mode === 'markdown' ? 'MD' : 'RT' }}
        </span>
        <div class="datum">
          {{ formatDate(store.activeEntry?.created_at) }}
        </div>
      </div>

      <div
        class="content"
        :class="{ markdown: store.activeEntry?.mode === 'markdown' }"
        v-html="renderedContent"
      ></div>
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
  background: var(--gray-card);
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
  border-bottom: 1px solid var(--gray-border);
}

.mode-badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: bold;
}

.mode-badge.markdown {
  background: #e8a020;
  color: #fff;
}

.mode-badge.richtext {
  background: var(--blue);
  color: var(--on-accent);
}

.datum {
  padding: 5px 14px;
  border: 1px solid var(--gray-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--white);
  color: var(--text);
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
}

/* Markdown Styles */
.content.markdown :deep(h1) { font-size: 24px; margin-bottom: 12px; }
.content.markdown :deep(h2) { font-size: 20px; margin-bottom: 10px; }
.content.markdown :deep(h3) { font-size: 16px; margin-bottom: 8px; }
.content.markdown :deep(p)  { margin-bottom: 10px; }
.content.markdown :deep(ul),
.content.markdown :deep(ol) { padding-left: 20px; margin-bottom: 10px; }
.content.markdown :deep(code) {
  background: var(--gray-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}
.content.markdown :deep(pre) {
  background: var(--gray-bg);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 10px;
}
.content.markdown :deep(blockquote) {
  border-left: 3px solid var(--blue);
  padding-left: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}
.content.markdown :deep(a) { color: var(--blue); }
</style>