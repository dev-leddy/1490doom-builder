// GET  /api/companies — list user's saved companies
// POST /api/companies — upsert a company (keyed on company id)
//
// Stale-save guard: the client sends `baseSavedAt`, the saved_at it last loaded or
// saved. If the stored copy is newer (another tab/device saved since), the save is
// refused with 409 and the newer copy, so the client can adopt it instead of
// silently overwriting it.
//
// Campaign log guard: clients from before the campaign log don't send `campaign` at all.
// If such a save arrives for a company that has one stored, the stored log is kept.
//
// Campaign activity events (`events`, optional) are stored in campaign_events in the same
// batch as the save. With a conflict they are kept as 'rejected' (the UI shows them as not
// saved). A campaign save without events that changes the number of games gets a
// 'system.unlogged' event, so the activity log shows that something happened.
import { json } from '../../_middleware.js'
import { validateEvents, insertEventStatements, unloggedEvent } from '../../lib/campaignEvents.js'

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

  const { id, name, mode, baseSavedAt } = body
  let { data } = body
  if (!id || !name || !data) return json({ error: 'Missing required fields' }, 400)
  const { valid: events } = validateEvents(body.events)
  const db = context.env.DB

  const existing = await context.env.DB.prepare(
    `SELECT user_id, name, mode, saved_at, data FROM companies WHERE id = ?`
  ).bind(id).first()

  // Same id owned by someone else — client should pick a new id
  if (existing && existing.user_id !== user.id) return json({ error: 'forbidden' }, 403)

  if (existing && typeof baseSavedAt === 'number' && existing.saved_at > baseSavedAt) {
    if (events.length) await db.batch(insertEventStatements(db, { companyId: id, userId: user.id, events, status: 'rejected' }))
    return json({
      error: 'conflict',
      company: { id, name: existing.name, mode: existing.mode, saved_at: existing.saved_at, data: JSON.parse(existing.data) },
    }, 409)
  }

  let storedData = null
  if (existing) {
    try { storedData = JSON.parse(existing.data) } catch { /* unreadable row: nothing to keep */ }
  }
  if (existing && typeof data === 'object' && !('campaign' in data) && storedData?.campaign) {
    data = { ...data, campaign: storedData.campaign }
  }

  const savedAt = Date.now()
  const logged = events.length ? events : [unloggedEvent(storedData, data, { now: savedAt })].filter(Boolean)
  const upsert = db.prepare(
    `INSERT INTO companies (id, user_id, name, mode, saved_at, data)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       mode = excluded.mode,
       saved_at = excluded.saved_at,
       data = excluded.data
     WHERE companies.user_id = ?`
  ).bind(id, user.id, name, mode || 'standard', savedAt, JSON.stringify(data), user.id)
  await db.batch([upsert, ...insertEventStatements(db, { companyId: id, userId: user.id, events: logged, now: savedAt })])

  return json({ ok: true, savedAt })
}
