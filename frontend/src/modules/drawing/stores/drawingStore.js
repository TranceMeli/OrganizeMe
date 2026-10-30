import { defineStore } from 'pinia'
import { debounceById } from '@/utils/debounce'
import { confirmDialog } from '@/composables/useDialog'
import {
  getDrawings,
  createDrawing,
  updateDrawing,
  deleteDrawing
} from '../services/drawingService'

export const useDrawingStore = defineStore('drawing', {
  state: () => ({
    drawings: [],
    activeId: null,
    loaded: false
  }),

  getters: {
    activeDrawing: (state) =>
      state.drawings.find(d => d.id === state.activeId) || null
  },

  actions: {

    async fetchDrawings() {
      const res = await getDrawings()
      this.drawings = res
      this.activeId = res[0]?.id || null
      this.loaded = true
    },

    async createDrawing() {
      const number = this.drawings.length + 1
      const saved = await createDrawing({
        title: `Drawing ${number}`,
        data: ''
      })
      this.drawings.unshift(saved)
      this.activeId = saved.id
    },

    async deleteDrawing(id = this.activeId) {
      if (!id) return
      const item = this.drawings.find(d => d.id === id)
      const ok = await confirmDialog({
        title: 'Delete drawing?',
        message: `“${item?.title || 'Untitled'}” will be deleted permanently.`
      })
      if (!ok) return

      await deleteDrawing(id)
      this.drawings = this.drawings.filter(d => d.id !== id)
      this.activeId = this.drawings[0]?.id || null
    },

    setActive(id) {
      this.activeId = id
    },

    _debouncedSave: debounceById(async (id, title, data) => {
      await updateDrawing({ id, title, data })
    }, 800, (id) => id),

    saveData(data) {
      const d = this.activeDrawing
      if (!d) return
      d.data = data
      this._debouncedSave(d.id, d.title, d.data)
    }
  }
})