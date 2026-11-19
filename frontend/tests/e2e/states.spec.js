import { expect, test } from '@playwright/test'
import { api, goTo, openApp, openNotebook, resetData, seed, shot } from './helpers'

test.beforeEach(async () => { await resetData() })

test.describe('loading', () => {
  test('shows a skeleton while the server is slow, then the content', async ({ page }) => {
    await seed()
    await page.route('**/entries', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      await route.continue()
    })

    await page.goto('/')
    await page.addStyleTag({ content: '.vue-devtools__anchor{display:none!important}' })
    await expect(page.locator('.skeleton')).toBeVisible()
    await expect(page.locator('.skeleton')).toContainText('Opening your notebook')
    await shot(page, 'state-loading')

    await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('.editor')).toBeVisible()
  })
})

test.describe('empty states', () => {
  const cases = [
    ['Notebook', 'Your first page is waiting', 'New entry', 'state-empty-notebook'],
    ['Drawing', 'Start your first sketch', 'New drawing', 'state-empty-drawing'],
    ['Code', 'Save your first snippet', 'New snippet', 'state-empty-code']
  ]

  for (const [tool, headline, action, name] of cases) {
    test(`${tool} invites you to start`, async ({ page }) => {
      await openApp(page, { waitFor: '.empty-state' })
      await goTo(page, tool)

      await expect(page.locator('.empty-state h3')).toHaveText(headline)
      await expect(page.getByRole('button', { name: action })).toBeVisible()
      await shot(page, name)

      await page.getByRole('button', { name: action }).click()
      await expect(page.locator('.empty-state')).toHaveCount(0)
    })
  }

  test('the todo tool shows its editor, not an empty state', async ({ page }) => {
    await openApp(page, { waitFor: '.empty-state' })
    await goTo(page, 'Todos')

    await expect(page.locator('.empty-state')).toHaveCount(0)
    await expect(page.locator('.new-input')).toBeVisible()
    await expect(page.getByText('No open todos')).toBeVisible()
  })
})

test.describe('server problems', () => {
  test('explains that the server cannot be reached and recovers with Try again', async ({ page }) => {
    await seed()
    await page.route('**/todos', route => route.abort())
    await page.goto('/')
    await page.addStyleTag({ content: '.vue-devtools__anchor{display:none!important}' })

    const banner = page.locator('.load-error')
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute('role', 'alert')
    await expect(banner).toContainText("Can't reach the server")
    await expect(banner).toContainText('npm start')
    await expect(page.locator('.pg-note')).toBeVisible()
    await shot(page, 'state-server-error')

    await page.unroute('**/todos')
    await page.getByRole('button', { name: 'Try again' }).click()

    await expect(banner).toHaveCount(0)
    await expect(page.locator('.editor')).toBeVisible()
  })

  test('reports a failed save and saves again after Retry', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await page.locator('.item', { hasText: 'Shopping list' }).click()

    await page.route(/\/entries\/[\w-]+$/, route => route.request().method() === 'PUT' ? route.abort() : route.continue())
    await page.locator('.title-input').fill('Edited while offline')

    await expect(page.locator('.save')).toContainText("Couldn't save")
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    expect((await api.list('entries')).map(e => e.title)).not.toContain('Edited while offline')
    await shot(page, 'state-save-failed')

    await page.unroute(/\/entries\/[\w-]+$/)
    await page.getByRole('button', { name: 'Retry' }).click()

    await expect(page.locator('.save')).toContainText('Saved')
    await expect.poll(async () => (await api.list('entries')).map(e => e.title)).toContain('Edited while offline')
  })

  test('shows a saving state while the server is slow', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.route(/\/entries\/[\w-]+$/, async route => {
      await new Promise(resolve => setTimeout(resolve, 1200))
      await route.continue()
    })
    await page.locator('.title-input').fill('Slow save')

    await expect(page.locator('.save')).toContainText('Saving…')
    await expect(page.locator('.save')).toContainText('Saved', { timeout: 10_000 })
  })

  test('lets the user dismiss a failure that cannot be repeated', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.route(/\/entries\/[\w-]+$/, route => route.request().method() === 'DELETE' ? route.abort() : route.continue())
    await page.locator('.page-actions button[aria-label="Delete"]').click()
    await page.locator('.btn-confirm').click()

    await expect(page.locator('.save')).toContainText("Couldn't save")
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.locator('.save')).not.toContainText("Couldn't save")
    expect(await api.list('entries')).toHaveLength(3)
  })

  test('keeps the typed text on screen while the save fails', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await page.route(/\/entries\/[\w-]+$/, route => route.request().method() === 'PUT' ? route.abort() : route.continue())
    await page.locator('.editor .tiptap').click()
    await page.keyboard.type(' still here')

    await expect(page.locator('.save')).toContainText("Couldn't save")
    await expect(page.locator('.editor .tiptap')).toContainText('still here')
  })
})

test.describe('confirmation dialog', () => {
  test.beforeEach(async ({ page }) => {
    await seed()
    await openNotebook(page)
  })

  const open = (page) => page.locator('.page-actions button[aria-label="Delete"]').click()

  test('names the entry and focuses Cancel', async ({ page }) => {
    await page.locator('.item', { hasText: 'Welcome' }).click()
    await open(page)

    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal')).toHaveAttribute('role', 'alertdialog')
    await expect(page.locator('.modal-title')).toHaveText('Delete entry?')
    await expect(page.locator('.modal-message')).toContainText('Welcome to OrganizeMe')
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
    // The dialog fades in over 120 ms; wait so the screenshot shows it fully opaque
    await page.waitForTimeout(250)
    await shot(page, 'dialog-delete')
  })

  test('Escape, Cancel and a click outside keep the entry', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal')).toHaveCount(0)

    await open(page)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)

    await open(page)
    await page.mouse.click(5, 5)
    await expect(page.locator('.modal')).toHaveCount(0)

    expect(await api.list('entries')).toHaveLength(3)
  })

  test('pressing Enter right away does not delete anything', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Enter')
    await expect(page.locator('.modal')).toHaveCount(0)
    expect(await api.list('entries')).toHaveLength(3)
  })

  test('deletes the entry when confirmed and selects another one', async ({ page }) => {
    await open(page)
    await page.locator('.btn-confirm').click()

    await expect(page.locator('.modal')).toHaveCount(0)
    await expect.poll(async () => (await api.list('entries')).length).toBe(2)
    await expect(page.locator('.item')).toHaveCount(2)
    await expect(page.locator('.title-input')).not.toHaveValue('')
  })

  test('keeps the keyboard focus inside the dialog', async ({ page }) => {
    await open(page)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement.closest('.modal'))).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await page.evaluate(() => !!document.activeElement.closest('.modal'))).toBe(true)
  })

  test('returns the focus to the delete button afterwards', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('.page-actions button[aria-label="Delete"]')).toBeFocused()
  })

  test('is shown in night mode too', async ({ page }) => {
    await page.getByLabel('Night mode').check()
    await open(page)
    await page.waitForTimeout(250)
    await shot(page, 'dialog-delete-night')
    await expect(page.locator('.modal')).toBeVisible()
  })

  test('has no native browser dialog', async ({ page }) => {
    let native = 0
    page.on('dialog', async dialog => { native++; await dialog.dismiss() })
    await open(page)
    await page.locator('.btn-confirm').click()
    await expect.poll(async () => (await api.list('entries')).length).toBe(2)
    expect(native).toBe(0)
  })
})
