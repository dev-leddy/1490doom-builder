// ── Discord Export Formatter ───────────────────────────────────────────────────
// Generates a clean, copy-pasteable Discord message for a doom company.
// Matches the stat logic in WarriorCard.jsx exactly.

import { WARRIORS } from '../data/warriors.js'
import { WEAPONS, CLIMBING_ITEMS } from '../data/weapons.js'

const DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
// Stat display order matching WarriorCard
const STAT_ORDER = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']

// ── Stat helpers (mirrors WarriorCard.jsx) ────────────────────────────────────

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return `${parseInt(base) - 1}+`
  return parseInt(base) + 1
}

function debuffStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return `${parseInt(base) + 1}+`
  return Math.max(0, parseInt(base) - 1)
}

function buildStats(slot, wdata) {
  const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
  const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0
  const polearmDebuff = slot.weapon1 === 'Polearm (one-handed)'

  return STAT_ORDER.map(s => {
    let base = wdata.stats[s]

    // ATK dual-wield bonus
    if (s === 'ATK') base = parseInt(base) + dualWieldBonus

    // Stat improvements — standard mode uses statImprove (singular),
    // campaign mode uses statImproves (array)
    const improved =
      (slot.statImproves?.includes(s)) ||
      (slot.ip?.includes('stat') && slot.statImprove === s)

    // Polearm (one-handed) COM debuff
    const debuffed = polearmDebuff && s === 'COM'

    let val = base
    if (improved && !debuffed) val = improveStatDisplay(val, s)
    else if (debuffed && !improved) val = debuffStatDisplay(val, s)
    // if both cancel out, leave base

    return `${s} ${val}`
  }).join('  ')
}

// ── Equipment line ────────────────────────────────────────────────────────────

function weaponLabel(weaponName) {
  if (!weaponName) return null
  const w = WEAPONS[weaponName]
  if (!w) return weaponName
  const parts = [weaponName]
  // Show damage for non-zero weapons, range for ranged
  if (w.damage > 0) parts.push(`+${w.damage} dmg`)
  if (w.range && w.range !== 'Base' && w.range !== '—') parts.push(w.range)
  return parts.length > 1 ? `${weaponName} (${parts.slice(1).join(', ')})` : weaponName
}

function buildEquipment(slot) {
  const items = []

  if (slot.weapon1) items.push(weaponLabel(slot.weapon1))
  if (slot.weapon2) items.push(weaponLabel(slot.weapon2))

  if (slot.climbing && slot.climbing !== 'None') {
    const c = CLIMBING_ITEMS[slot.climbing]
    const detail = c ? ` (${c.height})` : ''
    items.push(`${slot.climbing}${detail}`)
  }

  if (slot.consumable && slot.consumable !== 'None') {
    items.push(slot.consumable)
  }

  return items.join(' · ')
}

// ── Abilities line ────────────────────────────────────────────────────────────

function buildAbilities(slot, wdata) {
  const names = []

  // Captain Re-Roll first
  if (slot.isCaptain) names.push('★ Captain Re-Roll')

  // Class abilities
  if (wdata?.abilities) {
    names.push(...wdata.abilities.map(a => a.name))
  }

  // Weapon special abilities
  for (const weaponKey of [slot.weapon1, slot.weapon2]) {
    if (!weaponKey) continue
    const w = WEAPONS[weaponKey]
    if (w?.abilityName) names.push(w.abilityName)
  }

  return names.length ? `*${names.join(' · ')}*` : null
}

// ── Single warrior block ──────────────────────────────────────────────────────

function formatWarrior(slot) {
  if (!slot.type) return null
  const wdata = WARRIORS[slot.type]
  if (!wdata) return null

  const lines = []

  // Header: bold name, class in parens if custom-named, captain star
  const displayName = slot.customName
    ? `${slot.customName} (${slot.type})`
    : slot.type
  const captainTag = slot.isCaptain ? ' ★' : ''
  lines.push(`**${displayName}**${captainTag}`)

  // Stats row
  lines.push(buildStats(slot, wdata))

  // Equipment
  const gear = buildEquipment(slot)
  if (gear) lines.push(gear)

  // Abilities
  const abilities = buildAbilities(slot, wdata)
  if (abilities) lines.push(abilities)

  return lines.join('\n')
}

// ── Full company export ───────────────────────────────────────────────────────

export function generateDiscordExport(state) {
  const {
    companyName,
    mark,
    companyMode,
    ipLimit,
    slots = [],
    campaignGame,
  } = state

  // mark may be stored as a string name or a {name, label, desc} object
  const markName = (mark && typeof mark === 'object') ? mark.name : mark

  const lines = []

  // Header
  const name = companyName || 'Unnamed Company'
  const markStr = markName ? ` · ${markName}` : ''
  const modeStr = companyMode === 'campaign'
    ? ` · Campaign (Game ${(campaignGame ?? 0) + 1})`
    : ` · Standard (${ipLimit} IP)`
  lines.push(`**⚔ ${name}**${markStr}${modeStr}`)
  lines.push(DIVIDER)

  // Warriors — filter empty slots, join with blank line
  const blocks = slots.map(formatWarrior).filter(Boolean)
  if (blocks.length === 0) {
    lines.push('*(no warriors)*')
  } else {
    lines.push(blocks.join('\n\n'))
  }

  return lines.join('\n')
}
