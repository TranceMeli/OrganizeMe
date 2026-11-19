import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'node:url'

// DB_PATH overrides the location, e.g. for demo data. The default sits next to this file,
// so the database is found no matter which directory the server is started from.
const location = process.env.DB_PATH || fileURLToPath(new URL('./entries.db', import.meta.url))

// With a callback, sqlite3 reports a failed open here. Without one it throws an uncaught error
// event, which would crash the process with a stack trace before initDb() can report it.
let reportOpen
const opened = new Promise((resolve, reject) => {
  reportOpen = (err) => (err ? reject(err) : resolve())
})
opened.catch(() => {}) // initDb() handles the failure; this only prevents an unhandled rejection

export const db = new sqlite3.Database(location, reportOpen)

export async function initDb() {
  await opened
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          mode TEXT DEFAULT 'richtext',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) reject(err) })

      // Databases created before Markdown support have no mode column
      db.run(`ALTER TABLE entries ADD COLUMN mode TEXT DEFAULT 'richtext'`,
        () => {} // SQLite has no ADD COLUMN IF NOT EXISTS; the error just means the column is there
      )

      db.run(`
        CREATE TABLE IF NOT EXISTS drawings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) reject(err) })

      db.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          done INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) reject(err) })

      db.run(`
        CREATE TABLE IF NOT EXISTS snippets (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          code TEXT,
          language TEXT DEFAULT 'javascript',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

// Write-ahead logging lets reads continue while a write is in progress
db.run('PRAGMA journal_mode = WAL', () => {}) // a failed open is reported by initDb()