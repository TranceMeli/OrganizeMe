import { resource } from '@/utils/api'

const snippets = resource('snippets')

export const getSnippets = snippets.list
export const createSnippet = snippets.create
export const updateSnippet = snippets.update
export const deleteSnippet = snippets.remove
