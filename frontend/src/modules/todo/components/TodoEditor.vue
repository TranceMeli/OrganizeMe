<script setup>
import { ref } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const store = useTodoStore()
const newTitle = ref('')

async function addTodo() {
  if (!newTitle.value.trim()) return
  await store.createTodo(newTitle.value)
  newTitle.value = ''
}
</script>

<template>
  <div class="editor-wrapper">

    <div class="topbar">
      <span class="topbar-title">Todos</span>
    </div>

    <div class="card">

      <!-- Neues Todo -->
      <div class="input-row">
        <input
          class="new-input"
          placeholder="New todo..."
          v-model="newTitle"
          @keydown.enter="addTodo"
        />
        <button class="add-btn" @click="addTodo">+</button>
      </div>

      <!-- Offene Todos -->
      <div class="section">
        <div class="section-label">Open</div>
        <div class="todo-list">
          <div
            v-for="todo in store.openTodos"
            :key="todo.id"
            class="todo-item"
          >
            <input
              type="checkbox"
              class="checkbox"
              :checked="todo.done"
              @change="store.toggleDone(todo.id)"
            />
            <input
              class="todo-title"
              :value="todo.title"
              @change="store.updateTitle(todo.id, $event.target.value)"
            />
            <button class="del-btn" @click="store.deleteTodo(todo.id)">🗑</button>
          </div>
          <div v-if="!store.openTodos.length" class="empty">
            No open todos
          </div>
        </div>
      </div>

      <!-- Erledigte Todos -->
      <div class="section">
        <div class="section-label">Done</div>
        <div class="todo-list">
          <div
            v-for="todo in store.doneTodos"
            :key="todo.id"
            class="todo-item done"
          >
            <input
              type="checkbox"
              class="checkbox"
              :checked="todo.done"
              @change="store.toggleDone(todo.id)"
            />
            <input
              class="todo-title"
              :value="todo.title"
              @change="store.updateTitle(todo.id, $event.target.value)"
            />
            <button class="del-btn" @click="store.deleteTodo(todo.id)">🗑</button>
          </div>
          <div v-if="!store.doneTodos.length" class="empty">
            Nothing done yet
          </div>
        </div>
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

.topbar {
  display: flex;
  align-items: center;
  padding: 0 2px;
  height: 34px;
}

.topbar-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--muted);
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--gray-card);
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-card);
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}

/* Neues Todo */
.input-row {
  display: flex;
  gap: 8px;
}

.new-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-btn);
  background: var(--white);
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  outline: none;
}

.new-input::placeholder { color: var(--muted); }

.add-btn {
  padding: 8px 16px;
  background: var(--blue);
  color: var(--on-accent);
  border: none;
  border-radius: var(--radius-btn);
  font-size: 20px;
  cursor: pointer;
  font-weight: bold;
}

.add-btn:hover { background: var(--blue-dark); }

/* Sektionen */
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

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Todo Item */
.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
}

.todo-item.done .todo-title {
  text-decoration: line-through;
  color: var(--muted);
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--blue);
  flex-shrink: 0;
}

.todo-title {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  outline: none;
}

.del-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: var(--muted);
  padding: 2px 4px;
  opacity: 0;
}

.todo-item:hover .del-btn {
  opacity: 1;
}

.empty {
  font-size: 13px;
  color: var(--muted);
  padding: 8px 12px;
}
</style>