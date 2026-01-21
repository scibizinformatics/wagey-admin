/**
 * Minimal static web server for Quasar SPA build output.
 * - Serves files from dist/spa
 * - Falls back to index.html for client-side routes (history mode)
 * - Listens on PORT (default 8000)
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const PORT = Number(process.env.PORT || 8000)
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, 'dist', 'spa')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8',
}

function send(res, statusCode, headers, bodyStreamOrBuffer) {
  res.writeHead(statusCode, headers)
  if (!bodyStreamOrBuffer) return res.end()
  if (Buffer.isBuffer(bodyStreamOrBuffer) || typeof bodyStreamOrBuffer === 'string') {
    return res.end(bodyStreamOrBuffer)
  }
  bodyStreamOrBuffer.pipe(res)
}

function safeResolve(baseDir, requestPath) {
  // prevent path traversal
  const normalized = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const resolved = path.join(baseDir, normalized)
  if (!resolved.startsWith(baseDir)) return null
  return resolved
}

function setCacheHeaders(filePath, headers) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext && ext !== '.html') {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  } else {
    headers['Cache-Control'] = 'no-store'
  }
}

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url || '/')
    const pathname = decodeURIComponent(parsed.pathname || '/')

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Method Not Allowed')
    }

    // Map "/" to "/index.html"
    const requestedPath = pathname === '/' ? '/index.html' : pathname
    const resolved = safeResolve(DIST_DIR, requestedPath)
    if (!resolved) {
      return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request')
    }

    const tryFile = (filePath, fallbackToIndex) => {
      fs.stat(filePath, (err, stat) => {
        if (!err && stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const headers = {
            'Content-Type': MIME[ext] || 'application/octet-stream',
          }
          setCacheHeaders(filePath, headers)
          if (req.method === 'HEAD') return send(res, 200, headers)
          return send(res, 200, headers, fs.createReadStream(filePath))
        }

        if (fallbackToIndex) {
          const indexPath = path.join(DIST_DIR, 'index.html')
          fs.stat(indexPath, (idxErr, idxStat) => {
            if (idxErr || !idxStat.isFile()) {
              return send(
                res,
                500,
                { 'Content-Type': 'text/plain; charset=utf-8' },
                'index.html not found. Did you run the Quasar build?'
              )
            }
            const headers = { 'Content-Type': MIME['.html'] }
            setCacheHeaders(indexPath, headers)
            if (req.method === 'HEAD') return send(res, 200, headers)
            return send(res, 200, headers, fs.createReadStream(indexPath))
          })
          return
        }

        return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found')
      })
    }

    // If it's a direct file request (has an extension), don't SPA-fallback on 404
    const hasExt = path.extname(requestedPath) !== ''
    tryFile(resolved, !hasExt)
  } catch (e) {
    return send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Internal Server Error')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Serving ${DIST_DIR} on http://0.0.0.0:${PORT}`)
})

