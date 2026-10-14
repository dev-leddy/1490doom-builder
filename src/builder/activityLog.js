// ── Activity log: what each event says ────────────────────────────────────────
// Pure display helpers for the campaign log (events: see store/campaignEvents.js).

import { CAMPAIGN_RULES } from '../data/campaign.js'
import { notesFor } from '../store/campaignEvents.js'

const RESULT = { win: 'Victory', loss: 'Defeat', draw: 'Draw', retreat: 'Retreat' }
const REASON = { survivor: 'survivor', captain: 'Captain', bonus: 'bonus' }

// Filter chips → which events they show
export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'games', label: 'Games' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'roster', label: 'Roster' },
  { id: 'ip', label: 'IP edits' },
]

export function eventGroup(type) {
  if (type.startsWith('upgrade.')) return 'upgrades'
  if (type.startsWith('warrior.') || type === 'captain.changed') return 'roster'
  if (type === 'ip.edited') return 'ip'
  if (type.startsWith('game.') || type.startsWith('campaign.') || type === 'system.unlogged') return 'games'
  return 'other'
}

export function matchesFilter(e, filter) {
  return filter === 'all' || eventGroup(e.type) === filter
}

// Event types that take back an earlier event (its id is in `ref`)
const UNDO_TYPES = new Set(['game.undone', 'upgrade.undone', 'warrior.recruitUndone'])

// Ids of events that a later undo took back (rejected undos don't count)
export function undoneIds(events) {
  return new Set(events.filter(e => UNDO_TYPES.has(e.type) && e.ref && e.status !== 'rejected').map(e => e.ref))
}

// "Before game 3", or "After game 6" once every game is played; 0 games = the starting company
export function groupTitle(afterGame) {
  if (afterGame >= CAMPAIGN_RULES.games) return `After game ${afterGame}`
  return afterGame === 0 ? 'Before game 1' : `Before game ${afterGame + 1}`
}

// Events in groups by games played, newest group first and newest event first in each
export function groupEvents(events) {
  const groups = new Map()
  for (const e of events) {
    const k = e.afterGame || 0
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(e)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([afterGame, list]) => ({ afterGame, title: groupTitle(afterGame), events: [...list].reverse() }))
}

const list = a => a.filter(Boolean).join(', ')

// { icon, text, sub } for one event
export function describeEvent(e) {
  const p = e.payload || {}
  switch (e.type) {
    case 'campaign.started': return { icon: '⚑', text: 'Campaign started', sub: p.games ? `${p.games} games` : null }
    case 'campaign.baseline': return {
      icon: '⚑', text: p.completed ? `Log started after game ${p.completed}` : 'Log started',
      sub: (p.roster || []).length ? list(p.roster.map(r => `${r.name} ${r.earnedIP || 0} IP`)) : null,
    }
    case 'campaign.left': return { icon: '⚑', text: 'Switched to a standard company', sub: null }
    case 'campaign.resumed': return { icon: '⚑', text: 'Campaign resumed', sub: null }
    case 'campaign.completed': return { icon: '★', text: 'Campaign complete', sub: p.games ? `${p.games} games played` : null }
    case 'campaign.endedEarly': return { icon: '★', text: 'Campaign ended early', sub: `After ${p.completed || 0} ${p.completed === 1 ? 'game' : 'games'}` }
    case 'campaign.reopened': return { icon: '⚑', text: 'Campaign reopened', sub: null }
    case 'game.recorded': {
      const awards = (p.awards || []).map(a => `${a.name || 'A warrior'} +${a.ip} (${REASON[a.reason] || a.reason})`)
      const cc = p.captainChange
      return {
        icon: '⚔', text: `Game ${p.gameNumber} recorded: ${RESULT[p.result] || p.result}`,
        sub: list([
          p.scenario,
          awards.length ? `IP: ${awards.join(', ')}` : p.result === 'retreat' ? 'No IP (retreated)' : 'No IP',
          (p.fallen || []).length ? `Fell: ${p.fallen.join(', ')}` : null,
          cc ? (cc.to ? `${cc.to} took command` : 'No Captain left') : null,
        ]),
      }
    }
    case 'game.edited': {
      const from = p.from?.result, to = p.to?.result
      const deltas = (p.deltas || []).map(d => `${d.name || 'A warrior'} ${d.ip > 0 ? '+' : ''}${d.ip}`)
      return {
        icon: '✎',
        text: from && to && from !== to
          ? `Game ${p.gameNumber} outcome changed: ${RESULT[from] || from} to ${RESULT[to] || to}`
          : `Game ${p.gameNumber} outcome changed`,
        sub: deltas.length ? deltas.join(', ') : 'No IP changed',
      }
    }
    case 'campaign.lengthChanged': {
      const n = v => (v == null ? 'no limit' : `${v} games`)
      return {
        icon: '⚑',
        text: p.from != null && p.to != null ? `Campaign length: ${p.from} to ${p.to} games` : `Campaign length: ${n(p.from)} to ${n(p.to)}`,
        sub: null,
      }
    }
    case 'game.undone': return { icon: '↶', text: `Game ${p.gameNumber} undone`, sub: p.result ? `Was a ${RESULT[p.result] || p.result}` : null }
    case 'game.renamed': return { icon: '✎', text: `Game ${p.gameNumber} renamed: ${p.to || 'no name'}`, sub: p.from ? `Was ${p.from}` : null }
    case 'entry.noted': return { icon: '✎', text: p.text ? `Note: ${p.text}` : 'Note removed', sub: null }
    case 'upgrade.bought': return { icon: '▲', text: p.kind === 'stat' ? `${p.name} improved ${p.label}` : `${p.name} bought ${p.label}`, sub: null }
    case 'upgrade.changed': return { icon: '✎', text: `${p.name} swapped ${p.from} for ${p.to}`, sub: null }
    case 'upgrade.undone': return { icon: '↶', text: `${p.name}: ${p.label} undone`, sub: 'IP given back' }
    case 'warrior.hired': return {
      icon: '+', text: `${p.name} recruited`,
      sub: list([`Starting IP ${p.startIP || 0}`, p.replaced ? `Replaces ${p.replaced}` : null, p.captain ? 'Captain' : null]),
    }
    case 'warrior.recruitUndone': return { icon: '↶', text: `Recruit undone: ${p.name}`, sub: null }
    case 'warrior.removed': return { icon: '−', text: `${p.name} removed from the company`, sub: null }
    case 'warrior.renamed': return { icon: '✎', text: `${p.from} renamed to ${p.to}`, sub: p.type && p.to !== p.type ? p.type : null }
    case 'captain.changed': return { icon: '★', text: `${p.to} is now Captain`, sub: p.from ? `Was ${p.from}` : null }
    case 'ip.edited': return { icon: '±', text: `${p.name} IP modified by user: ${p.from} to ${p.to}`, sub: null }
    case 'company.renamed': return { icon: '✎', text: `Company renamed to ${p.to || 'Unnamed Company'}`, sub: p.from ? `Was ${p.from}` : null }
    case 'mark.changed': return { icon: '✎', text: `Mark changed to ${p.to || 'no mark'}`, sub: p.from ? `Was ${p.from}` : null }
    case 'system.unlogged': return {
      icon: '!', text: 'Changed without a log entry',
      sub: `Saved from an older version of the app (games ${p.fromGames ?? '?'} to ${p.toGames ?? '?'})`,
    }
    default: return { icon: '•', text: e.type, sub: null }
  }
}

// "14 Oct, 18:05"
export function eventTime(at) {
  if (!Number.isFinite(at)) return ''
  const d = new Date(at)
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
}

// ── Activity log table (ActivityLogView) ──────────────────────────────────────
// Rows with a game, warriors, a kind and searchable text, plus the filters over them.

// Event kinds: the type tag and the multi-select filter chips
export const KINDS = [
  { id: 'games', label: 'Games' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'roster', label: 'Roster' },
  { id: 'captain', label: 'Captain' },
  { id: 'ip', label: 'IP edits' },
  { id: 'campaign', label: 'Campaign' },
]
const KIND_TAG = { games: 'Game', upgrades: 'Upgrade', roster: 'Roster', captain: 'Captain', ip: 'IP edit', campaign: 'Campaign' }

export function eventKind(type) {
  if (type.startsWith('game.')) return 'games'
  if (type.startsWith('upgrade.')) return 'upgrades'
  if (type.startsWith('warrior.')) return 'roster'
  if (type === 'captain.changed') return 'captain'
  if (type === 'ip.edited') return 'ip'
  return 'campaign'
}

const eventAt = e => (Number.isFinite(e.at) ? e.at : e.serverAt)

// Which game an event belongs to: a game's own events, and everything done to get ready
// for it (the starting company is game 1; changes after the last game count as the last game)
export function gameOf(e, total = CAMPAIGN_RULES.games) {
  const p = e.payload || {}
  const n = e.type.startsWith('game.') && Number.isFinite(p.gameNumber)
    ? p.gameNumber
    : Math.min((e.afterGame || 0) + 1, total)
  return { key: `g${n}`, label: `Game ${n}` }
}

// The game filter's options, in order, for the games that appear in the log
export function gameOptions(events, total = CAMPAIGN_RULES.games) {
  const keys = new Set(events.filter(e => e.type !== 'entry.noted').map(e => gameOf(e, total).key))
  const opts = []
  for (let n = 1; n <= total; n++) if (keys.has(`g${n}`)) opts.push({ id: `g${n}`, label: `Game ${n}` })
  return opts
}

const withClass = (name, type) => (name && type && name !== type && !name.endsWith(`(${type})`) ? `${name} (${type})` : name || type)

// Warriors an event is about: [{ uid, name }]. The fallen are listed by name in game
// records, so names are matched back to uids seen elsewhere in the log (nameToUid).
export function eventWarriors(e, nameToUid = new Map()) {
  const p = e.payload || {}
  const byName = name => ({ uid: nameToUid.get(name) || `name:${name}`, name })
  switch (e.type) {
    case 'campaign.baseline': return (p.roster || []).map(r => ({ uid: r.uid, name: r.name }))
    case 'game.edited': return (p.deltas || []).filter(d => d.uid).map(d => ({ uid: d.uid, name: d.name }))
    case 'game.recorded': {
      const out = (p.awards || []).filter(a => a.uid).map(a => ({ uid: a.uid, name: a.name }))
      for (const f of p.fallen || []) out.push(byName(f))
      if (p.captainChange?.to) out.push(byName(p.captainChange.to))
      const seen = new Set()
      return out.filter(w => !seen.has(w.uid) && seen.add(w.uid))
    }
    case 'warrior.renamed': return p.uid ? [{ uid: p.uid, name: withClass(p.to, p.type) }] : []
    case 'captain.changed': return p.uid ? [{ uid: p.uid, name: p.to }] : []
    default: return p.uid ? [{ uid: p.uid, name: p.name }] : []
  }
}

// Table rows, oldest first: { e, at, kind, tag, game, warriors, text, sub, note, undone, edited, isUndo, rejected, haystack }.
// Notes (entry.noted) aren't rows: the latest note shows on the row it is about.
export function buildRows(events = [], total = CAMPAIGN_RULES.games) {
  const sorted = [...events].sort((a, b) => (eventAt(a) || 0) - (eventAt(b) || 0))
  const noted = sorted.filter(e => e.type === 'entry.noted')
  const nameToUid = new Map()
  for (const e of sorted) {
    const p = e.payload || {}
    if (p.uid && p.name) nameToUid.set(p.name, p.uid)
    for (const r of p.roster || []) if (r.uid && r.name) nameToUid.set(r.name, r.uid)
    for (const a of p.awards || []) if (a.uid && a.name) nameToUid.set(a.name, a.uid)
  }
  const undone = undoneIds(sorted)
  // Recorded games whose outcome was edited later (the record row stays, tagged Edited)
  const edited = new Set(sorted.filter(e => e.type === 'game.edited' && e.ref && e.status !== 'rejected').map(e => e.ref))
  return sorted.filter(e => e.type !== 'entry.noted').map(e => {
    const kind = eventKind(e.type)
    const game = gameOf(e, total)
    const warriors = eventWarriors(e, nameToUid)
    const { text, sub } = describeEvent(e)
    const note = noted.length ? notesFor(noted, e.id) : null
    return {
      e, at: eventAt(e), kind, tag: KIND_TAG[kind], game, warriors, text, sub, note,
      undone: undone.has(e.id), edited: edited.has(e.id), isUndo: UNDO_TYPES.has(e.type) && !!e.ref && e.status !== 'rejected',
      rejected: e.status === 'rejected',
      haystack: [text, sub, note, game.label, KIND_TAG[kind], ...warriors.map(w => w.name)].filter(Boolean).join(' ').toLowerCase(),
    }
  })
}

// Warrior filter options: everyone who appears, by their latest name, with the fallen marked
export function warriorOptions(rows) {
  const byUid = new Map()
  for (const r of rows) for (const w of r.warriors) if (w.name) byUid.set(w.uid, { uid: w.uid, name: w.name, fell: byUid.get(w.uid)?.fell || null })
  for (const r of rows) {
    if (r.e.type !== 'game.recorded' || r.undone || r.rejected) continue
    for (const f of r.e.payload?.fallen || []) {
      const w = [...byUid.values()].find(x => x.name === f)
      if (w) w.fell = r.e.payload.gameNumber
    }
  }
  return [...byUid.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const DEFAULT_LOG_FILTERS = { game: 'all', warrior: 'all', kinds: [], q: '', showUndone: true }

// How many filters differ from the defaults (search included)
export function activeFilterCount(f) {
  return (f.game !== 'all') + (f.warrior !== 'all') + (f.kinds.length > 0) + (f.q.trim() !== '') + (!f.showUndone)
}

export function filterRows(rows, f, { newestFirst = true } = {}) {
  const q = f.q.trim().toLowerCase()
  const out = rows.filter(r =>
    (f.game === 'all' || r.game.key === f.game) &&
    (f.warrior === 'all' || r.warriors.some(w => w.uid === f.warrior)) &&
    (!f.kinds.length || f.kinds.includes(r.kind)) &&
    (f.showUndone || !(r.undone || r.isUndo)) &&
    (!q || r.haystack.includes(q)))
  return newestFirst ? out.reverse() : out
}

// The rows shown, as CSV (Export)
export function rowsToCsv(rows) {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Time', 'Game', 'Warrior', 'Event type', 'Event', 'Details', 'Note', 'Status']
  const lines = rows.map(r => [
    Number.isFinite(r.at) ? new Date(r.at).toISOString() : '', r.game.label, r.warriors.map(w => w.name).join('; '),
    r.tag, r.text, r.sub, r.note, r.rejected ? 'Not saved' : r.undone ? 'Undone' : '',
  ].map(cell).join(','))
  return [head.map(cell).join(','), ...lines].join('\r\n') + '\r\n'
}
