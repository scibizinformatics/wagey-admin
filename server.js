/**
 * Minimal static web server for Quasar SPA build output.
 * - Serves files from dist/spa
 * - Falls back to index.html for client-side routes (history mode)
 * - Listens on PORT (default 8000)
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import url from 'url'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT || 8000)
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, 'dist', 'spa')

// ─── Security headers ──────────────────────────────────────────────
// The SPA shell carries one inline script: the legacy-alias redirect in
// index.html. A CSP can only allow it by naming its exact bytes, so the digest
// is computed from the built file at startup instead of being hard-coded —
// editing index.html and rebuilding cannot leave a stale hash behind and
// silently break the redirect.
function inlineScriptHashes() {
  const indexPath = path.join(DIST_DIR, 'index.html')
  let html
  try {
    html = fs.readFileSync(indexPath, 'utf8')
  } catch {
    console.warn(`[security] ${indexPath} unreadable — CSP cannot allow the inline redirect script`)
    return []
  }
  const hashes = []
  const pattern = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = pattern.exec(html))) {
    if (!match[1].trim()) continue
    hashes.push(`'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`)
  }
  return hashes
}

// Mirrors the build-time defaults in quasar.config.js, so a deployment that
// builds against a different API host can point the CSP at it with the same
// env var it already sets.
function originFrom(value, fallback) {
  try {
    return new URL(value).origin
  } catch {
    return fallback
  }
}

const API_ORIGIN = originFrom(
  process.env.API_BASE_URL || 'https://staging.wageyapp.com',
  'https://staging.wageyapp.com',
)
const WS_ORIGIN = originFrom(
  process.env.VITE_WS_URL || 'wss://staging.wageyapp.com',
  'wss://staging.wageyapp.com',
)

// unpkg enters script-src/style-src/img-src because the Sites map loads Leaflet
// from there on demand; connect-src needs Nominatim for the address lookup.
// style-src keeps 'unsafe-inline' because Vue/Quasar write style attributes at
// runtime (ECharts tooltips, dialog positioning) and those are style-src's to
// police.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  ["script-src 'self'", ...inlineScriptHashes(), 'https://unpkg.com'].join(' '),
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  [
    "img-src 'self' data: blob:",
    API_ORIGIN,
    'https://*.wageyapp.com',
    'https://*.tile.openstreetmap.org',
    'https://unpkg.com',
  ].join(' '),
  "font-src 'self' data:",
  ['connect-src', "'self'", API_ORIGIN, WS_ORIGIN, 'https://nominatim.openstreetmap.org'].join(' '),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

// HSTS is ignored over plain HTTP, so serving it here as well as in nginx.conf
// is harmless and covers a direct :8000 deployment.
const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

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
  // Every response carries them, including the 4xx/5xx paths.
  res.writeHead(statusCode, { ...SECURITY_HEADERS, ...headers })
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
                'index.html not found. Did you run the Quasar build?',
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
  console.log(`Serving ${DIST_DIR} on http://0.0.0.0:${PORT}`)
})
