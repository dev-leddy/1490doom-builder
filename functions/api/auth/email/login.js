// POST /api/auth/email/login
import { randomHex, json } from '../../../_middleware.js'
import { verifyPassword } from '../../../lib/crypto.js'

const INVALID_MSG = 'Invalid email or password'

export async function onRequestPost(context) {
  const { env, request } = context

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { email, password } = body || {}

  if (!email || !password) {
    return json({ error: INVALID_MSG }, 401)
  }

  const normalEmail = email.toLowerCase().trim()

  const user = await env.DB.prepare(
    `SELECT id, password_hash FROM users WHERE provider = 'email' AND provider_id = ?`
  ).bind(normalEmail).first()

  // Always run verifyPassword (even with a dummy hash) to prevent timing attacks
  const dummyHash = 'pbkdf2:sha256:100000:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  const valid = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, dummyHash).then(() => false)

  if (!user || !valid) {
    return json({ error: INVALID_MSG }, 401)
  }

  // Create session
  const sessionId = randomHex(32)
  const now = Date.now()
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(sessionId, user.id, now, expiresAt).run()

  const origin = new URL(request.url)
  const isSecure = origin.protocol === 'https:'
  const cookieFlags = isSecure ? '; Secure' : ''

  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${cookieFlags}`)

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
}
