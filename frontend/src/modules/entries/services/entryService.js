import { resource } from '@/utils/api'

const entries = resource('entries')

export const getEntries = entries.list
export const createEntry = entries.create
export const updateEntry = entries.update
export const deleteEntry = entries.remove
