// GET  /api/companies — list user's saved companies
// POST /api/companies — upsert a company (keyed on company id)
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

  const { id, name, mode, data } = body
  if (!id || !name || !data) return json({ error: 'Missing required fields' }, 400)

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
