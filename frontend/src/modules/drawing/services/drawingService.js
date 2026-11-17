import { resource } from '@/utils/api'

const drawings = resource('drawings')

export const getDrawings = drawings.list
export const createDrawing = drawings.create
export const updateDrawing = drawings.update
export const deleteDrawing = drawings.remove
