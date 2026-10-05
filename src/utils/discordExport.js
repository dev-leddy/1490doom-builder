// ── Discord Export Formatter ───────────────────────────────────────────────────
// Generates a clean, copy-pasteable Discord message for a doom company.
// Matches the stat logic in WarriorCard.jsx exactly.

import { WARRIORS } from '../data/warriors.js'
import { WEAPONS, CLIMBING_ITEMS } from '../data/weapons.js'
import { getEffectiveStats } from './stats.js'

const DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
// Stat display order matching WarriorCard
const STAT_ORDER = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']

// Improved stats are underlined (Discord __markdown__)
function buildStats(slot) {
  const stats = getEffectiveStats(slot)
  return STAT_ORDER.map(s => {
    const label = `${s} ${stats[s].display}`
    return stats[s].net > 0 ? `__${label}__` : label
  }).join(' | ')
}

// ── Equipment lines ───────────────────────────────────────────────────────────

function weaponLabel(weaponName) {
  if (!weaponName) return null
  const w = WEAPONS[weaponName]
  if (!w) return weaponName
  const details = []
  if (w.damage > 0) details.push(`${w.damage}dmg`)
  if (w.range && w.range !== 'Base' && w.range !== '—') details.push(w.range)
  return details.length ? `${weaponName} (${details.join(', ')})` : weaponName
}

function ipWrap(text, isIP) {
  return isIP ? `__${text}__` : text
}

function buildEquipmentLines(slot) {
  const items = []

  // weapon1 is always base — never IP
  if (slot.weapon1) items.push(weaponLabel(slot.weapon1))

  // weapon2 is an IP upgrade
  if (slot.weapon2) {
    items.push(ipWrap(weaponLabel(slot.weapon2), slot.ip?.includes('weapon2')))
  }

  if (slot.climbing && slot.climbing !== 'None') {
    const c = CLIMBING_ITEMS[slot.climbing]
    const detail = c ? ` (${c.height})` : ''
    items.push(ipWrap(`${slot.climbing}${detail}`, slot.ip?.includes('climbing')))
  }

  if (slot.consumable && slot.consumable !== 'None') {
    items.push(ipWrap(slot.consumable, slot.ip?.includes('consumable')))
  }

  return items.filter(Boolean)
}

// ── Abilities line ────────────────────────────────────────────────────────────

function buildAbilities(slot, wdata) {
  const names = []

  // Class abilities
  if (wdata?.abilities) {
    names.push(...wdata.abilities.map(a => a.name.toUpperCase()))
  }

  // Weapon special abilities
  for (const weaponKey of [slot.weapon1, slot.weapon2]) {
    if (!weaponKey) continue
    const w = WEAPONS[weaponKey]
    if (w?.abilityName) {
      names.push(w.abilityName.toUpperCase())
      if (w.ability2Name) names.push(w.ability2Name.toUpperCase())
    }
  }

  return names.length ? `*${names.join(' · ')}*` : null
}

// ── Single warrior block ──────────────────────────────────────────────────────

function formatWarrior(slot) {
  if (!slot.type) return null
  const wdata = WARRIORS[slot.type]
  if (!wdata) return null

  const lines = []

  // Header: bold name + optional captain tag + IP count
  const displayName = slot.customName
    ? `${slot.customName} (${slot.type})`
    : slot.type
  const captainTag = slot.isCaptain ? ' ★ Captain' : ''
  const ipCount = slot.ip?.length || 0
  const ipTag = ipCount > 0 ? ` | ${ipCount} IP` : ''
  lines.push(`**${displayName}${captainTag}**${ipTag}`)

  // Stats
  lines.push('Stats')
  lines.push(`> ${buildStats(slot)}`)

  // Equipment
  const equipItems = buildEquipmentLines(slot)
  if (equipItems.length) {
    lines.push('Equipment')
    for (const item of equipItems) lines.push(`> ${item}`)
  }

  // Abilities
  const abilities = buildAbilities(slot, wdata)
  if (abilities) {
    lines.push('Abilities')
    lines.push(`> ${abilities}`)
  }

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
