import { mkdirSync } from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { expect, test } from '@playwright/test'

// The production suite runs its own backend on another port and sets E2E_API_PORT in its config
export const API = `http://localhost:${process.env.E2E_API_PORT || 3181}`

// Screenshots of the key states are written here and shown in tests.md
const SHOT_DIR = path.resolve('..', 'docs', 'tests')
mkdirSync(SHOT_DIR, { recursive: true })

async function call(method, route, body) {
  const res = await fetch(API + route, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`${method} ${route} failed with HTTP ${res.status}`)
  return res.json()
}

export const api = {
  list: (collection) => call('GET', `/${collection}`),
  create: (collection, item) => call('POST', `/${collection}`, item),
  update: (collection, id, item) => call('PUT', `/${collection}/${id}`, item)
}

/** Empties every collection, so each test starts from a known state. */
export async function resetData() {
  for (const collection of ['entries', 'drawings', 'todos', 'snippets']) {
    for (const item of await api.list(collection)) await call('DELETE', `/${collection}/${item.id}`)
  }
}

/** Sample content that looks like a lived-in diary. */
export async function seed() {
  await api.create('entries', { title: 'Shopping list', content: '<p>Bread, milk, coffee</p>', mode: 'richtext' })
  await api.create('entries', { title: 'Project ideas', content: '# Project ideas\n\n- Weekly planner\n- Flashcards', mode: 'markdown' })
  await api.create('entries', {
    title: 'Welcome to OrganizeMe',
    content: '<p>Finished the layout today. The tabs sit on the page edge like markers in a real book.</p><p><strong>Tomorrow:</strong> sketch the cover.</p>',
    mode: 'richtext'
  })
  for (const title of ['Do the weekly shopping', 'Prepare the presentation', 'Sort tax documents']) {
    await api.create('todos', { title })
  }
  for (const title of ['Set up backups', 'Write the README']) {
    const todo = await api.create('todos', { title })
    await api.update('todos', todo.id, { title, done: true })
  }
  await api.create('snippets', {
    title: 'Fibonacci',
    language: 'javascript',
    code: 'function fib(n) {\n  if (n < 2) return n\n  return fib(n - 1) + fib(n - 2)\n}\n\nconsole.log(fib(10)) // 55'
  })
  await api.create('drawings', { title: 'Sketch', data: '' })
}

/** Opens the app and waits until the data has loaded. */
export async function openApp(page, { waitFor = '.pg-body' } = {}) {
  await page.goto('/')
  // The Vue devtools button of the dev server would show up in every screenshot
  await page.addStyleTag({ content: '.vue-devtools__anchor{display:none!important}' })
  await page.waitForSelector(waitFor)
  await expect(page.locator('.skeleton')).toHaveCount(0)
}

/**
 * Opens the app on an entry that has the rich text editor.
 * The backend lists entries by creation second, so entries seeded together can come back in any
 * order, and a Markdown entry would show a textarea instead of the editor.
 */
export async function openNotebook(page) {
  await openApp(page)
  const shopping = page.locator('.item', { hasText: 'Shopping list' })
  if (await shopping.count()) await shopping.click()
  await expect(page.locator('.editor')).toBeVisible()
}

export async function goTo(page, name) {
  await page.locator(`.tab[aria-label="${name}"]`).click()
  await expect(page.locator(`.tab[aria-label="${name}"]`)).toHaveAttribute('aria-current', 'page')
}

export async function shot(page, name) {
  // Chromium writes the images that tests.md shows. The other browsers keep their own folder,
  // so a run in Firefox or WebKit never overwrites them.
  const project = test.info().project.name
  const dir = project === 'chromium' ? SHOT_DIR : path.join(SHOT_DIR, 'browsers')
  mkdirSync(dir, { recursive: true })
  const file = project === 'chromium' ? `${name}.png` : `${project}-${name}.png`
  await page.screenshot({ path: path.join(dir, file) })
}

/** Waits until the save indicator has settled. */
export async function savedIndicator(page) {
  await expect(page.locator('.save')).toContainText('Saved')
}

/**
 * A real PNG full of random pixels, as a data URL. Noise does not compress, so the size is
 * predictable: roughly width * height * 4 bytes before base64.
 */
export function noisePng(width, height) {
  const rowLength = width * 4 + 1
  const raw = Buffer.alloc(rowLength * height)
  for (let y = 0; y < height; y++) {
    raw[y * rowLength] = 0 // filter type: none
    for (let x = 0; x < width * 4; x++) raw[y * rowLength + 1 + x] = (Math.random() * 256) | 0
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 6, 0, 0, 0], 8) // 8 bit, RGBA

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
  return `data:image/png;base64,${png.toString('base64')}`
}
