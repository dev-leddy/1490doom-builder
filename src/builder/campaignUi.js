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
