import { createServer } from 'http'
import { parse } from 'url'
import handler from './api/search.js'

const PORT = process.env.PORT || 3000

createServer((req, res) => {
  const parsed = parse(req.url, true)
  req.query = parsed.query
  handler(req, res)
}).listen(PORT, () => console.log(`search worker listening on :${PORT}`))
