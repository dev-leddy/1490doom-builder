// ── Campaign activity log: events ─────────────────────────────────────────────
// Pure (no store) so it's unit-testable. builderStore creates events as things happen in a
// campaign company and the save queue sends them with the next company save; the server
// keeps them in campaign_events (see functions/lib/campaignEvents.js for the checks).
//
// Event: { id, type, v, at, afterGame, ref, payload }
//   id        client uuid (the server ignores a repeat)
//   afterGame games played when it happened (0 = the starting company)
//   ref       for an undo: the id of the event it takes back; for entry.noted,
//             game.renamed and game.edited: the event it is about

import { canUndoLastGame, lastUpgrade, undoRecruitBlock, campaignProgress, nameWithClass } from './campaign.js'

// Types a client may send. 'system.unlogged' is written by the server only.
export const CLIENT_EVENT_TYPES = [
  'campaign.started', 'campaign.baseline', 'campaign.left', 'campaign.resumed',
  'game.recorded', 'campaign.completed', 'campaign.endedEarly', 'campaign.reopened',
  'campaign.lengthChanged', // no longer sent; kept so older queued events still go through
  'game.undone', 'game.renamed', 'game.edited',
  'upgrade.bought', 'upgrade.changed', 'upgrade.undone',
  'warrior.hired', 'warrior.recruitUndone', 'warrior.removed', 'warrior.renamed',
  'warrior.resurrected',
  'captain.changed', 'ip.edited', 'company.renamed', 'mark.changed',
  'entry.noted',
]

// entry.noted: { text } on the event `ref` points at; the latest note wins, '' removes it
export const MAX_NOTE_LENGTH = 500

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

// ── Row helpers for the activity log UI ───────────────────────────────────────

// The note on an event (latest entry.noted for it wins), or null if none / removed
export function notesFor(events = [], eventId) {
  let text = null
  for (const e of events) {
    if (e.type === 'entry.noted' && e.ref === eventId && e.status !== 'rejected') text = e.payload?.text || null
  }
  return text
}

// Living warriors' slot indices for the uids an event names
function slotsNamedIn(company, event) {
  const p = event.payload || {}
  const uids = new Set([p.uid, ...(p.awards || []).map(a => a.uid), ...(p.roster || []).map(r => r.uid)].filter(Boolean))
  return (company?.slots || []).map((s, i) => (s.type && uids.has(s.uid) ? i : -1)).filter(i => i >= 0)
}

// What a tapped log row can still do, given the company as it is now:
//   undoGame     the event is the latest recorded game and it can be undone
//   undoUpgrade  { slotIndex } when it is that warrior's most recent upgrade
//   undoRecruit  { slotIndex } when the recruit is still there and can be taken back
//   renameGame   the game number, for a recorded game still in the log
//   editOutcome  { gameNumber, latest } for a recorded game still in the log; latest = it can
//                be entered again in full (reRecordLatestGame), else only result + survivor point
//   fixIP        slot indices of living warriors the event names (to correct IP by hand)
export function rowActions(company, event) {
  const p = event?.payload || {}
  const slots = company?.slots || []
  const log = company?.campaign?.log || []
  const slotOf = uid => slots.findIndex(s => s.type && s.uid === uid)
  const out = { undoGame: false, undoUpgrade: null, undoRecruit: null, renameGame: null, editOutcome: null, fixIP: event ? slotsNamedIn(company, event) : [] }
  if (!event || event.status === 'rejected') return { ...out, fixIP: [] }

  if (event.type === 'game.recorded') {
    out.undoGame = log.at(-1)?.eventId === event.id && canUndoLastGame(company)
    const record = log.find(r => r.gameNumber === p.gameNumber)
    if (record) out.editOutcome = { gameNumber: p.gameNumber, latest: record === log.at(-1) && !!record.before }
  }
  if (event.type === 'game.recorded' || event.type === 'game.renamed') {
    if (log.some(r => r.gameNumber === p.gameNumber)) out.renameGame = p.gameNumber
  }
  if (event.type === 'upgrade.bought') {
    const i = slotOf(p.uid)
    const last = i >= 0 ? lastUpgrade(slots[i]) : null
    const entry = [...(company.campaign?.upgrades || [])].reverse().find(e => e.uid === p.uid)
    if (last && last.id === p.id && entry?.eventId === event.id) out.undoUpgrade = { slotIndex: i }
  }
  if (event.type === 'warrior.hired') {
    const i = slotOf(p.uid)
    if (i >= 0 && !undoRecruitBlock(slots[i])) out.undoRecruit = { slotIndex: i }
  }
  return out
}

// campaign.baseline: the first event of a campaign that predates the activity log, saying
// how many games were already played and who is in the company. null for an empty, unplayed one.
//   afterGame = games played - 1, so the log's game column (afterGame + 1) shows the last
//   game played, e.g. "Log started after game 3" sits under game 3 (0 when none played yet).
//   payload.completed is the actual number of games played.
//   at is 1 ms earlier than now, so it sorts before whatever is logged in the same moment.
export function makeBaselineEvent(company, { now = Date.now(), id } = {}) {
  const { completed } = campaignProgress(company)
  const roster = (company?.slots || []).filter(x => x.type)
  if (!roster.length && !completed) return null
  return makeEvent('campaign.baseline', {
    completed,
    roster: roster.map(x => ({ uid: x.uid, name: nameWithClass(x), type: x.type, earnedIP: x.earnedIP || 0, spent: x.ip?.length || 0, captain: !!x.isCaptain })),
  }, { afterGame: Math.max(0, completed - 1), now: now - 1, id })
}
