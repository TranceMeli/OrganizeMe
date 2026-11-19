import { beforeEach, describe, expect, it } from 'vitest'
import { closeDialog, confirmDialog, dialog } from '@/composables/useDialog'

beforeEach(() => closeDialog(false))

describe('confirmDialog', () => {
  it('opens a destructive dialog with a Delete button by default', () => {
    confirmDialog({ title: 'Delete entry?', message: '“A” will be deleted permanently.' })

    expect(dialog.open).toBe(true)
    expect(dialog.title).toBe('Delete entry?')
    expect(dialog.message).toContain('“A”')
    expect(dialog.confirmLabel).toBe('Delete')
    expect(dialog.danger).toBe(true)
  })

  it('accepts a custom label and a non-destructive style', () => {
    confirmDialog({ title: 'Save?', confirmLabel: 'Save', danger: false })
    expect(dialog.confirmLabel).toBe('Save')
    expect(dialog.danger).toBe(false)
  })

  it('resolves true when confirmed and closes', async () => {
    const answer = confirmDialog({ title: 'Sure?' })
    closeDialog(true)

    await expect(answer).resolves.toBe(true)
    expect(dialog.open).toBe(false)
  })

  it('resolves false when cancelled', async () => {
    const answer = confirmDialog({ title: 'Sure?' })
    closeDialog(false)
    await expect(answer).resolves.toBe(false)
  })

  it('treats a dialog that is still open as cancelled when another one opens', async () => {
    const first = confirmDialog({ title: 'First' })
    const second = confirmDialog({ title: 'Second' })

    await expect(first).resolves.toBe(false)
    expect(dialog.title).toBe('Second')
    expect(dialog.open).toBe(true)

    closeDialog(true)
    await expect(second).resolves.toBe(true)
  })

  it('forgets the previous message when a new dialog has none', () => {
    confirmDialog({ title: 'One', message: 'with message' })
    confirmDialog({ title: 'Two' })
    expect(dialog.message).toBe('')
  })
})
