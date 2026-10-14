// ── Activity log: what each event says ────────────────────────────────────────
// Pure display helpers for ActivityLogSheet (events: see store/campaignEvents.js).

import { CAMPAIGN_RULES } from '../data/campaign.js'

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
    case 'game.undone': return { icon: '↶', text: `Game ${p.gameNumber} undone`, sub: p.result ? `Was a ${RESULT[p.result] || p.result}` : null }
    case 'game.renamed': return { icon: '✎', text: `Game ${p.gameNumber} scenario: ${p.to || 'none'}`, sub: p.from ? `Was ${p.from}` : null }
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
    case 'ip.edited': return { icon: '±', text: `${p.name} IP set by hand: ${p.from} to ${p.to}`, sub: null }
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
