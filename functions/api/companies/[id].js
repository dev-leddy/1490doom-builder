// GET    /api/companies/:id — load one company
// DELETE /api/companies/:id — delete a company
import { json } from '../../_middleware.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const { id } = context.params
  const row = await context.env.DB.prepare(
    `SELECT id, name, mode, saved_at, data FROM companies WHERE id = ? AND user_id = ?`
  ).bind(id, user.id).first()

  if (!row) return json({ error: 'Not found' }, 404)

  return json({ ...row, data: JSON.parse(row.data) })
}

export async function onRequestDelete(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const { id } = context.params
  const result = await context.env.DB.prepare(
    `DELETE FROM companies WHERE id = ? AND user_id = ?`
  ).bind(id, user.id).run()

  if (result.meta?.changes === 0) return json({ error: 'Not found' }, 404)

  // Its in-progress game and its activity log go with it
  await context.env.DB.batch([
    context.env.DB.prepare(`DELETE FROM game_sessions WHERE company_id = ? AND user_id = ?`).bind(id, user.id),
    context.env.DB.prepare(`DELETE FROM campaign_events WHERE company_id = ? AND user_id = ?`).bind(id, user.id),
  ])
  return json({ ok: true })
}
