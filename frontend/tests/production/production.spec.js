import path from 'node:path'
import { expect, test } from '@playwright/test'
import { api, goTo, openApp, openNotebook, resetData, savedIndicator, seed, shot } from '../e2e/helpers'

// These tests run against the production build, not the dev server.

const WEB = `http://localhost:${process.env.E2E_WEB_PORT}`
const API = `http://localhost:${process.env.E2E_API_PORT}`

test.beforeEach(async () => { await resetData() })

test.describe('production build', () => {
  test('starts, loads the data and shows the diary', async ({ page }) => {
    await seed()
    await openNotebook(page)

    await expect(page).toHaveTitle('OrganizeMe')
    await expect(page.locator('.pg-head h2').first()).toHaveText('Today')
    await expect(page.locator('.tab')).toHaveCount(4)
    await shot(page, 'production-notebook')
  })

  test('works from the first entry to a saved page', async ({ page }) => {
    await openApp(page, { waitFor: '.empty-state' })
    await page.getByRole('button', { name: 'New entry' }).click()
    await page.locator('.editor .tiptap').click()
    await page.keyboard.type('Written in the production build')
    await savedIndicator(page)

    await expect.poll(async () => (await api.list('entries'))[0].content).toContain('production build')
    await page.reload()
    await expect(page.locator('.editor .tiptap')).toContainText('production build')
  })

  test('opens every tool without errors, requests to other hosts, or failed requests', async ({ page }) => {
    await seed()
    const outside = []
    const failed = []
    const errors = []
    page.on('request', request => {
      const url = request.url()
      if (!url.startsWith(WEB) && !url.startsWith(API) && !/^(data|blob|about):/.test(url)) outside.push(url)
    })
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`) })
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`) })
    page.on('pageerror', error => errors.push(String(error)))

    await openNotebook(page)
    for (const tool of ['Drawing', 'Todos', 'Code', 'Notebook']) await goTo(page, tool)
    await page.waitForTimeout(500)

    expect(outside).toEqual([])
    expect(failed).toEqual([])
    expect(errors).toEqual([])
  })

  test('contains no development tooling', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await expect(page.locator('[class*="vue-devtools"]')).toHaveCount(0)
    expect(await page.evaluate(() => typeof window.__VUE_DEVTOOLS_GLOBAL_HOOK__)).not.toBe('function')
  })

  test('serves scripts, styles and fonts with the right content types', async ({ page }) => {
    await seed()
    const types = new Map()
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.origin !== WEB) return
      const extension = path.extname(url.pathname)
      if (extension) types.set(extension, response.headers()['content-type'])
    })
    await openNotebook(page)
    await goTo(page, 'Code')

    expect(types.get('.js')).toMatch(/javascript/)
    expect(types.get('.css')).toMatch(/text\/css/)
    expect(types.get('.woff2')).toMatch(/font\/woff2|application\/octet-stream|woff2/)
  })

  test('loads its bundled fonts', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await page.evaluate(() => document.fonts.ready)
    const loaded = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))
    expect(loaded).toEqual(expect.arrayContaining(['Caveat', 'Nunito']))
  })

  test('opens the code editor with highlighting', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await goTo(page, 'Code')
    await expect(page.locator('.monaco-editor')).toBeVisible()
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('function fib(n)')
    await expect(page.locator('.code-preview code .hljs-keyword').first()).toBeVisible()
  })

  test('works when local storage is blocked', async ({ page }) => {
    await seed()
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } })
    })
    await openNotebook(page)

    await goTo(page, 'Todos')
    await page.getByLabel('Night mode').check()
    await expect(page.locator('.layout')).toHaveClass(/dark/)
    await expect(page.locator('.todo-item').first()).toBeVisible()
  })

  test('remembers the night mode and the tool in the real storage', async ({ page }) => {
    await seed()
    await openNotebook(page)
    await goTo(page, 'Todos')
    await page.getByLabel('Night mode').check()

    await page.reload()
    await expect(page.locator('.layout')).toHaveClass(/dark/)
    await expect(page.locator('.book')).toHaveAttribute('data-tool', 'todo')
  })

  test('keeps the JavaScript of the first page within its size budget', async ({ page }) => {
    // A guard against a dependency that suddenly doubles the download. Raise it on purpose if needed.
    await seed()
    const sizes = []
    page.on('response', response => {
      if (response.url().startsWith(WEB) && /\.js(\?|$)/.test(response.url())) sizes.push(response.body().then(body => body.length))
    })
    await openNotebook(page)
    await page.waitForLoadState('networkidle')

    const bytes = (await Promise.all(sizes)).reduce((sum, size) => sum + size, 0)
    expect(bytes, `the first page loads ${(bytes / 1e6).toFixed(2)} MB of JavaScript`).toBeLessThan(6_000_000)
  })

  test('starts Monaco with a worker instead of freezing the page', async ({ page }) => {
    await seed()
    const workers = []
    page.on('worker', worker => workers.push(worker.url()))
    await openNotebook(page)
    await goTo(page, 'Code')
    await expect(page.locator('.monaco-editor')).toBeVisible()
    await expect.poll(() => workers.length).toBeGreaterThan(0)
  })
})
