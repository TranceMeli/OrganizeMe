import express from 'express'
import cors from 'cors'
import { db, initDb } from './db.js'
import { randomUUID } from 'crypto'

// REST API for entries, drawings, todos and snippets. Every collection offers the same
// GET / POST / PUT / DELETE routes, see the endpoint table in the README.

const PORT = process.env.PORT || 3001
const app = express()

// The frontend runs on another port during development, so cross-origin requests must be allowed
app.use(cors())

// Drawings arrive as PNG data URLs, which exceed the default 100 kb body limit
app.use(express.json({ limit: '10mb' }))

app.get('/entries', (req, res) => {
  db.all('SELECT * FROM entries ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json(err)
    res.json(rows)
  })
})

app.post('/entries', (req, res) => {
  const id = randomUUID()
  const { title, content, mode } = req.body
  db.run(
    'INSERT INTO entries (id, title, content, mode) VALUES (?, ?, ?, ?)',
    [id, title, content ?? '', mode ?? 'richtext'],
    (err) => {
      if (err) return res.status(500).json(err)
      db.get('SELECT * FROM entries WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json(err)
        res.json(row)
      })
    }
  )
})

app.put('/entries/:id', (req, res) => {
  db.run(
    'UPDATE entries SET title = ?, content = ?, mode = ? WHERE id = ?',
    [req.body.title, req.body.content, req.body.mode ?? 'richtext', req.params.id],
    (err) => {
      if (err) return res.status(500).json(err)
      res.json({ success: true })
    }
  )
})

app.delete('/entries/:id', (req, res) => {
  db.run('DELETE FROM entries WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true })
  })
})

app.get('/drawings', (req, res) => {
  db.all('SELECT * FROM drawings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json(err)
    res.json(rows)
  })
})

app.post('/drawings', (req, res) => {
  const id = randomUUID()
  const { title, data } = req.body
  db.run(
    'INSERT INTO drawings (id, title, data) VALUES (?, ?, ?)',
    [id, title, data ?? ''],
    (err) => {
      if (err) return res.status(500).json(err)
      db.get('SELECT * FROM drawings WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json(err)
        res.json(row)
      })
    }
  )
})

app.put('/drawings/:id', (req, res) => {
  db.run(
    'UPDATE drawings SET title = ?, data = ? WHERE id = ?',
    [req.body.title, req.body.data, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err)
      res.json({ success: true })
    }
  )
})

app.delete('/drawings/:id', (req, res) => {
  db.run('DELETE FROM drawings WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true })
  })
})

app.get('/todos', (req, res) => {
  db.all('SELECT * FROM todos ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json(err)
    res.json(rows)
  })
})

app.post('/todos', (req, res) => {
  const id = randomUUID()
  const { title } = req.body
  db.run(
    'INSERT INTO todos (id, title) VALUES (?, ?)',
    [id, title],
    (err) => {
      if (err) return res.status(500).json(err)
      db.get('SELECT * FROM todos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json(err)
        res.json(row)
      })
    }
  )
})

app.put('/todos/:id', (req, res) => {
  db.run(
    'UPDATE todos SET title = ?, done = ? WHERE id = ?',
    [req.body.title, req.body.done ? 1 : 0, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err)
      res.json({ success: true })
    }
  )
})

app.delete('/todos/:id', (req, res) => {
  db.run('DELETE FROM todos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true })
  })
})

app.get('/snippets', (req, res) => {
  db.all('SELECT * FROM snippets ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json(err)
    res.json(rows)
  })
})

app.post('/snippets', (req, res) => {
  const id = randomUUID()
  const { title, code, language } = req.body
  db.run(
    'INSERT INTO snippets (id, title, code, language) VALUES (?, ?, ?, ?)',
    [id, title, code ?? '', language ?? 'javascript'],
    (err) => {
      if (err) return res.status(500).json(err)
      db.get('SELECT * FROM snippets WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json(err)
        res.json(row)
      })
    }
  )
})

app.put('/snippets/:id', (req, res) => {
  db.run(
    'UPDATE snippets SET title = ?, code = ?, language = ? WHERE id = ?',
    [req.body.title, req.body.code, req.body.language, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err)
      res.json({ success: true })
    }
  )
})

app.delete('/snippets/:id', (req, res) => {
  db.run('DELETE FROM snippets WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true })
  })
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log('API listening on http://localhost:' + PORT)
    })
  })
  .catch((err) => {
    console.error('Database initialisation failed:', err)
    process.exit(1)
  })
