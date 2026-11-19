import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DialogHost from '@/components/DialogHost.vue'
import { closeDialog, confirmDialog, dialog } from '@/composables/useDialog'

let wrapper

async function open(options = {}) {
  const answer = confirmDialog({ title: 'Delete entry?', message: '“Shopping list” will be deleted permanently.', ...options })
  await nextTick()
  await nextTick()
  // Wrapped in an object: returning the promise itself would make `await open()` wait for the user's answer
  return { answer }
}

beforeEach(() => {
  closeDialog(false)
  wrapper = mount(DialogHost, { attachTo: document.body, props: { tool: 'notebook' } })
})

afterEach(() => {
  closeDialog(false)
  wrapper.unmount()
})

describe('DialogHost', () => {
  it('renders nothing while no dialog is open', () => {
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('shows the title and message of the question', async () => {
    await open()

    expect(wrapper.find('.modal-title').text()).toBe('Delete entry?')
    expect(wrapper.find('.modal-message').text()).toContain('Shopping list')
  })

  it('is an accessible alert dialog with a label and a description', async () => {
    await open()
    const modal = wrapper.find('.modal')

    expect(modal.attributes('role')).toBe('alertdialog')
    expect(modal.attributes('aria-modal')).toBe('true')
    expect(modal.attributes('aria-labelledby')).toBe('modal-title')
    expect(modal.attributes('aria-describedby')).toBe('modal-message')
  })

  it('focuses Cancel first, so a stray Enter cannot delete anything', async () => {
    await open()
    expect(document.activeElement).toBe(wrapper.find('.btn-cancel').element)
  })

  it('answers true when the confirm button is clicked', async () => {
    const { answer } = await open()
    await wrapper.find('.btn-confirm').trigger('click')

    await expect(answer).resolves.toBe(true)
    await nextTick()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('answers false when Cancel is clicked', async () => {
    const { answer } = await open()
    await wrapper.find('.btn-cancel').trigger('click')
    await expect(answer).resolves.toBe(false)
  })

  it('answers false when Escape is pressed', async () => {
    const { answer } = await open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await expect(answer).resolves.toBe(false)
  })

  it('answers false when the backdrop is clicked', async () => {
    const { answer } = await open()
    await wrapper.find('.modal-backdrop').trigger('mousedown')
    await expect(answer).resolves.toBe(false)
  })

  it('stays open when the click lands inside the dialog', async () => {
    await open()
    await wrapper.find('.modal').trigger('mousedown')
    expect(dialog.open).toBe(true)
  })

  it('uses the danger style for destructive questions', async () => {
    await open()
    expect(wrapper.find('.btn-confirm').classes()).toContain('danger')
    expect(wrapper.find('.btn-confirm').text()).toBe('Delete')
  })

  it('uses a custom confirm label and the normal style when asked', async () => {
    await open({ confirmLabel: 'Clear', danger: false })
    expect(wrapper.find('.btn-confirm').text()).toBe('Clear')
    expect(wrapper.find('.btn-confirm').classes()).not.toContain('danger')
  })

  it('uses the colour of the active tool', async () => {
    await wrapper.setProps({ tool: 'drawing' })
    await open()
    expect(wrapper.find('.modal-backdrop').attributes('style')).toContain('--tool-drawing')
  })

  it('keeps the keyboard focus inside the dialog when Tab goes past the last button', async () => {
    await open()
    wrapper.find('.btn-confirm').element.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('.btn-cancel').element)
  })

  it('wraps Shift+Tab from the first button to the last', async () => {
    await open()
    wrapper.find('.btn-cancel').element.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('.btn-confirm').element)
  })

  it('gives the focus back to the element that had it before', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { answer } = await open()
    closeDialog(false)
    await answer
    await nextTick()

    expect(document.activeElement).toBe(trigger)
  })

  it('returns the focus to the pressed button when the browser did not focus it on click', async () => {
    // Safari does not focus buttons that are clicked, so activeElement is <body> when the dialog opens
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(document.activeElement).toBe(document.body)

    const { answer } = await open()
    closeDialog(false)
    await answer
    await nextTick()

    expect(document.activeElement).toBe(button)
  })

  it('remembers the control even when the press lands on something inside it', async () => {
    const button = document.createElement('button')
    const icon = document.createElement('span')
    button.appendChild(icon)
    document.body.appendChild(button)
    icon.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    const { answer } = await open()
    closeDialog(false)
    await answer
    await nextTick()

    expect(document.activeElement).toBe(button)
  })
})
