import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const PORT = Number(process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
    const relative = pathname === '/' ? '主页.html' : pathname.replace(/^\/+/, '')
    const filePath = normalize(join(ROOT, relative))
    if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404)
      res.end('Not Found')
      return
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': statSync(filePath).size,
      'Cache-Control': 'no-store',
    })
    createReadStream(filePath).pipe(res)
  } catch (error) {
    res.writeHead(500)
    res.end(String(error))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Smoke test server: http://127.0.0.1:${PORT}/`)
})
