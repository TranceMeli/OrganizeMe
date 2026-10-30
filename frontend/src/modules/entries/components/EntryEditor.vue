<script setup>
import { ref, watch } from 'vue'
import { useEntryStore } from '../stores/entryStore'
import PageActions from '../../../components/PageActions.vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'

const store = useEntryStore()

const fontSizes = ['12px', '14px', '16px', '18px', '24px', '32px']

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize || null,
          renderHTML: attrs => {
            if (!attrs.fontSize) return {}
            return { style: `font-size: ${attrs.fontSize}` }
          }
        }
      }
    }]
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: size }).run()
    }
  }
})

// Verhindert, dass programmatisches setContent() als Benutzeränderung gespeichert wird
let syncing = false

function setEditorContent(html) {
  if (!editor.value) return
  syncing = true
  editor.value.commands.setContent(html, false)
  syncing = false
}

const editor = useEditor({
  extensions: [StarterKit, TextStyle, FontSize],
  content: store.activeEntry?.content || '<p></p>',
  onUpdate({ editor }) {
    const entry = store.activeEntry
    if (syncing || !entry || entry.mode === 'markdown') return
    const html = editor.getHTML()
    if (html !== entry.content) store.updateContent(html)
  },
  onCreate({ editor }) {
    const entry = store.activeEntry
    if (entry && entry.mode !== 'markdown') {
      syncing = true
      editor.commands.setContent(entry.content || '<p></p>', false)
      syncing = false
    }
  }
})

// Markdown Textarea Inhalt
const markdownContent = ref(store.activeEntry?.content || '')

watch(() => store.activeId, () => {
  const entry = store.activeEntry
  if (!entry) return
  if (entry.mode === 'markdown') {
    markdownContent.value = entry.content || ''
  } else {
    setEditorContent(entry.content || '<p></p>')
  }
})

function onMarkdownInput(e) {
  markdownContent.value = e.target.value
  store.updateContent(e.target.value)
}

function switchMode(mode) {
  store.updateMode(mode)
  if (mode === 'markdown') {
    markdownContent.value = ''
  } else {
    setEditorContent('<p></p>')
  }
}
</script>

<template>
  <div class="editor-wrapper">

    <PageActions
      :disabled="!store.activeEntry"
      @create="store.createEntry"
      @delete="store.deleteEntry(store.activeId)"
    />

    <div class="card">

      <div class="toolbar">

        <!-- Modus-Wechsel -->
        <div class="mode-switch">
          <button
            class="mode-btn"
            :class="{ active: store.activeEntry?.mode !== 'markdown' }"
            @click="switchMode('richtext')"
          >Rich Text</button>
          <button
            class="mode-btn"
            :class="{ active: store.activeEntry?.mode === 'markdown' }"
            @click="switchMode('markdown')"
          >Markdown</button>
        </div>

        <!-- Rich Text Toolbar -->
        <template v-if="store.activeEntry?.mode !== 'markdown'">
          <select
            class="font-size-select"
            @change="editor.chain().focus().setFontSize($event.target.value).run()"
          >
            <option value="" disabled selected>Size</option>
            <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}</option>
          </select>

          <button
            class="fmt-btn"
            :class="{ active: editor?.isActive('bold') }"
            @click="editor.chain().focus().toggleBold().run()"
          ><b>B</b></button>

          <button
            class="fmt-btn"
            :class="{ active: editor?.isActive('italic') }"
            @click="editor.chain().focus().toggleItalic().run()"
          ><i>I</i></button>

          <button
            class="fmt-btn"
            :class="{ active: editor?.isActive('strike') }"
            @click="editor.chain().focus().toggleStrike().run()"
          ><s>S</s></button>
        </template>

      </div>

      <input
        class="title-input"
        placeholder="Title..."
        :value="store.activeEntry?.title"
        @input="store.updateTitle($event.target.value)"
      />

      <!-- Rich Text Editor -->
      <EditorContent
        v-if="store.activeEntry?.mode !== 'markdown'"
        :editor="editor"
        class="editor"
      />

      <!-- Markdown Editor -->
      <textarea
        v-else
        class="markdown-editor"
        :value="markdownContent"
        @input="onMarkdownInput"
        placeholder="# Write Markdown..."
      ></textarea>

    </div>
  </div>
</template>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--gray-card);
  border: 1px solid var(--gray-border);
  border-radius: 0 0 var(--radius-card) var(--radius-card);
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--gray-border);
  flex-wrap: wrap;
}

/* Modus-Switch */
.mode-switch {
  display: flex;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-right: 6px;
}

.mode-btn {
  padding: 4px 10px;
  border: none;
  background: var(--white);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font);
}

.mode-btn.active {
  background: var(--blue);
  color: var(--on-accent);
}

.font-size-select {
  padding: 4px 8px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
  font-family: var(--font);
  font-size: 13px;
  cursor: pointer;
}

.fmt-btn {
  padding: 4px 10px;
  border: 1px solid var(--gray-border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}

.fmt-btn.active {
  background: var(--blue);
  color: var(--on-accent);
  border-color: var(--blue);
}

.fmt-btn:hover:not(.active) { background: var(--gray-bg); }

.title-input {
  margin: 12px 14px 8px;
  padding: 7px 10px;
  font-size: 15px;
  border: 1px solid var(--gray-border);
  border-radius: 6px;
  background: var(--white);
  color: var(--text);
  outline: none;
}

.title-input::placeholder { color: var(--muted); }

.editor {
  flex: 1;
  margin: 0 14px 14px;
  padding: 10px;
  border: 1px solid var(--gray-border);
  border-radius: 6px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  background-color: #fff;
  background-image:
    linear-gradient(to right, #c8d8e8 1px, transparent 1px),
    linear-gradient(to bottom, #c8d8e8 1px, transparent 1px);
  background-size: 24px 24px;
}

.editor :deep(.tiptap) {
  outline: none;
  color: #b0b8c1;
  min-height: 100%;
}

.editor :deep(.tiptap.ProseMirror-focused) {
  color: var(--text);
}

/* Markdown Editor */
.markdown-editor {
  flex: 1;
  margin: 0 14px 14px;
  padding: 10px;
  border: 1px solid var(--gray-border);
  border-radius: 6px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  font-family: 'Courier New', monospace;
  background: var(--white);
  color: var(--text);
  resize: none;
  outline: none;
}

.markdown-editor::placeholder { color: var(--muted); }
</style>