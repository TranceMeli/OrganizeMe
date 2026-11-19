import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'

const mocks = vi.hoisted(() => ({
  status: null,
  retryFailed: vi.fn(),
  dismissFailed: vi.fn()
}))

vi.mock('@/composables/useSaveStatus', async () => {
  const { reactive } = await import('vue')
  mocks.status = reactive({ state: 'idle', savedAt: null, canRetry: false })
  return { saveStatus: mocks.status, retryFailed: mocks.retryFailed, dismissFailed: mocks.dismissFailed }
})

import SaveStatus from '@/components/SaveStatus.vue'

beforeEach(() => {
  Object.assign(mocks.status, { state: 'idle', savedAt: null, canRetry: false })
  vi.clearAllMocks()
})

describe('SaveStatus', () => {
  it('is a polite live region, so changes are announced', () => {
    const wrapper = mount(SaveStatus)
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
  })

  it('has no visible text while idle, but stays in the page for screen readers', () => {
    const wrapper = mount(SaveStatus)
    expect(wrapper.text()).toBe('')
    expect(wrapper.attributes('data-state')).toBe('idle')
  })

  it('shows Saving… with an icon', async () => {
    const wrapper = mount(SaveStatus)
    mocks.status.state = 'saving'
    await nextTick()

    expect(wrapper.text()).toContain('Saving…')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('shows the time of the last successful save', async () => {
    const wrapper = mount(SaveStatus)
    mocks.status.savedAt = new Date(2026, 10, 17, 14, 2)
    mocks.status.state = 'saved'
    await nextTick()

    expect(wrapper.text()).toContain('Saved 2:02 PM')
  })

  it('shows the failure in words, not only in colour', async () => {
    const wrapper = mount(SaveStatus)
    mocks.status.state = 'error'
    await nextTick()

    expect(wrapper.text()).toContain("Couldn't save")
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('offers Retry when the failed request can be repeated', async () => {
    const wrapper = mount(SaveStatus)
    Object.assign(mocks.status, { state: 'error', canRetry: true })
    await nextTick()

    const button = wrapper.find('button')
    expect(button.text()).toBe('Retry')
    await button.trigger('click')
    expect(mocks.retryFailed).toHaveBeenCalledTimes(1)
  })

  it('offers Dismiss when nothing can be repeated', async () => {
    const wrapper = mount(SaveStatus)
    Object.assign(mocks.status, { state: 'error', canRetry: false })
    await nextTick()

    const button = wrapper.find('button')
    expect(button.text()).toBe('Dismiss')
    await button.trigger('click')
    expect(mocks.dismissFailed).toHaveBeenCalledTimes(1)
  })
})
