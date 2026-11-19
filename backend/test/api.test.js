import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'

// The database module reads DB_PATH when it is imported, so set it first.
// An in-memory database keeps the tests away from the real entries.db.
process.env.DB_PATH = ':memory:'

const { app } = await import('../app.js')
const { initDb } = await import('../db.js')

let server
let base

before(async () => {
  await initDb()
  server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

after(() => new Promise(resolve => server.close(resolve)))

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, headers: res.headers, body: text ? safeJson(text) : null }
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return text }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('database setup', () => {
  test('initDb can run again without failing', async () => {
    await assert.doesNotReject(initDb())
  })
})

describe('entries', () => {
  test('creates an entry with a generated id and the rich text mode by default', async () => {
    const res = await call('POST', '/entries', { title: 'First', content: '<p>Hi</p>' })
    assert.equal(res.status, 200)
    assert.match(res.body.id, UUID)
    assert.equal(res.body.title, 'First')
    assert.equal(res.body.content, '<p>Hi</p>')
    assert.equal(res.body.mode, 'richtext')
    assert.ok(res.body.created_at)
  })

  test('keeps the markdown mode it was created with', async () => {
    const res = await call('POST', '/entries', { title: 'MD', content: '# Heading', mode: 'markdown' })
    assert.equal(res.body.mode, 'markdown')
  })

  test('lists created entries', async () => {
    const created = await call('POST', '/entries', { title: 'Listed', content: 'x' })
    const list = await call('GET', '/entries')
    assert.equal(list.status, 200)
    assert.ok(Array.isArray(list.body))
    assert.ok(list.body.some(e => e.id === created.body.id))
  })

  test('updates title, content and mode', async () => {
    const { body: entry } = await call('POST', '/entries', { title: 'Old', content: 'old' })
    const put = await call('PUT', `/entries/${entry.id}`, { title: 'New', content: '# new', mode: 'markdown' })
    assert.deepEqual(put.body, { success: true })

    const stored = (await call('GET', '/entries')).body.find(e => e.id === entry.id)
    assert.equal(stored.title, 'New')
    assert.equal(stored.content, '# new')
    assert.equal(stored.mode, 'markdown')
  })

  test('falls back to rich text when an update does not send a mode', async () => {
    const { body: entry } = await call('POST', '/entries', { title: 'T', content: 'c', mode: 'markdown' })
    await call('PUT', `/entries/${entry.id}`, { title: 'T', content: 'c' })
    const stored = (await call('GET', '/entries')).body.find(e => e.id === entry.id)
    assert.equal(stored.mode, 'richtext')
  })

  test('deletes an entry', async () => {
    const { body: entry } = await call('POST', '/entries', { title: 'Gone', content: 'x' })
    const del = await call('DELETE', `/entries/${entry.id}`)
    assert.deepEqual(del.body, { success: true })
    const list = (await call('GET', '/entries')).body
    assert.ok(!list.some(e => e.id === entry.id))
  })

  test('rejects an entry without a title', async () => {
    const res = await call('POST', '/entries', { content: 'no title' })
    assert.ok(res.status >= 400)
  })
})

describe('drawings', () => {
  test('creates a drawing and defaults the image data to an empty string', async () => {
    const res = await call('POST', '/drawings', { title: 'Sketch' })
    assert.equal(res.status, 200)
    assert.equal(res.body.title, 'Sketch')
    assert.equal(res.body.data, '')
  })

  test('stores and updates PNG data URLs', async () => {
    const { body: drawing } = await call('POST', '/drawings', { title: 'Art' })
    const png = 'data:image/png;base64,iVBORw0KGgo='
    await call('PUT', `/drawings/${drawing.id}`, { title: 'Art v2', data: png })
    const stored = (await call('GET', '/drawings')).body.find(d => d.id === drawing.id)
    assert.equal(stored.title, 'Art v2')
    assert.equal(stored.data, png)
  })

  test('accepts a large drawing of about 2 MB', async () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024)
    const res = await call('POST', '/drawings', { title: 'Big', data: big })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, big.length)
  })

  test('rejects a body above the 10 MB limit', async () => {
    const tooBig = 'A'.repeat(11 * 1024 * 1024)
    const res = await call('POST', '/drawings', { title: 'Huge', data: tooBig })
    assert.equal(res.status, 413)
  })

  test('deletes a drawing', async () => {
    const { body: drawing } = await call('POST', '/drawings', { title: 'Temp' })
    await call('DELETE', `/drawings/${drawing.id}`)
    assert.ok(!(await call('GET', '/drawings')).body.some(d => d.id === drawing.id))
  })
})

describe('todos', () => {
  test('creates an open todo', async () => {
    const res = await call('POST', '/todos', { title: 'Water the plants' })
    assert.equal(res.body.title, 'Water the plants')
    assert.equal(res.body.done, 0)
  })

  test('stores the done flag as 1 and 0', async () => {
    const { body: todo } = await call('POST', '/todos', { title: 'Toggle me' })

    await call('PUT', `/todos/${todo.id}`, { title: 'Toggle me', done: true })
    let stored = (await call('GET', '/todos')).body.find(t => t.id === todo.id)
    assert.equal(stored.done, 1)

    await call('PUT', `/todos/${todo.id}`, { title: 'Toggle me', done: false })
    stored = (await call('GET', '/todos')).body.find(t => t.id === todo.id)
    assert.equal(stored.done, 0)
  })

  test('renames a todo', async () => {
    const { body: todo } = await call('POST', '/todos', { title: 'Before' })
    await call('PUT', `/todos/${todo.id}`, { title: 'After', done: false })
    const stored = (await call('GET', '/todos')).body.find(t => t.id === todo.id)
    assert.equal(stored.title, 'After')
  })

  test('deletes a todo', async () => {
    const { body: todo } = await call('POST', '/todos', { title: 'Remove' })
    await call('DELETE', `/todos/${todo.id}`)
    assert.ok(!(await call('GET', '/todos')).body.some(t => t.id === todo.id))
  })

  test('rejects a todo without a title', async () => {
    const res = await call('POST', '/todos', {})
    assert.ok(res.status >= 400)
  })
})

describe('snippets', () => {
  test('defaults to empty code and the javascript language', async () => {
    const res = await call('POST', '/snippets', { title: 'Empty' })
    assert.equal(res.body.code, '')
    assert.equal(res.body.language, 'javascript')
  })

  test('stores code and language and updates them', async () => {
    const { body: snippet } = await call('POST', '/snippets', { title: 'Fib', code: 'let a', language: 'typescript' })
    assert.equal(snippet.language, 'typescript')

    await call('PUT', `/snippets/${snippet.id}`, { title: 'Fib', code: 'let b', language: 'python' })
    const stored = (await call('GET', '/snippets')).body.find(s => s.id === snippet.id)
    assert.equal(stored.code, 'let b')
    assert.equal(stored.language, 'python')
  })

  test('keeps multi-line code and unicode intact', async () => {
    const code = 'const π = 3.14\nconsole.log("héllo")\n'
    const { body: snippet } = await call('POST', '/snippets', { title: 'Unicode', code })
    const stored = (await call('GET', '/snippets')).body.find(s => s.id === snippet.id)
    assert.equal(stored.code, code)
  })

  test('deletes a snippet', async () => {
    const { body: snippet } = await call('POST', '/snippets', { title: 'Bin' })
    await call('DELETE', `/snippets/${snippet.id}`)
    assert.ok(!(await call('GET', '/snippets')).body.some(s => s.id === snippet.id))
  })
})

describe('ordering', () => {
  for (const [collection, body] of [
    ['entries', (i) => ({ title: `Entry ${i}`, content: 'x' })],
    ['drawings', (i) => ({ title: `Drawing ${i}` })],
    ['todos', (i) => ({ title: `Todo ${i}` })],
    ['snippets', (i) => ({ title: `Snippet ${i}` })]
  ]) {
    test(`lists ${collection} newest first, even when created within the same second`, async () => {
      const created = []
      for (let i = 0; i < 5; i++) created.push((await call('POST', `/${collection}`, body(i))).body.id)

      const listed = (await call('GET', `/${collection}`)).body.map(item => item.id)
      const mine = listed.filter(id => created.includes(id))
      assert.deepEqual(mine, [...created].reverse())
    })
  }
})

describe('http behaviour', () => {
  test('answers cross-origin requests so the frontend on another port can call it', async () => {
    const res = await fetch(`${base}/todos`, { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
  })

  test('gives every created item a different id', async () => {
    const a = await call('POST', '/todos', { title: 'a' })
    const b = await call('POST', '/todos', { title: 'b' })
    assert.notEqual(a.body.id, b.body.id)
  })

  test('uses parameters instead of string building, so quotes in titles are safe', async () => {
    const title = `Robert'); DROP TABLE todos;--`
    const { body: todo } = await call('POST', '/todos', { title })
    assert.equal(todo.title, title)
    assert.equal((await call('GET', '/todos')).status, 200)
  })

  test('returns 404 for an unknown route', async () => {
    const res = await call('GET', '/nothing-here')
    assert.equal(res.status, 404)
  })
})

describe('items that do not exist', () => {
  // The routes do not check whether a row was affected, so they answer success for an unknown id.
  // This is documented behaviour and not a promise: a test here has to change on purpose
  // if the routes ever start answering 404.
  test('answers success when updating an id that is not there, and creates nothing', async () => {
    const before = (await call('GET', '/todos')).body.length
    const res = await call('PUT', '/todos/does-not-exist', { title: 'ghost', done: false })

    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { success: true })
    assert.equal((await call('GET', '/todos')).body.length, before)
  })

  test('answers success when deleting an id that is not there', async () => {
    const res = await call('DELETE', '/todos/does-not-exist')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { success: true })
  })

  test('deleting the same item twice is harmless', async () => {
    const { body: todo } = await call('POST', '/todos', { title: 'Twice' })
    await call('DELETE', `/todos/${todo.id}`)
    const second = await call('DELETE', `/todos/${todo.id}`)
    assert.equal(second.status, 200)
  })
})
