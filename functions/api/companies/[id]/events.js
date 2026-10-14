// GET /api/companies/:id/events?after=<seq>&limit=<n> — the company's campaign activity log
//
// Oldest first, in pages: pass the returned nextAfter as `after` for the next page
// (null when there are no more). Owner only. Sits beside ../[id].js: Pages routes
// /api/companies/:id and /api/companies/:id/events separately.
import { json } from '../../../_middleware.js'

const MAX_LIMIT = 200

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const { id } = context.params
  const url = new URL(context.request.url)
  const after = Math.max(0, parseInt(url.searchParams.get('after'), 10) || 0)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || MAX_LIMIT))

  const owned = await context.env.DB.prepare(
    `SELECT 1 FROM companies WHERE id = ? AND user_id = ?`
  ).bind(id, user.id).first()
  if (!owned) return json({ error: 'Not found' }, 404)

  const rows = await context.env.DB.prepare(
    `SELECT seq, id, type, after_game, ref, payload, client_at, server_at, status
     FROM campaign_events
     WHERE company_id = ? AND user_id = ? AND seq > ?
     ORDER BY seq LIMIT ?`
  ).bind(id, user.id, after, limit).all()

  const events = (rows.results || []).map(r => {
    let payload = {}
    try { payload = JSON.parse(r.payload) } catch { /* keep the row, without details */ }
    return { seq: r.seq, id: r.id, type: r.type, afterGame: r.after_game, ref: r.ref, payload, at: r.client_at, serverAt: r.server_at, status: r.status }
  })
  const nextAfter = events.length === limit ? events.at(-1).seq : null
  return json({ events, nextAfter })
}
