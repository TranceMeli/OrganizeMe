import { defineStore } from 'pinia'
import { debounceById } from '@/utils/debounce'
import {
  getEntries,
  createEntry as apiCreate,
  updateEntry as apiUpdate,
  deleteEntry as apiDelete
} from '../services/entryService'

export const useEntryStore = defineStore('entry', {
  state: () => ({
    entries: [],
    activeId: null,
    loaded: false
  }),

  getters: {
    activeEntry: (state) =>
      state.entries.find(e => e.id === state.activeId) || null
  },

  actions: {
    async fetchEntries() {
      const data = await getEntries()
      this.entries = data
      this.activeId = data[0]?.id || null
      this.loaded = true
    },

    async createEntry() {
      const number = this.entries.length + 1
      const saved = await apiCreate({
        title: `Entry ${number}`,
        content: '<p></p>',
        mode: 'richtext'
      })
      this.entries.unshift(saved)
      this.activeId = saved.id
    },

    async deleteEntry(id = this.activeId) {
      if (!id) return
      const ok = window.confirm('Delete this entry?')
      if (!ok) return
      await apiDelete(id)
      this.entries = this.entries.filter(e => e.id !== id)
      this.activeId = this.entries[0]?.id || null
    },

    setActive(id) {
      this.activeId = id
    },

    _debouncedSave: debounceById(async (entry) => {
      await apiUpdate(entry)
    }, 500),

    updateTitle(title) {
      const e = this.activeEntry
      if (!e) return
      e.title = title
      this._debouncedSave({ ...e })
    },

    updateContent(content) {
      const e = this.activeEntry
      if (!e) return
      e.content = content
      this._debouncedSave({ ...e })
    },

    updateMode(mode) {
      const e = this.activeEntry
      if (!e) return
      e.mode = mode
      e.content = mode === 'markdown' ? '' : '<p></p>'
      this._debouncedSave({ ...e })
    }
  }
})