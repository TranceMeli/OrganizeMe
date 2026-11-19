import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageActions from '@/components/PageActions.vue'
import ItemList from '@/components/ItemList.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageSkeleton from '@/components/PageSkeleton.vue'

describe('PageActions', () => {
  it('shows a New button and a labelled delete button', () => {
    const wrapper = mount(PageActions)
    expect(wrapper.find('.btn-new').text()).toBe('New')
    expect(wrapper.find('button[aria-label="Delete"]').exists()).toBe(true)
  })

  it('emits create and delete', async () => {
    const wrapper = mount(PageActions)
    await wrapper.find('.btn-new').trigger('click')
    await wrapper.find('button[aria-label="Delete"]').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('disables only delete, because creating must work with nothing selected', () => {
    const wrapper = mount(PageActions, { props: { disabled: true } })
    expect(wrapper.find('button[aria-label="Delete"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.btn-new').attributes('disabled')).toBeUndefined()
  })

  it('does not emit delete while disabled', async () => {
    const wrapper = mount(PageActions, { props: { disabled: true } })
    await wrapper.find('button[aria-label="Delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
  })
})

describe('ItemList', () => {
  const items = [
    { id: '1', title: 'First', created_at: '2026-11-17 10:00:00' },
    { id: '2', title: '', created_at: '2026-05-08 10:00:00' },
    { id: '3', title: 'Third' }
  ]

  it('shows one button per item with title and short date', () => {
    const wrapper = mount(ItemList, { props: { items, activeId: '1' } })
    const buttons = wrapper.findAll('.item')

    expect(buttons).toHaveLength(3)
    expect(buttons[0].text()).toContain('First')
    expect(buttons[0].text()).toContain('Nov 17')
  })

  it('falls back to "Untitled" for an empty title', () => {
    const wrapper = mount(ItemList, { props: { items, activeId: '1' } })
    expect(wrapper.findAll('.item')[1].text()).toContain('Untitled')
  })

  it('shows no date when an item has none', () => {
    const wrapper = mount(ItemList, { props: { items, activeId: '1' } })
    expect(wrapper.findAll('.item')[2].find('.item-date').text()).toBe('')
  })

  it('marks only the active item', () => {
    const wrapper = mount(ItemList, { props: { items, activeId: '2' } })
    const active = wrapper.findAll('.item').map(b => b.classes('active'))
    expect(active).toEqual([false, true, false])
  })

  it('emits the id of the clicked item', async () => {
    const wrapper = mount(ItemList, { props: { items, activeId: '1' } })
    await wrapper.findAll('.item')[2].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['3']])
  })

  it('says so when the list is empty', () => {
    const wrapper = mount(ItemList, { props: { items: [], activeId: null } })
    expect(wrapper.find('.item').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nothing here yet')
  })
})

describe('EmptyState', () => {
  it('shows the headline, the explanation and the action', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Your first page is waiting', text: 'Write a note.', action: 'New entry' }
    })

    expect(wrapper.find('h3').text()).toBe('Your first page is waiting')
    expect(wrapper.find('p').text()).toBe('Write a note.')
    expect(wrapper.find('button').text()).toBe('New entry')
  })

  it('emits action when the button is clicked', async () => {
    const wrapper = mount(EmptyState, { props: { title: 'T', text: 't', action: 'Go' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('hides its decorative icon from screen readers', () => {
    const wrapper = mount(EmptyState, { props: { title: 'T', text: 't', action: 'Go' } })
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })
})

describe('PageSkeleton', () => {
  it('announces that the notebook is opening', () => {
    const wrapper = mount(PageSkeleton)
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Opening your notebook')
  })

  it('draws placeholder bars', () => {
    expect(mount(PageSkeleton).findAll('.bar').length).toBeGreaterThanOrEqual(3)
  })
})
