import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'node:url'

// DB-Pfad: DB_PATH oder entries.db neben dieser Datei, unabhängig vom Startverzeichnis
export const db = new sqlite3.Database(
  process.env.DB_PATH || fileURLToPath(new URL('./entries.db', import.meta.url))
)

export function initDb() {
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

      // Migration für bestehende DB
      db.run(`ALTER TABLE entries ADD COLUMN mode TEXT DEFAULT 'richtext'`,
        () => {} // Fehler ignorieren falls Spalte schon existiert
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

db.run('PRAGMA journal_mode = WAL')