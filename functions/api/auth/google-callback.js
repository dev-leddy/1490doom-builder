// GET /api/auth/google/callback — Google OAuth callback
import { Google } from 'arctic'
import { getCookie, randomHex, json } from '../../_middleware.js'

export async function onRequestGet(context) {
  const { env, request } = context
  const url = new URL(request.url)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = getCookie(request, 'oauth_state')
  const codeVerifier = getCookie(request, 'oauth_cv')

  if (!code || !state || state !== storedState || !codeVerifier) {
    return json({ error: 'Invalid OAuth state' }, 400)
  }

  const google = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    callbackUrl(request, '/api/auth/google/callback')
  )

  let tokens
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier)
  } catch {
    return json({ error: 'Failed to exchange code' }, 400)
  }

  // Decode the id_token claims (Google returns openid profile)
  const idToken = tokens.idToken()
  const claims = decodeJwtPayload(idToken)
  if (!claims?.sub) return json({ error: 'Invalid id_token' }, 400)

  const userId = await upsertUser(env.DB, {
    provider: 'google',
    providerId: claims.sub,
    username: claims.name || claims.email || 'Unknown',
    avatarUrl: claims.picture || null,
  })

  // Create session
  const sessionId = randomHex(32)
  const now = Date.now()
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(sessionId, userId, now, expiresAt).run()

  const origin = new URL(request.url)
  const isSecure = origin.protocol === 'https:'
  const cookieFlags = isSecure ? '; Secure' : ''

  const headers = new Headers({ Location: '/' })
  headers.append('Set-Cookie', `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${cookieFlags}`)
  headers.append('Set-Cookie', `oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
  headers.append('Set-Cookie', `oauth_cv=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
  return new Response(null, { status: 302, headers })
}

async function upsertUser(db, { provider, providerId, username, avatarUrl }) {
  const existing = await db.prepare(
    `SELECT id FROM users WHERE provider = ? AND provider_id = ?`
  ).bind(provider, providerId).first()

  if (existing) {
    await db.prepare(
      `UPDATE users SET username = ?, avatar_url = ? WHERE id = ?`
    ).bind(username, avatarUrl, existing.id).run()
    return existing.id
  }

  const id = randomHex(16)
  await db.prepare(
    `INSERT INTO users (id, provider, provider_id, username, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, provider, providerId, username, avatarUrl, Date.now()).run()
  return id
}

function callbackUrl(request, path) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}

// Decode JWT payload without verification (we trust Google's redirect)
function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.')
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      Math.ceil(payload.length / 4) * 4, '='
    )
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}
