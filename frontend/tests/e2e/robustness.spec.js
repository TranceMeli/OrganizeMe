import { expect, test } from '@playwright/test'
import { api, goTo, noisePng, openApp, openNotebook, resetData, seed, shot } from './helpers'

test.beforeEach(async () => { await resetData() })

test.describe('connection problems during a session', () => {
  test('keeps the text when the connection drops, and saves it after it returns', async ({ page, context }) => {
    await seed()
    await openNotebook(page)

    await context.setOffline(true)
    await page.locator('.editor .tiptap').click()
    await page.keyboard.type(' typed while offline')

    await expect(page.locator('.save')).toContainText("Couldn't save")
    await expect(page.locator('.editor .tiptap')).toContainText('typed while offline')
    await shot(page, 'state-offline')

    await context.setOffline(false)
    await page.getByRole('button', { name: 'Retry' }).click()

    await expect(page.locator('.save')).toContainText('Saved')
    await expect.poll(async () => (await api.list('entries')).some(e => e.content.includes('typed while offline'))).toBe(true)
  })

  test('shows one failure for several edits, and one Retry saves the latest text', async ({ page, context }) => {
    await seed()
    await openNotebook(page)

    await context.setOffline(true)
    await page.locator('.editor .tiptap').click()
    for (const word of [' one', ' two', ' three']) {
      await page.keyboard.type(word)
      await page.waitForTimeout(700)
    }
    await expect(page.locator('.save')).toContainText("Couldn't save")
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1)

    await context.setOffline(false)
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('.save')).toContainText('Saved')
    await expect.poll(async () => (await api.list('entries')).some(e => e.content.includes('one two three'))).toBe(true)
  })

  test('a later successful save replaces the old failure for the same entry', async ({ page, context }) => {
    await seed()
    await openNotebook(page)

    await context.setOffline(true)
    await page.locator('.title-input').fill('First try')
    await expect(page.locator('.save')).toContainText("Couldn't save")

    await context.setOffline(false)
    await page.locator('.title-input').fill('Second try')
    await expect(page.locator('.save')).toContainText('Saved')
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0)
    await expect.poll(async () => (await api.list('entries')).map(e => e.title)).toContain('Second try')
  })
})

test.describe('two tabs', () => {
  test('documents that the last save wins when two tabs edit the same entry', async ({ context }) => {
    // There is no live sync between tabs. This test pins the current behaviour, so a change to it is a decision.
    await seed()
    const a = await context.newPage()
    const b = await context.newPage()
    await openNotebook(a)
    await openNotebook(b)
    const original = await a.locator('.title-input').inputValue()

    await a.locator('.title-input').fill('Title from tab A')
    await expect(a.locator('.save')).toContainText('Saved')

    await b.locator('.editor .tiptap').click()
    await b.keyboard.type(' text from tab B')
    await expect(b.locator('.save')).toContainText('Saved')

    const stored = (await api.list('entries')).find(e => e.content.includes('text from tab B'))
    expect(stored.title, 'tab B still held the old title and wrote it back').toBe(original)

    await b.reload()
    await expect(b.locator('.title-input')).not.toHaveValue('Title from tab A')
  })

  test('shows entries created in another tab after a reload', async ({ context }) => {
    await seed()
    const a = await context.newPage()
    const b = await context.newPage()
    await openNotebook(a)
    await openNotebook(b)

    await a.getByRole('button', { name: 'New', exact: true }).click()
    await expect(a.locator('.pg-sub').nth(1)).toHaveText('4 entries')
    await expect(b.locator('.pg-sub').nth(1)).toHaveText('3 entries')

    await b.reload()
    await expect(b.locator('.pg-sub').nth(1)).toHaveText('4 entries')
  })
})

test.describe('lots of data', () => {
  test('opens a notebook with 300 entries quickly and keeps the list usable', async ({ page }) => {
    const titles = Array.from({ length: 300 }, (_, i) => `Entry number ${i + 1}`)
    for (let i = 0; i < titles.length; i += 25) {
      await Promise.all(titles.slice(i, i + 25).map(title => api.create('entries', { title, content: `<p>${title}</p>`, mode: 'richtext' })))
    }

    const started = Date.now()
    await openApp(page, { waitFor: '.item' })
    const loadedIn = Date.now() - started

    await expect(page.locator('.pg-sub').nth(1)).toHaveText('300 entries')
    await expect(page.locator('.item')).toHaveCount(300)
    expect(loadedIn, `loading took ${loadedIn} ms`).toBeLessThan(8000)

    // The list scrolls inside its own area instead of pushing the page down
    const list = page.locator('.item-list')
    expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)

    const last = page.locator('.item', { hasText: 'Entry number 150' }).first()
    await last.scrollIntoViewIfNeeded()
    await last.click()
    await expect(page.locator('.title-input')).toHaveValue('Entry number 150')
    await shot(page, 'many-entries')
  })

  test('opens a gallery with a large drawing', async ({ page }) => {
    const data = noisePng(900, 900)
    expect(data.length).toBeGreaterThan(3_000_000)
    await api.create('drawings', { title: 'Big sketch', data })

    await openApp(page)
    await goTo(page, 'Drawing')

    await expect(page.locator('.preview-img')).toBeVisible()
    expect(await page.locator('.preview-img').evaluate(img => img.naturalWidth)).toBe(900)
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('saves a drawing of several megabytes through the whole stack', async ({ page }) => {
    await api.create('drawings', { title: 'Heavy', data: '' })
    await openApp(page)
    await goTo(page, 'Drawing')

    const box = await page.locator('canvas').boundingBox()
    await page.getByLabel('Width').fill('30')
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(box.x + 20, box.y + 40 + i * 50)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width - 20, box.y + 60 + i * 50, { steps: 12 })
      await page.mouse.up()
    }

    await expect.poll(async () => (await api.list('drawings'))[0].data.length, { timeout: 10_000 }).toBeGreaterThan(1000)
    await expect(page.locator('.save')).toContainText('Saved')
  })
})

test.describe('browser settings', () => {
  test('starts with the default look when the saved settings are damaged', async ({ page }) => {
    await seed()
    await page.addInitScript(() => localStorage.setItem('organizeme-ui', '{"dark": tru'))
    await openNotebook(page)

    await expect(page.locator('.layout')).not.toHaveClass(/dark/)
    await expect(page.locator('.book')).toHaveAttribute('data-tool', 'notebook')
  })
})

test.describe('privacy and errors', () => {
  test('only talks to its own server: no fonts or scripts from other websites', async ({ page }) => {
    await seed()
    const outside = []
    const consoleErrors = []
    page.on('request', request => {
      const url = request.url()
      if (!/^(data:|blob:|about:|http:\/\/localhost:(5281|3181)\/)/.test(url)) outside.push(url)
    })
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleErrors.push(`${message.type()}: ${message.text()}`) })
    page.on('pageerror', error => consoleErrors.push(String(error)))

    await openNotebook(page)
    for (const tool of ['Drawing', 'Todos', 'Code', 'Notebook']) await goTo(page, tool)
    await page.waitForTimeout(500)

    expect(outside, `requests to other hosts:\n${outside.join('\n')}`).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('loads its fonts from the app, not from the system', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await page.evaluate(() => document.fonts.ready)

    const loaded = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))
    expect(loaded).toEqual(expect.arrayContaining(['Caveat', 'Nunito']))
  })
})
