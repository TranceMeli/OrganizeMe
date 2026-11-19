import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// These tests start the real server.js as a separate process, the way `npm start` does.
// They cover what the API tests cannot: the PORT and DB_PATH settings, a database file that
// outlives the process, and the upgrade of a database from before the mode column existed.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workDir = mkdtempSync(path.join(os.tmpdir(), 'organizeme-server-test-'))
const running = new Set()

after(() => {
  for (const child of running) child.kill()
  rmSync(workDir, { recursive: true, force: true })
})

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

/** Starts server.js and waits until it says it is listening, or until it exits. */
function start({ port, dbPath }) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath }
  })
  running.add(child)

  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })

  const exited = new Promise(resolve => child.once('exit', code => { running.delete(child); resolve(code) }))
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 10_000)
    child.stdout.on('data', () => {
      if (output.includes('API listening')) { clearTimeout(timer); resolve() }
    })
    exited.then(code => { clearTimeout(timer); reject(new Error(`server exited with code ${code}:\n${output}`)) })
  })

  // A test that expects the server to fail only awaits `exited`, so a rejected `ready` is not an error there
  ready.catch(() => {})

  return { child, ready, exited, output: () => output }
}

const stop = async (server) => { server.child.kill(); await server.exited }

async function json(port, route, init) {
  const res = await fetch(`http://localhost:${port}${route}`, init)
  return { status: res.status, body: await res.json() }
}

describe('server.js', () => {
  test('listens on the port from PORT and says so', async () => {
    const port = await freePort()
    const server = start({ port, dbPath: path.join(workDir, 'port.db') })
    await server.ready

    assert.match(server.output(), new RegExp(`API listening on http://localhost:${port}`))
    assert.equal((await json(port, '/todos')).status, 200)
    await stop(server)
  })

  test('creates the database file at DB_PATH', async () => {
    const dbPath = path.join(workDir, 'created.db')
    const port = await freePort()
    const server = start({ port, dbPath })
    await server.ready

    assert.ok(existsSync(dbPath), 'the database file should exist after start-up')
    await stop(server)
  })

  test('keeps the data when the server restarts', async () => {
    const dbPath = path.join(workDir, 'persist.db')

    let port = await freePort()
    let server = start({ port, dbPath })
    await server.ready
    const created = await json(port, '/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Survives', content: '<p>still here</p>' })
    })
    await stop(server)

    port = await freePort()
    server = start({ port, dbPath })
    await server.ready
    const list = await json(port, '/entries')

    assert.ok(list.body.some(e => e.id === created.body.id && e.content === '<p>still here</p>'))
    await stop(server)
  })

  test('exits with an error message when the database cannot be opened', async () => {
    const port = await freePort()
    const server = start({ port, dbPath: path.join(workDir, 'no-such-folder', 'x.db') })

    const code = await server.exited
    assert.equal(code, 1)
    assert.match(server.output(), /Database initialisation failed/)
  })
})

describe('database upgrade', () => {
  test('adds the mode column to a database that was created before Markdown support', () => {
    const dbPath = path.join(workDir, 'old.db')

    // Build the old schema, then start the current code on it, all in a throw-away process
    const script = `
      import sqlite3 from 'sqlite3'
      const old = new sqlite3.Database(process.env.DB_PATH)
      await new Promise(r => old.run("CREATE TABLE entries (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)", r))
      await new Promise(r => old.run("INSERT INTO entries (id, title, content) VALUES ('old-1', 'From before', '<p>old</p>')", r))
      await new Promise(r => old.close(r))

      const { db, initDb } = await import('./db.js')
      await initDb()
      const columns = await new Promise(r => db.all('PRAGMA table_info(entries)', (e, rows) => r(rows.map(c => c.name))))
      const row = await new Promise(r => db.get("SELECT * FROM entries WHERE id = 'old-1'", (e, row) => r(row)))
      console.log(JSON.stringify({ columns, row }))
      process.exit(0)
    `
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: backendDir,
      env: { ...process.env, DB_PATH: dbPath },
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr)
    const { columns, row } = JSON.parse(result.stdout.trim().split('\n').pop())
    assert.ok(columns.includes('mode'), `columns were ${columns}`)
    assert.equal(row.title, 'From before')
    assert.equal(row.content, '<p>old</p>')
    assert.equal(row.mode, 'richtext', 'an old entry becomes a rich text entry')
  })
})
