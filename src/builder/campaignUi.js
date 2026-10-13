// Small display helpers for the campaign UI (the rules live in store/campaign.js)
import { openUpgrades } from '../store/campaign'

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

// Name of a warrior in a game record, by uid (roster first, then the fallen list)
export function nameInRecord(record, uid) {
  return record.roster?.find(r => r.uid === uid)?.name || record.fallen?.find(f => f.uid === uid)?.name || 'A warrior'
}
