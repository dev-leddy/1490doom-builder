// POST /api/auth/email/reset
import { randomHex, json } from '../../../../_middleware.js'
import { hashPassword } from '../../../lib/crypto.js'

export async function onRequestPost(context) {
  const { env, request } = context

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { token, password } = body || {}

  if (!token || !password || password.length < 8) {
    return json({ error: 'Invalid request' }, 400)
  }

  const now = Date.now()
  const row = await env.DB.prepare(
    `SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > ?`
  ).bind(token, now).first()

  if (!row) {
    return json({ error: 'Reset link is invalid or has expired' }, 400)
  }

  // Hash new password and update user
  const passwordHash = await hashPassword(password)
  await env.DB.prepare(
    `UPDATE users SET password_hash = ? WHERE id = ?`
  ).bind(passwordHash, row.user_id).run()

  // Delete token (one-time use)
  await env.DB.prepare(
    `DELETE FROM password_reset_tokens WHERE token = ?`
  ).bind(token).run()

  // Auto-login: create session
  const sessionId = randomHex(32)
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(sessionId, row.user_id, now, expiresAt).run()

  const origin = new URL(request.url)
  const isSecure = origin.protocol === 'https:'
  const cookieFlags = isSecure ? '; Secure' : ''

  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${cookieFlags}`)

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
}
