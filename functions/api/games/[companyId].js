// GET    /api/games/:companyId — load the in-progress game for a company
// PUT    /api/games/:companyId — save (upsert) the in-progress game
// POST   /api/games/:companyId — same as PUT (used with keepalive on page unload)
// DELETE /api/games/:companyId — discard the in-progress game
//
// Metrics: a save with a new session id is a game started (and ends the one it replaced);
// DELETE ends the game. Logged to metric_events (lib/metrics.js).
import { json } from '../../_middleware.js'
import { logEvent, gameProps, gameEndProps } from '../../lib/metrics.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const row = await context.env.DB.prepare(
    `SELECT saved_at, data FROM game_sessions WHERE company_id = ? AND user_id = ?`
  ).bind(context.params.companyId, user.id).first()

  if (!row) return json({ error: 'Not found' }, 404)
  return json({ savedAt: row.saved_at, data: JSON.parse(row.data) })
}

// The game stored before this request (for metrics only)
function previousGame(context, user) {
  return context.env.DB.prepare(
    `SELECT saved_at, data FROM game_sessions WHERE company_id = ? AND user_id = ?`
  ).bind(context.params.companyId, user.id).first()
}

const parse = row => { try { return JSON.parse(row.data) } catch { return null } }

export async function onRequestPut(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!body?.data) return json({ error: 'Missing data' }, 400)

  const before = await previousGame(context, user)
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

  // A new game (not a save of the one in progress, nor a resumed one)
  const old = before && parse(before)
  if (body.data.sessionId && old?.sessionId !== body.data.sessionId) {
    if (old) logEvent(context, 'game_end', gameEndProps(old, before.saved_at, 'replaced'))
    logEvent(context, 'game_start', gameProps(body.data))
  }
  return json({ ok: true, savedAt })
}

export const onRequestPost = onRequestPut

export async function onRequestDelete(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const before = await previousGame(context, user)
  await context.env.DB.prepare(
    `DELETE FROM game_sessions WHERE company_id = ? AND user_id = ?`
  ).bind(context.params.companyId, user.id).run()
  const old = before && parse(before)
  if (old) logEvent(context, 'game_end', gameEndProps(old, before.saved_at, 'closed'))
  return json({ ok: true })
}
