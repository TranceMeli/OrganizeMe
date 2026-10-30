<script setup>
defineProps({
  items:    Array,
  activeId: String
})

const emit = defineEmits(['select'])

function shortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="item-list">
    <button
      v-for="item in items"
      :key="item.id"
      class="item"
      :class="{ active: item.id === activeId }"
      @click="emit('select', item.id)"
    >
      <span class="item-title">{{ item.title || 'Untitled' }}</span>
      <span class="item-date">{{ shortDate(item.created_at) }}</span>
    </button>
    <div v-if="!items.length" class="item-empty">Nothing here yet</div>
  </div>
</template>

<style scoped>
.item-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 1 auto;
  max-height: 36%;
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
  margin-bottom: 12px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid var(--gray-border);
  border-radius: 8px;
  background: var(--white);
  color: var(--text);
  font-family: var(--font);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.item:hover { border-color: var(--blue); }
.item.active { border-color: var(--blue); box-shadow: 0 0 0 1px var(--blue); }

.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-date {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--muted);
}

.item-empty {
  font-size: 13px;
  color: var(--muted);
  padding: 4px 2px;
}
</style>
