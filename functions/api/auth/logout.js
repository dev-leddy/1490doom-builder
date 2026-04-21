// POST /api/auth/logout — Destroy session and clear cookie
import { json } from '../../_middleware.js'

export async function onRequestPost(context) {
  const { env } = context
  const sessionId = context.data.sessionId

  if (sessionId && env.DB) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run()
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    },
  })
}
