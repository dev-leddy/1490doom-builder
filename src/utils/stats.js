// ── Effective stats ───────────────────────────────────────────────────────────
// The single place that works out a warrior's displayed stats. Used by the builder
// card, play mode, the print roster and both Discord exports, so they always agree.
//
// `unit` is a builder slot or a play-mode warrior: { type, weapon1, weapon2, ip,
// statImprove, statImproves }. `statuses` (play mode) apply temporary penalties.
//
// Returns, per stat: { base, value, display, net, mods }
//   mods:  [{ source, delta, label }] — every modifier that applied (+1 = better)
//   net:   sum of deltas (> 0 improved, < 0 debuffed, 0 with mods = cancelled out)
//   value: the resulting number (for SKL/DEF/COM a better result is a LOWER target)
//   display: '3+' for check stats, a plain number otherwise

import { WARRIORS } from '../data/warriors.js'

export const STAT_KEYS = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']
const CHECK_STATS = new Set(['SKL', 'DEF', 'COM']) // rolled targets: "4+" — lower is better
const BEST_CHECK = 2                                // nothing gets easier than 2+

// Which stats a warrior has bought +1 on. Standard mode: one improvement ('stat' upgrade +
// statImprove). Campaign mode: any number (statImproves, one per stat).
export function improvedStats(unit) {
  const set = new Set(unit.statImproves || [])
  if (unit.statImprove && (unit.ip || []).includes('stat')) set.add(unit.statImprove)
  return set
}

export function isDualWielding(unit, wdata = WARRIORS[unit.type]) {
  // The Reaver's second Light Weapon is already counted in its printed ATK
  return unit.weapon1 === 'Light Weapon' && unit.weapon2 === 'Light Weapon' && !wdata?.fixedDualWield
}

function modifiersFor(unit, wdata, statuses) {
  const mods = Object.fromEntries(STAT_KEYS.map(s => [s, []]))
  if (isDualWielding(unit, wdata)) mods.ATK.push({ source: 'dualWield', delta: 1, label: 'Dual wield' })
  for (const s of improvedStats(unit)) {
    if (mods[s]) mods[s].push({ source: 'statImprove', delta: 1, label: 'Stat improvement' })
  }
  if (unit.weapon1 === 'Polearm (one-handed)') mods.COM.push({ source: 'polearm', delta: -1, label: 'One-handed polearm' })
  const has = name => statuses.some(st => st.name === name)
  if (has('SUNDERED')) mods.COM.push({ source: 'status', delta: -1, label: 'Sundered' })
  if (has('SWARMED')) {
    mods.MOV.push({ source: 'status', delta: -1, label: 'Swarmed' })
    mods.DEF.push({ source: 'status', delta: -1, label: 'Swarmed' })
  }
  return mods
}

export function getEffectiveStats(unit, { statuses = [] } = {}) {
  const wdata = WARRIORS[unit?.type]
  if (!wdata) return null
  const mods = modifiersFor(unit, wdata, statuses)
  const out = {}
  for (const s of STAT_KEYS) {
    const base = parseInt(wdata.stats[s])
    const net = mods[s].reduce((sum, m) => sum + m.delta, 0)
    const value = CHECK_STATS.has(s) ? Math.max(BEST_CHECK, base - net) : Math.max(0, base + net)
    out[s] = { base, value, display: CHECK_STATS.has(s) ? `${value}+` : value, net, mods: mods[s] }
  }
  return out
}

// 'improved' | 'debuffed' | '' — callers map this onto their own CSS class names
export function statTone(stat) {
  return stat.net > 0 ? 'improved' : stat.net < 0 ? 'debuffed' : ''
}
