import { defineStore } from 'pinia'
import { debounceById } from '@/utils/debounce'
import {
  getSnippets,
  createSnippet as apiCreate,
  updateSnippet as apiUpdate,
  deleteSnippet as apiDelete
} from '../services/codeService'

export const useCodeStore = defineStore('code', {
  state: () => ({
    snippets: [],
    activeId: null,
    loaded: false
  }),

  getters: {
    activeSnippet: (state) =>
      state.snippets.find(s => s.id === state.activeId) || null
  },

  actions: {
    async fetchSnippets() {
      const data = await getSnippets()
      this.snippets = data
      this.activeId = data[0]?.id || null
      this.loaded = true
    },

    async createSnippet() {
      const number = this.snippets.length + 1
      const saved = await apiCreate({
        title: `Snippet ${number}`,
        code: '// Write here...',
        language: 'javascript'
      })
      this.snippets.unshift(saved)
      this.activeId = saved.id
    },

    async deleteSnippet(id = this.activeId) {
      if (!id) return
      const ok = window.confirm('Delete this snippet?')
      if (!ok) return
      await apiDelete(id)
      this.snippets = this.snippets.filter(s => s.id !== id)
      this.activeId = this.snippets[0]?.id || null
    },

    setActive(id) {
      this.activeId = id
    },

    _debouncedSave: debounceById(async (snippet) => {
      await apiUpdate(snippet)
    }, 800),

    updateTitle(title) {
      const s = this.activeSnippet
      if (!s) return
      s.title = title
      this._debouncedSave({ ...s })
    },

    updateCode(code) {
      const s = this.activeSnippet
      if (!s) return
      s.code = code
      this._debouncedSave({ ...s })
    },

    updateLanguage(language) {
      const s = this.activeSnippet
      if (!s) return
      s.language = language
      this._debouncedSave({ ...s })
    }
  }
})