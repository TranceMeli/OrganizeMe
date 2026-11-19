import { expect, test } from '@playwright/test'
import { api, goTo, openApp, resetData, seed, shot } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetData()
  await seed()
  await openApp(page)
  await goTo(page, 'Code')
  await expect(page.locator('.monaco-editor')).toBeVisible()
})

test.describe('code snippets', () => {
  test('opens a snippet in the editor with its code', async ({ page }) => {
    await expect(page.locator('.title-input')).toHaveValue('Fibonacci')
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('function fib(n)')
    await expect(page.locator('.lang-select')).toHaveValue('javascript')
  })

  test('shows a highlighted preview with the language badge', async ({ page }) => {
    await expect(page.locator('.lang-badge')).toHaveText('javascript')
    await expect(page.locator('.code-preview code .hljs-keyword').first()).toBeVisible()
    await expect(page.locator('.code-preview')).toContainText('console.log(fib(10))')
  })

  test('saves typed code', async ({ page, browserName }) => {
    // Playwright's WebKit on Windows does not deliver Ctrl+A to Monaco, so the code cannot be replaced
    test.skip(browserName === 'webkit' && process.platform === 'win32', 'Ctrl+A does not reach Monaco in WebKit on Windows')
    await page.locator('.monaco-editor .view-lines').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('const answer = 42')

    await expect.poll(async () => (await api.list('snippets'))[0].code).toBe('const answer = 42')
    await expect(page.locator('.code-preview')).toContainText('const answer = 42')
  })

  test('renames a snippet and the list follows', async ({ page }) => {
    await page.locator('.title-input').fill('Fibonacci v2')

    await expect(page.locator('.item', { hasText: 'Fibonacci v2' })).toBeVisible()
    await expect.poll(async () => (await api.list('snippets'))[0].title).toBe('Fibonacci v2')
  })

  test('changes the language and the badge follows', async ({ page }) => {
    await page.locator('.lang-select').selectOption('python')

    await expect(page.locator('.lang-badge')).toHaveText('python')
    await expect.poll(async () => (await api.list('snippets'))[0].language).toBe('python')
  })

  test('offers the ten languages', async ({ page }) => {
    const options = await page.locator('.lang-select option').allTextContents()
    expect(options).toHaveLength(10)
    expect(options).toEqual(expect.arrayContaining(['javascript', 'typescript', 'python', 'csharp', 'sql']))
  })

  test('creates a new snippet with starter code', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click()

    await expect(page.locator('.title-input')).toHaveValue('Snippet 2')
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('// Write here...')
    await expect(page.locator('.pg-sub').nth(1)).toHaveText('2 saved')
  })

  test('switches between snippets without mixing up their code', async ({ page }) => {
    await api.create('snippets', { title: 'Other', code: 'print("hi")', language: 'python' })
    await page.reload()
    await goTo(page, 'Code')
    await expect(page.locator('.monaco-editor')).toBeVisible()

    await page.locator('.item', { hasText: 'Fibonacci' }).click()
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('function fib(n)')

    await page.locator('.item', { hasText: 'Other' }).click()
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('print("hi")')
    await expect(page.locator('.lang-select')).toHaveValue('python')

    // Loading a snippet must not count as an edit
    const before = await api.list('snippets')
    await page.locator('.item', { hasText: 'Fibonacci' }).click()
    await page.waitForTimeout(1200)
    expect(await api.list('snippets')).toEqual(before)
  })

  test('deletes a snippet after confirmation', async ({ page }) => {
    await page.locator('.page-actions button[aria-label="Delete"]').click()
    await expect(page.locator('.modal-title')).toHaveText('Delete snippet?')
    await page.locator('.btn-confirm').click()

    await expect.poll(async () => (await api.list('snippets')).length).toBe(0)
    await expect(page.locator('.empty-state h3')).toHaveText('Save your first snippet')
  })

  test('shows the code page', async ({ page }) => {
    await shot(page, 'code')
  })
})
