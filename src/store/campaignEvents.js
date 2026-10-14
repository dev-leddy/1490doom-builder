// ── Campaign activity log: events ─────────────────────────────────────────────
// Pure (no store) so it's unit-testable. builderStore creates events as things happen in a
// campaign company and the save queue sends them with the next company save; the server
// keeps them in campaign_events (see functions/lib/campaignEvents.js for the checks).
//
// Event: { id, type, v, at, afterGame, ref, payload }
//   id        client uuid (the server ignores a repeat)
//   afterGame games played when it happened (0 = the starting company)
//   ref       for an undo: the id of the event it takes back

// Types a client may send. 'system.unlogged' is written by the server only.
export const CLIENT_EVENT_TYPES = [
  'campaign.started', 'campaign.baseline', 'campaign.left', 'campaign.resumed',
  'game.recorded', 'campaign.completed', 'campaign.endedEarly', 'campaign.reopened',
  'game.undone', 'game.renamed',
  'upgrade.bought', 'upgrade.changed', 'upgrade.undone',
  'warrior.hired', 'warrior.recruitUndone', 'warrior.removed', 'warrior.renamed',
  'captain.changed', 'ip.edited', 'company.renamed', 'mark.changed',
]

// iOS Safari <15.4 doesn't have crypto.randomUUID; the fallback still has the uuid shape
export const newEventId = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 3) | 8).toString(16)
  })

export function makeEvent(type, payload = {}, { afterGame = 0, ref = null, now = Date.now(), id } = {}) {
  return { id: id || newEventId(), type, v: 1, at: now, afterGame, ref, payload }
}

// What an editable event is about, so repeated edits of the same thing can merge
function editKey(e) {
  if (e.type === 'ip.edited') return `ip:${e.payload?.uid}`
  if (e.type === 'warrior.renamed') return `wname:${e.payload?.uid}`
  if (e.type === 'company.renamed') return 'cname'
  if (e.type === 'game.renamed') return `gname:${e.payload?.gameNumber}`
  return null
}

// Merges unsent edits of the same thing (IP set by hand, renames): one event, first `from`,
// last `to`, at the place of the first. An edit that ends where it started is dropped.
// Events of other types are kept as they are, in order.
export function coalesce(events = []) {
  const out = []
  const open = new Map() // edit key -> index in out
  for (const e of events) {
    const key = editKey(e)
    if (key == null) { out.push(e); continue }
    if (!open.has(key)) {
      open.set(key, out.length)
      out.push(e)
      continue
    }
    const i = open.get(key)
    const first = out[i]
    out[i] = { ...first, at: e.at, afterGame: e.afterGame, payload: { ...first.payload, ...e.payload, from: first.payload?.from, to: e.payload?.to } }
  }
  return out.filter(e => editKey(e) == null || e.payload?.from !== e.payload?.to)
}
