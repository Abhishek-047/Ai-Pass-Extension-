import http from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = 3000

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'fixtures', req.url === '/' ? 'index.html' : req.url)
  if (!path.extname(filePath)) filePath += '.html'

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404)
        res.end('Not Found')
      } else {
        res.writeHead(500)
        res.end('Server Error: ' + err.code)
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(content, 'utf-8')
    }
  })
})

server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`)
})
