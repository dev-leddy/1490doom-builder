// GET  /api/poll: the current poll's id and whether this player has answered it
// POST /api/poll: { answers } for the current poll. One answer per account: a second is refused (409)
// Signed-in players only. The questions are in functions/lib/poll.js.
import { json } from '../_middleware.js'
import { POLL, cleanAnswers } from '../lib/poll.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const row = await context.env.DB.prepare(
    `SELECT 1 FROM poll_answers WHERE poll_id = ? AND user_id = ?`
  ).bind(POLL.id, user.id).first()
  return json({ id: POLL.id, answered: !!row })
}

export async function onRequestPost(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (body.id !== POLL.id) return json({ error: 'This poll has closed' }, 409)
  const answers = cleanAnswers(body.answers)
  if (!answers) return json({ error: 'Invalid answers' }, 400)

  const res = await context.env.DB.prepare(
    `INSERT INTO poll_answers (poll_id, user_id, answers, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(poll_id, user_id) DO NOTHING`
  ).bind(POLL.id, user.id, JSON.stringify(answers), Date.now()).run()
  if (!res.meta?.changes) return json({ error: 'already answered' }, 409)
  return json({ ok: true })
}
