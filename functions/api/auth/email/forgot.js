// POST /api/auth/email/forgot
import { randomHex, json } from '../../../_middleware.js'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
const ONE_HOUR_MS   = 60 * 60 * 1000

export async function onRequestPost(context) {
  const { env, request } = context

  let body
  try { body = await request.json() } catch { return json({ ok: true }) }

  const { email } = body || {}

  // Always return 200 — prevent email enumeration
  if (!email) return json({ ok: true })

  const normalEmail = email.toLowerCase().trim()
  const user = await env.DB.prepare(
    `SELECT id FROM users WHERE provider = 'email' AND provider_id = ?`
  ).bind(normalEmail).first()

  if (!user) return json({ ok: true })

  // Rate limit: 1 reset email per 4 hours
  const now = Date.now()
  const recentToken = await env.DB.prepare(
    `SELECT token FROM password_reset_tokens
     WHERE user_id = ? AND created_at > ? AND expires_at > ?
     LIMIT 1`
  ).bind(user.id, now - FOUR_HOURS_MS, now).first()

  if (recentToken) return json({ ok: true })

  // Generate token, store it
  const token = randomHex(32)
  const expiresAt = now + ONE_HOUR_MS

  await env.DB.prepare(
    `INSERT INTO password_reset_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(token, user.id, now, expiresAt).run()

  // Send reset email via Resend
  const host = new URL(request.url).origin
  const resetUrl = `${host}/?reset=${token}`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@1490doomcompanybuilder.com',
      to: normalEmail,
      subject: '1490 DOOM — Reset your password',
      html: `<p>Click to reset your password (expires in 1 hour):</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>If you didn't request this, ignore this email.</p>`,
    }),
  })

  return json({ ok: true })
}
