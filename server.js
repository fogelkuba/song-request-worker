import { createServer } from 'http'
import { parse } from 'url'
import handler from './api/search.js'

const PORT = process.env.PORT || 3000

function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
    return res
  }
  res.end_orig = res.end.bind(res)
  return res
}

createServer((req, res) => {
  const parsed = parse(req.url, true)
  req.query = parsed.query
  handler(req, wrapRes(res))
}).listen(PORT, () => console.log(`search worker listening on :${PORT}`))
