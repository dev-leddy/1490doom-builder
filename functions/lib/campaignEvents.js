// ── Campaign activity events: server-side checks ──────────────────────────────
// Events arrive with company saves (POST /api/companies, `events`). Anything that doesn't
// pass is dropped quietly: answering 400 would make the client retry the same save forever.
// Mirrors src/store/campaignEvents.js (kept separate: Functions don't import from src/).

export const CLIENT_EVENT_TYPES = new Set([
  'campaign.started', 'campaign.baseline', 'campaign.left', 'campaign.resumed',
  'game.recorded', 'campaign.completed', 'campaign.endedEarly', 'campaign.reopened',
  'game.undone', 'game.renamed',
  'upgrade.bought', 'upgrade.changed', 'upgrade.undone',
  'warrior.hired', 'warrior.recruitUndone', 'warrior.removed', 'warrior.renamed',
  'captain.changed', 'ip.edited', 'company.renamed', 'mark.changed',
])

export const MAX_EVENTS = 50          // per request
export const MAX_PAYLOAD_BYTES = 4096 // JSON of one event's payload

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// → { valid: [{ id, type, afterGame, ref, payload (JSON string), at }], dropped: number }
export function validateEvents(events) {
  if (!Array.isArray(events)) return { valid: [], dropped: 0 }
  const valid = []
  const seen = new Set()
  let dropped = 0
  for (const e of events) {
    if (valid.length >= MAX_EVENTS) { dropped++; continue }
    const ok = e && typeof e === 'object' &&
      typeof e.id === 'string' && UUID.test(e.id) && !seen.has(e.id) &&
      CLIENT_EVENT_TYPES.has(e.type) &&
      Number.isInteger(e.afterGame) && e.afterGame >= 0 && e.afterGame <= 1000 &&
      (e.ref == null || (typeof e.ref === 'string' && UUID.test(e.ref))) &&
      Number.isFinite(e.at) &&
      (e.payload == null || (typeof e.payload === 'object' && !Array.isArray(e.payload)))
    const payload = ok ? JSON.stringify(e.payload ?? {}) : ''
    if (!ok || new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) { dropped++; continue }
    seen.add(e.id)
    valid.push({ id: e.id, type: e.type, afterGame: e.afterGame, ref: e.ref ?? null, payload, at: e.at })
  }
  return { valid, dropped }
}

// Statements storing checked events. status: 'ok' | 'rejected' (sent with a save that lost a conflict)
export function insertEventStatements(db, { companyId, userId, events, status = 'ok', now = Date.now() }) {
  return events.map(e => db.prepare(
    `INSERT OR IGNORE INTO campaign_events
       (id, company_id, user_id, type, after_game, ref, payload, client_at, server_at, device, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
  ).bind(e.id, companyId, userId, e.type, e.afterGame, e.ref, e.payload, e.at, now, status))
}

// A campaign save without events whose game count changed: an older app changed games
// without logging them. Returns the event to store, or null.
export function unloggedEvent(storedData, incomingData, { now = Date.now(), id } = {}) {
  const before = storedData?.campaign?.log?.length ?? null
  const after = incomingData?.campaign?.log?.length ?? null
  if (incomingData?.companyMode !== 'campaign' || before == null || after == null || before === after) return null
  return {
    id: id || crypto.randomUUID(), type: 'system.unlogged', afterGame: Math.min(before, after), ref: null,
    payload: JSON.stringify({ fromGames: before, toGames: after }), at: now,
  }
}
