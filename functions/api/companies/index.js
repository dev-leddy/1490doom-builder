// GET  /api/companies — list user's saved companies
// POST /api/companies — upsert a company (keyed on company id)
//
// Stale-save guard: the client sends `baseSavedAt`, the saved_at it last loaded or
// saved. If the stored copy is newer (another tab/device saved since), the save is
// refused with 409 and the newer copy, so the client can adopt it instead of
// silently overwriting it.
import { json } from '../../_middleware.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  const rows = await context.env.DB.prepare(
    `SELECT id, name, mode, saved_at, data
     FROM companies WHERE user_id = ?
     ORDER BY saved_at DESC`
  ).bind(user.id).all()

  const companies = (rows.results || []).map(r => ({
    ...r,
    data: JSON.parse(r.data),
  }))

  return json({ companies })
}

export async function onRequestPost(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, name, mode, data, baseSavedAt } = body
  if (!id || !name || !data) return json({ error: 'Missing required fields' }, 400)

  const existing = await context.env.DB.prepare(
    `SELECT user_id, name, mode, saved_at, data FROM companies WHERE id = ?`
  ).bind(id).first()

  // Same id owned by someone else — client should pick a new id
  if (existing && existing.user_id !== user.id) return json({ error: 'forbidden' }, 403)

  if (existing && typeof baseSavedAt === 'number' && existing.saved_at > baseSavedAt) {
    return json({
      error: 'conflict',
      company: { id, name: existing.name, mode: existing.mode, saved_at: existing.saved_at, data: JSON.parse(existing.data) },
    }, 409)
  }

  const savedAt = Date.now()
  await context.env.DB.prepare(
    `INSERT INTO companies (id, user_id, name, mode, saved_at, data)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       mode = excluded.mode,
       saved_at = excluded.saved_at,
       data = excluded.data
     WHERE companies.user_id = ?`
  ).bind(id, user.id, name, mode || 'standard', savedAt, JSON.stringify(data), user.id).run()

  return json({ ok: true, savedAt })
}
