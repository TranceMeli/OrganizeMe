import { expect, test } from '@playwright/test'
import { api, goTo, openApp, openNotebook, resetData, savedIndicator, seed, shot } from './helpers'

test.beforeEach(async () => { await resetData() })

test.describe('notebook', () => {
  test('starts with an invitation and creates the first entry from it', async ({ page }) => {
    await openApp(page, { waitFor: '.empty-state' })
    await expect(page.locator('.empty-state h3')).toHaveText('Your first page is waiting')

    await page.getByRole('button', { name: 'New entry' }).click()

    await expect(page.locator('.empty-state')).toHaveCount(0)
    await expect(page.locator('.title-input')).toHaveValue('Entry 1')
    expect(await api.list('entries')).toHaveLength(1)
  })

  test('saves text while typing and keeps it after a reload', async ({ page }) => {
    await api.create('entries', { title: 'Diary', content: '<p></p>', mode: 'richtext' })
    await openNotebook(page)

    await page.locator('.editor .tiptap').click()
    await page.keyboard.type('Today I learned how autosave works.')
    await savedIndicator(page)

    await expect.poll(async () => (await api.list('entries'))[0].content).toContain('autosave works')

    await page.reload()
    await expect(page.locator('.editor .tiptap')).toContainText('Today I learned how autosave works.')
    await expect(page.locator('.content')).toContainText('autosave works')
  })

  test('shows the saved time next to the page title', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.locator('.title-input').fill('Renamed')
    await expect(page.locator('.save')).toHaveText(/Saved \d{1,2}:\d{2} (AM|PM)/)
  })

  test('renames an entry and the list follows', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.locator('.item', { hasText: 'Shopping list' }).click()
    await page.locator('.title-input').fill('Groceries')

    await expect(page.locator('.item', { hasText: 'Groceries' })).toBeVisible()
    await expect.poll(async () => (await api.list('entries')).map(e => e.title)).toContain('Groceries')
  })

  test('switches between entries without mixing up their content', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.locator('.item', { hasText: 'Shopping list' }).click()
    await expect(page.locator('.editor .tiptap')).toContainText('Bread, milk, coffee')

    await page.locator('.item', { hasText: 'Welcome' }).click()
    await expect(page.locator('.editor .tiptap')).toContainText('Finished the layout today')
    await expect(page.locator('.editor .tiptap')).not.toContainText('Bread')

    const before = await api.list('entries')
    await page.locator('.item', { hasText: 'Shopping list' }).click()
    await page.locator('.item', { hasText: 'Welcome' }).click()
    await page.waitForTimeout(800)
    expect(await api.list('entries')).toEqual(before)
  })

  test('formats text with the toolbar and shows it in the preview', async ({ page }) => {
    await api.create('entries', { title: 'Format', content: '<p></p>', mode: 'richtext' })
    await openNotebook(page)

    await page.locator('.editor .tiptap').click()
    await page.getByRole('button', { name: 'Bold' }).click()
    await page.keyboard.type('strong words')
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')

    await expect(page.locator('.content strong')).toHaveText('strong words')
  })

  test('writes Markdown and renders it in the preview', async ({ page }) => {
    await api.create('entries', { title: 'Notes', content: '<p></p>', mode: 'richtext' })
    await openNotebook(page)

    await page.getByRole('button', { name: 'Markdown' }).click()
    await page.locator('.markdown-editor').fill('# Big heading\n\n- first\n- second\n\n**bold** text')

    await expect(page.locator('.content h1')).toHaveText('Big heading')
    await expect(page.locator('.content li')).toHaveCount(2)
    await expect(page.locator('.content strong')).toHaveText('bold')
    await expect(page.locator('.mode-badge')).toHaveText('MD')

    await expect.poll(async () => (await api.list('entries'))[0].mode).toBe('markdown')
    await shot(page, 'notebook-markdown')
  })

  test('starts a mode switch with an empty entry and says so in the data', async ({ page }) => {
    await api.create('entries', { title: 'Switch', content: '<p>Rich text</p>', mode: 'richtext' })
    await openNotebook(page)

    await page.getByRole('button', { name: 'Markdown' }).click()
    await expect.poll(async () => (await api.list('entries'))[0].content).toBe('')

    await page.getByRole('button', { name: 'Rich Text' }).click()
    await expect.poll(async () => (await api.list('entries'))[0].mode).toBe('richtext')
  })

  test('creates a numbered entry with the New button', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.getByRole('button', { name: 'New', exact: true }).click()

    await expect(page.locator('.title-input')).toHaveValue('Entry 4')
    await expect(page.locator('.pg-sub').nth(1)).toHaveText('4 entries')
  })

  test('shows the full notebook spread', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await page.locator('.item', { hasText: 'Welcome' }).click()

    await expect(page.locator('.pg-head h2').first()).toHaveText('Today')
    await expect(page.locator('.pg-head h2').nth(1)).toHaveText('Entries')
    await shot(page, 'notebook')
  })

  test('keeps the notebook usable when switching away and back', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await page.locator('.item', { hasText: 'Shopping list' }).click()

    await goTo(page, 'Todos')
    await goTo(page, 'Notebook')

    await expect(page.locator('.title-input')).toHaveValue('Shopping list')
    await expect(page.locator('.editor .tiptap')).toContainText('Bread')
  })
})
