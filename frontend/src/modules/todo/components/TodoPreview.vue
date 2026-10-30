    <script setup>
import { computed } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const store = useTodoStore()

const total = computed(() => store.todos.length)
const done = computed(() => store.doneTodos.length)
const percent = computed(() =>
  total.value ? Math.round((done.value / total.value) * 100) : 0
)
</script>

<template>
  <div class="preview-wrapper">

    <div class="card">

      <!-- Fortschritt -->
      <div class="progress-section">
        <div class="progress-label">
          {{ done }} of {{ total }} done
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: percent + '%' }"></div>
        </div>
        <div class="progress-percent">{{ percent }}%</div>
      </div>

      <!-- Offene Todos -->
      <div class="section">
        <div class="section-label">Open ({{ store.openTodos.length }})</div>
        <div
          v-for="todo in store.openTodos"
          :key="todo.id"
          class="preview-item"
        >
          <span class="dot open"></span>
          {{ todo.title }}
        </div>
        <div v-if="!store.openTodos.length" class="empty">
          All done! 🎉
        </div>
      </div>

      <!-- Erledigte Todos -->
      <div class="section">
        <div class="section-label">Done ({{ store.doneTodos.length }})</div>
        <div
          v-for="todo in store.doneTodos"
          :key="todo.id"
          class="preview-item done"
        >
          <span class="dot done-dot"></span>
          {{ todo.title }}
        </div>
        <div v-if="!store.doneTodos.length" class="empty">
          Nothing done yet
        </div>
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
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  gap: 20px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-label {
  font-size: 13px;
  color: var(--muted);
}

.progress-bar {
  height: 8px;
  background: var(--gray-border);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--blue);
  border-radius: 99px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 13px;
  font-weight: bold;
  color: var(--blue);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  font-weight: bold;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text);
  padding: 6px 10px;
  background: var(--white);
  border-radius: var(--radius-sm);
  border: 1px solid var(--gray-border);
}

.preview-item.done {
  color: var(--muted);
  text-decoration: line-through;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot.open { background: var(--blue); }
.dot.done-dot { background: var(--muted); }

.empty {
  font-size: 13px;
  color: var(--muted);
  padding: 6px 10px;
}
</style>