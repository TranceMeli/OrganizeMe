<script setup>
import { useDrawingStore } from '../stores/drawingStore'
import ItemList from '../../../components/ItemList.vue'

const store = useDrawingStore()

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="preview-wrapper">

    <ItemList
      :items="store.drawings"
      :active-id="store.activeId"
      @select="store.setActive"
    />

    <div class="card">
      <div class="datum-row">
        <div class="datum">
          {{ formatDate(store.activeDrawing?.created_at) }}
        </div>
      </div>

      <div class="preview-body">
        <img
          v-if="store.activeDrawing?.data"
          :src="store.activeDrawing.data"
          class="preview-img"
          alt="Preview"
        />
        <p v-else class="empty">No drawing yet...</p>
      </div>
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
  justify-content: flex-end;
  padding: 10px 14px;
  border-bottom: 1px solid var(--gray-border);
}

.datum {
  padding: 5px 14px;
  border: 1px solid var(--gray-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--white);
  color: var(--text);
}

.preview-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.preview-img {
  max-width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--gray-border);
}

.empty {
  color: var(--muted);
  font-size: 14px;
}
</style>