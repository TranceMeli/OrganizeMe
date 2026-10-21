<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items:    Array,
  activeId: String
})

const emit = defineEmits(['select'])

const MAX_VISIBLE = 4
const dropdownOpen = ref(false)
const dropdownRef = ref(null)

const visibleItems = computed(() => props.items.slice(0, MAX_VISIBLE))
const hiddenItems = computed(() => props.items.slice(MAX_VISIBLE))
const hasMore = computed(() => props.items.length > MAX_VISIBLE)

const activeIsHidden = computed(() =>
  hiddenItems.value.some(i => i.id === props.activeId)
)

function select(id) {
  emit('select', id)
  dropdownOpen.value = false
}

function handleOutsideClick(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<template>
  <div class="tabbar">

    <div
      v-for="item in visibleItems"
      :key="item.id"
      class="tab"
      :class="{ active: item.id === activeId }"
      @click="select(item.id)"
    >
      {{ item.title || 'Untitled' }}
    </div>

    <div v-if="activeIsHidden" class="tab active">
      {{ items.find(i => i.id === activeId)?.title || 'Untitled' }}
    </div>

    <div v-if="hasMore" class="more-wrapper" ref="dropdownRef">
      <button
        class="more-btn"
        :class="{ open: dropdownOpen }"
        @click="dropdownOpen = !dropdownOpen"
      >
        ···
      </button>

      <div v-if="dropdownOpen" class="dropdown">
        <div
          v-for="item in items"
          :key="item.id"
          class="dropdown-item"
          :class="{ active: item.id === activeId }"
          @click="select(item.id)"
        >
          {{ item.title || 'Untitled' }}
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tabbar {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 0 2px;
  height: 34px;        /* ← gleiche Höhe wie topbar */
  position: relative;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.tab {
  height: 34px;        /* ← exakt gleich */
  padding: 0 14px;
  display: flex;
  align-items: center;
  background: var(--blue);
  color: var(--on-accent);
  border-radius: var(--radius-tab) var(--radius-tab) 0 0;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.6;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab.active {
  opacity: 1;
  font-weight: bold;
}

.tab:hover { opacity: 0.85; }

.more-btn {
  height: 34px;        /* ← exakt gleich */
  padding: 0 12px;
  background: var(--blue);
  color: var(--on-accent);
  border: none;
  border-radius: var(--radius-tab) var(--radius-tab) 0 0;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
}

.more-btn:hover,
.more-btn.open {
  opacity: 1;
}

.more-wrapper {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-card);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-item {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item:hover { background: var(--gray-bg); }

.dropdown-item.active {
  background: var(--blue);
  color: var(--on-accent);
  font-weight: bold;
}
</style>