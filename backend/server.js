import { app } from './app.js'
import { initDb } from './db.js'

const PORT = process.env.PORT || 3001

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
