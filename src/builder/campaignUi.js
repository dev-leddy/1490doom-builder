// Small display helpers for the campaign UI (the rules live in store/campaign.js)
import { openUpgrades, nameWithClass } from '../store/campaign'

export const RESULT_LETTER = { win: 'W', loss: 'L', draw: 'D', retreat: 'R' }
export const RESULT_NAME = { win: 'Victory', loss: 'Defeat', draw: 'Draw', retreat: 'Retreat' }
export const AWARD_REASON = { survivor: 'survivor', captain: 'Captain', bonus: 'bonus' }

// Unspent IP a warrior could still use (banked IP beyond what's left to buy doesn't count)
export function spendableNow(slot) {
  if (!slot?.type) return 0
  const banked = Math.max(0, (slot.earnedIP || 0) - (slot.ip?.length || 0))
  return Math.min(banked, openUpgrades(slot).length)
}

// "4W 2L 1D 1R" (only the results that happened)
export function resultTally(log = []) {
  const n = { win: 0, loss: 0, draw: 0, retreat: 0 }
  for (const r of log) if (n[r.result] != null) n[r.result]++
  return Object.entries(n).filter(([, c]) => c).map(([k, c]) => `${c}${RESULT_LETTER[k]}`).join(' ')
}

// The same tally in words: "3 wins · 1 loss · 1 draw"
const RESULT_WORDS = { win: ['win', 'wins'], loss: ['loss', 'losses'], draw: ['draw', 'draws'], retreat: ['retreat', 'retreats'] }
export function resultWords(log = []) {
  const n = { win: 0, loss: 0, draw: 0, retreat: 0 }
  for (const r of log) if (n[r.result] != null) n[r.result]++
  return Object.entries(n).filter(([, c]) => c).map(([k, c]) => `${c} ${RESULT_WORDS[k][c === 1 ? 0 : 1]}`).join(' · ')
}

// A fallen warrior's name: "Brother Aldric (Warrior Priest)" with a custom name, else the class
export const fallenName = nameWithClass

// Name of a warrior in a game record, by uid. The fallen are named with their class.
export function nameInRecord(record, uid) {
  const fell = record.fallen?.find(f => f.uid === uid)
  if (fell) return fallenName(fell)
  return record.roster?.find(r => r.uid === uid)?.name || 'A warrior'
}

// Roster changes between games, as lines: "Recruited: Joss (Scout), starting IP 1", "Recruit undone: Scout"
export function rosterLinesAfter(campaign, afterGame) {
  return (campaign?.roster || [])
    .filter(e => e.afterGame === afterGame)
    .map(e => e.action === 'recruited'
      ? `Recruited: ${e.name}${e.startIP ? `, starting IP ${e.startIP}` : ''}`
      : `Recruit undone: ${e.name}`)
}

// Upgrades bought between games, grouped per warrior in purchase order:
// [{ uid, name, labels: ['Combat', 'Grappling Hook'] }] for those bought after `afterGame` games
export function upgradesAfter(campaign, afterGame) {
  const groups = []
  for (const e of campaign?.upgrades || []) {
    if (e.afterGame !== afterGame) continue
    let g = groups.find(x => x.uid === e.uid)
    if (!g) groups.push(g = { uid: e.uid, name: e.name, labels: [] })
    g.labels.push(e.label || e.item || e.stat)
  }
  return groups
}

// What undoing the latest game takes back, as ConfirmModal rules
export function undoGameRules(last) {
  if (!last) return []
  return [
    { label: 'Result', text: `Game ${last.gameNumber} (${RESULT_NAME[last.result]}) comes off the log.` },
    ...(last.awards?.length ? [{ label: 'IP', text: `${last.awards.map(a => `${nameInRecord(last, a.uid)} +${a.ip}`).join(', ')} taken back.` }] : []),
    ...(last.fallen?.length ? [{ label: 'The fallen', text: `${last.fallen.map(fallenName).join(', ')} return to the company.` }] : []),
    ...(last.captainChange ? [{ label: 'Captain', text: `${nameInRecord(last, last.captainChange.from)} leads again.` }] : []),
    { label: 'Since then', text: `Recruits hired and upgrades bought after game ${last.gameNumber} are lost too.`, limit: true },
  ]
}

// The whole campaign as plain text, for Export log (copy or .txt download)
export function campaignLogText({ companyName, slots = [], campaign, completed = 0, total = 6 }, { now = Date.now() } = {}) {
  const log = campaign?.log || []
  const upgrades = campaign?.upgrades || []
  const done = completed >= total || !!campaign?.completedAt
  const tally = resultTally(log)
  const lines = [
    (companyName || 'Unnamed company').toUpperCase(),
    `Campaign: ${done ? `complete after ${completed} game${completed === 1 ? '' : 's'}` : `before game ${completed + 1} of ${total}`}${tally ? ` (${tally})` : ''}`,
    `Exported ${new Date(now).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    '',
    'ROSTER',
  ]
  const living = slots.filter(s => s?.type)
  if (!living.length) lines.push('  No warriors.')
  for (const s of living) {
    const bought = upgrades.filter(e => e.uid && e.uid === s.uid).map(e => e.label || e.item || e.stat)
    const spent = s.ip?.length || 0
    lines.push(`- ${nameWithClass(s)}${s.isCaptain ? ', Captain' : ''}: ${s.earnedIP || 0} IP earned, ${spent} spent${bought.length ? `. ${bought.join(', ')}` : ''}`)
  }
  const between = (afterGame, title) => {
    const roster = rosterLinesAfter(campaign, afterGame)
    const groups = upgradesAfter(campaign, afterGame)
    if (!roster.length && !groups.length) return
    lines.push(`  ${title}:`)
    for (const r of roster) lines.push(`    ${r}`)
    for (const g of groups) lines.push(`    ${g.name}: ${g.labels.join(', ')}`)
  }
  const legacy = Math.max(0, completed - log.length)
  lines.push('', 'GAMES')
  if (legacy) lines.push(`  ${legacy === 1 ? 'Game 1 was' : `Games 1 to ${legacy} were`} played before the log was kept.`)
  if (!log.length && !legacy) lines.push('  No games recorded yet.')
  between(0, 'Starting company')
  for (const r of log) {
    lines.push(`Game ${r.gameNumber}: ${RESULT_NAME[r.result] || r.result}${r.scenario ? `. ${r.scenario}` : ''}`)
    lines.push(`  Fell: ${r.fallen?.length ? r.fallen.map(fallenName).join(', ') : 'No one'}`)
    const awards = (r.awards || []).map(a => `${nameInRecord(r, a.uid)} +${a.ip} (${AWARD_REASON[a.reason] || a.reason})`)
    lines.push(`  IP: ${awards.length ? awards.join(', ') : r.result === 'retreat' ? 'None (retreated)' : 'None'}`)
    const cc = r.captainChange
    if (cc) lines.push(`  Captain: ${cc.to ? `${nameInRecord(r, cc.to)} took command from ${nameInRecord(r, cc.from)}` : `${nameInRecord(r, cc.from)} fell with the whole company`}`)
    between(r.gameNumber, `Before game ${r.gameNumber + 1}`)
  }
  const fallen = log.flatMap(r => (r.fallen || []).map(f => ({ ...f, game: r.gameNumber })))
  if (fallen.length) {
    lines.push('', 'THE FALLEN')
    for (const f of fallen) lines.push(`- ${fallenName(f)}: fell in game ${f.game}, ${f.earnedIP || 0} IP`)
  }
  return lines.join('\n') + '\n'
}
