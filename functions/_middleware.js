// ── Middleware: CORS + Session Injection ──────────────────────────────────────
// Runs on every /api/* request. Parses the session cookie and attaches
// the user to context.data.user if the session is valid.

const CORS_ORIGIN = [
  'http://localhost:5173',
  'http://localhost:8788',
]

export async function onRequest(context) {
  const { request, next, env } = context
  const origin = request.headers.get('Origin') || ''

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  // Parse session cookie and attach user to context
  const sessionId = getCookie(request, 'session')
  if (sessionId && env.DB) {
    const now = Date.now()
    const row = await env.DB.prepare(
      `SELECT s.id, s.user_id, s.expires_at, u.username, u.avatar_url, u.provider
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`
    ).bind(sessionId, now).first()

    if (row) {
      context.data.user = {
        id: row.user_id,
        username: row.username,
        avatar_url: row.avatar_url,
        provider: row.provider,
      }
      context.data.sessionId = row.id

      // Roll session TTL (30 days from now)
      const newExpiry = now + 30 * 24 * 60 * 60 * 1000
      context.waitUntil(
        env.DB.prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`)
          .bind(newExpiry, row.id).run()
      )
    }
  }

  const response = await next()

  // Attach CORS headers to every response
  const corsH = corsHeaders(origin)
  const newHeaders = new Headers(response.headers)
  for (const [k, v] of Object.entries(corsH)) {
    newHeaders.set(k, v)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = CORS_ORIGIN.includes(origin) ? origin : CORS_ORIGIN[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function randomHex(bytes) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}
