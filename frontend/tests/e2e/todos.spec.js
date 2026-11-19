import { expect, test } from '@playwright/test'
import { api, goTo, openApp, resetData, seed, shot } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetData()
  await seed()
  await openApp(page)
  await goTo(page, 'Todos')
})

const open = (page) => page.locator('.todo-item:not(.done)')
const done = (page) => page.locator('.todo-item.done')

test.describe('todos', () => {
  test('lists open and done todos in their own sections', async ({ page }) => {
    await expect(open(page)).toHaveCount(3)
    await expect(done(page)).toHaveCount(2)
    await expect(page.locator('.section-label').first()).toHaveText(/open/i)
  })

  test('shows the progress on the right page', async ({ page }) => {
    await expect(page.locator('.progress-label')).toHaveText('2 of 5 done')
    await expect(page.locator('.progress-percent')).toHaveText('40%')
    await expect(page.locator('.pg-sub').nth(1)).toHaveText('3 open')
  })

  test('adds a todo with the Enter key and clears the field', async ({ page }) => {
    await page.locator('.new-input').fill('Water the plants')
    await page.keyboard.press('Enter')

    await expect(open(page)).toHaveCount(4)
    await expect(page.locator('.new-input')).toHaveValue('')
    await expect.poll(async () => (await api.list('todos')).map(t => t.title)).toContain('Water the plants')
  })

  test('adds a todo with the plus button', async ({ page }) => {
    await page.locator('.new-input').fill('Call mum')
    await page.locator('.add-btn').click()
    await expect(page.locator('.todo-title').first()).toHaveValue('Call mum')
  })

  test('ignores an empty or blank todo', async ({ page }) => {
    await page.locator('.new-input').fill('   ')
    await page.keyboard.press('Enter')

    await expect(open(page)).toHaveCount(3)
    expect(await api.list('todos')).toHaveLength(5)
  })

  test('checks a todo off, moves it to done and updates the progress', async ({ page }) => {
    // click() instead of check(): the item jumps to the other list, so Playwright could not verify the state
    await open(page).first().locator('.checkbox').click()

    await expect(open(page)).toHaveCount(2)
    await expect(done(page)).toHaveCount(3)
    await expect(page.locator('.progress-label')).toHaveText('3 of 5 done')
    await expect(page.locator('.progress-percent')).toHaveText('60%')
    await expect.poll(async () => (await api.list('todos')).filter(t => t.done === 1).length).toBe(3)
  })

  test('moves a done todo back to open', async ({ page }) => {
    await done(page).first().locator('.checkbox').click()
    await expect(open(page)).toHaveCount(4)
    await expect(page.locator('.progress-label')).toHaveText('1 of 5 done')
  })

  test('renames a todo in place', async ({ page }) => {
    const title = open(page).first().locator('.todo-title')
    await title.fill('Buy flowers')
    await title.press('Enter')
    await title.blur()

    await expect.poll(async () => (await api.list('todos')).map(t => t.title)).toContain('Buy flowers')
    await expect(page.locator('.preview-item', { hasText: 'Buy flowers' })).toBeVisible()
  })

  test('keeps the todo when the user cancels the deletion', async ({ page }) => {
    await open(page).first().hover()
    await open(page).first().locator('button[aria-label="Delete"]').click()
    await expect(page.locator('.modal-title')).toHaveText('Delete todo?')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(open(page)).toHaveCount(3)
    expect(await api.list('todos')).toHaveLength(5)
  })

  test('deletes a todo after confirmation', async ({ page }) => {
    const first = await open(page).first().locator('.todo-title').inputValue()
    await open(page).first().hover()
    await open(page).first().locator('button[aria-label="Delete"]').click()
    await expect(page.locator('.modal-message')).toContainText(first)
    await page.locator('.btn-confirm').click()

    await expect(open(page)).toHaveCount(2)
    await expect.poll(async () => (await api.list('todos')).length).toBe(4)
  })

  test('shows a friendly message when everything is done', async ({ page }) => {
    for (const todo of (await api.list('todos')).filter(t => !t.done)) {
      await api.update('todos', todo.id, { title: todo.title, done: true })
    }
    await page.reload()
    await goTo(page, 'Todos')

    await expect(page.locator('.preview-item .dot.open')).toHaveCount(0)
    await expect(page.getByText('All done!')).toBeVisible()
    await expect(page.locator('.progress-percent')).toHaveText('100%')
  })

  test('shows the todo page', async ({ page }) => {
    await shot(page, 'todos')
  })
})
