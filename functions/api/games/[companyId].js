// GET    /api/games/:companyId — load the in-progress game for a company
// PUT    /api/games/:companyId — save (upsert) the in-progress game
// POST   /api/games/:companyId — same as PUT (used with keepalive on page unload)
// DELETE /api/games/:companyId — discard the in-progress game
import { json } from '../../_middleware.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const row = await context.env.DB.prepare(
    `SELECT saved_at, data FROM game_sessions WHERE company_id = ? AND user_id = ?`
  ).bind(context.params.companyId, user.id).first()

  if (!row) return json({ error: 'Not found' }, 404)
  return json({ savedAt: row.saved_at, data: JSON.parse(row.data) })
}

export async function onRequestPut(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!body?.data) return json({ error: 'Missing data' }, 400)

  const savedAt = Date.now()
  const result = await context.env.DB.prepare(
    `INSERT INTO game_sessions (company_id, user_id, saved_at, data)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(company_id) DO UPDATE SET
       saved_at = excluded.saved_at,
       data = excluded.data
     WHERE game_sessions.user_id = ?`
  ).bind(context.params.companyId, user.id, savedAt, JSON.stringify(body.data), user.id).run()

  if (result.meta?.changes === 0) return json({ error: 'forbidden' }, 403)
  return json({ ok: true, savedAt })
}

export const onRequestPost = onRequestPut

export async function onRequestDelete(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  await context.env.DB.prepare(
    `DELETE FROM game_sessions WHERE company_id = ? AND user_id = ?`
  ).bind(context.params.companyId, user.id).run()
  return json({ ok: true })
}
