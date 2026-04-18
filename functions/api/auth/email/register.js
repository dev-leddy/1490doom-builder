// POST /api/auth/email/register
import { randomHex, json } from '../../../../_middleware.js'
import { hashPassword } from '../../../lib/crypto.js'

export async function onRequestPost(context) {
  const { env, request } = context

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { email, username, password } = body || {}

  // Validate
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400)
  }
  if (!username || !username.trim()) {
    return json({ error: 'Username is required' }, 400)
  }
  if (!password || password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const normalEmail = email.toLowerCase().trim()

  // Check if email already taken
  const existing = await env.DB.prepare(
    `SELECT id FROM users WHERE provider = 'email' AND provider_id = ?`
  ).bind(normalEmail).first()
  if (existing) {
    return json({ error: 'An account with this email already exists' }, 409)
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password)
  const userId = randomHex(16)
  const now = Date.now()

  await env.DB.prepare(
    `INSERT INTO users (id, provider, provider_id, username, avatar_url, email, password_hash, created_at)
     VALUES (?, 'email', ?, ?, NULL, ?, ?, ?)`
  ).bind(userId, normalEmail, username.trim(), normalEmail, passwordHash, now).run()

  // Create session
  const sessionId = randomHex(32)
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(sessionId, userId, now, expiresAt).run()

  const origin = new URL(request.url)
  const isSecure = origin.protocol === 'https:'
  const cookieFlags = isSecure ? '; Secure' : ''

  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${cookieFlags}`)

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
}
