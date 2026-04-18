// ── Discord Export Formatter ───────────────────────────────────────────────────
// Generates a clean, copy-pasteable Discord message for a doom company.

import { WARRIORS } from '../data/warriors.js'
import { WEAPONS } from '../data/weapons.js'

const DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'

/**
 * Applies campaign stat improvements to the base stats.
 * statImproves is an array of stat codes like ['MOV', 'VIT'].
 */
function applyStatImproves(baseStats, statImproves = []) {
  const stats = { ...baseStats }
  for (const code of statImproves) {
    if (code === 'MOV') stats.MOV = (stats.MOV || 0) + 1
    if (code === 'VIT') stats.VIT = (stats.VIT || 0) + 1
    if (code === 'ATK') stats.ATK = (stats.ATK || 0) + 1
    if (code === 'SKL') {
      // SKL is a string like "4+" — decrement the number
      const n = parseInt(stats.SKL)
      if (n > 2) stats.SKL = `${n - 1}+`
    }
    if (code === 'COM') {
      const n = parseInt(stats.COM)
      if (n > 2) stats.COM = `${n - 1}+`
    }
    if (code === 'DEF') {
      const n = parseInt(stats.DEF)
      if (n > 2) stats.DEF = `${n - 1}+`
    }
  }
  return stats
}

/**
 * Build the equipment line for a warrior slot.
 * Returns an array of item strings.
 */
function buildEquipment(slot) {
  const items = []

  if (slot.weapon1) items.push(slot.weapon1)
  if (slot.weapon2) items.push(slot.weapon2)
  if (slot.climbing && slot.climbing !== 'None') items.push(slot.climbing)
  if (slot.consumable && slot.consumable !== 'None') items.push(slot.consumable)

  return items
}

/**
 * Build the ability names for a warrior slot.
 * Includes class abilities + weapon special abilities.
 */
function buildAbilities(slot) {
  const names = []

  // Class abilities
  const warData = WARRIORS[slot.type]
  if (warData?.abilities) {
    names.push(...warData.abilities.map(a => a.name))
  }

  // Weapon special abilities (Shield → GUARDED, Crossbow → RELOAD, Bow → OVERDRAW)
  for (const weaponKey of [slot.weapon1, slot.weapon2]) {
    if (!weaponKey) continue
    const w = WEAPONS[weaponKey]
    if (w?.abilityName) names.push(w.abilityName)
  }

  return names
}

/**
 * Format a single warrior slot into Discord text lines.
 */
function formatWarrior(slot, index) {
  if (!slot.type) return null

  const warData = WARRIORS[slot.type]
  if (!warData) return null

  const lines = []

  // Header: captain star, name/class
  const displayName = slot.customName ? `${slot.customName} (${slot.type})` : slot.type
  const captainPrefix = slot.isCaptain ? '★ ' : ''
  lines.push(`**${captainPrefix}${displayName}**`)

  // Stats (with campaign improvements applied)
  const stats = applyStatImproves(warData.stats, slot.statImproves)
  lines.push(
    `MOV ${stats.MOV}  ATK ${stats.ATK}  VIT ${stats.VIT}  SKL ${stats.SKL}  COM ${stats.COM}  DEF ${stats.DEF}`
  )

  // Equipment
  const equipment = buildEquipment(slot)
  if (equipment.length) lines.push(equipment.join(' · '))

  // Ability names
  const abilities = buildAbilities(slot)
  if (abilities.length) lines.push(`*${abilities.join(' · ')}*`)

  return lines.join('\n')
}

/**
 * Generate the full Discord export string for a company.
 * @param {object} state - builderStore state snapshot
 */
export function generateDiscordExport(state) {
  const {
    companyName,
    mark,
    companyMode,
    ipLimit,
    slots = [],
    campaignGame,
  } = state

  const lines = []

  // Company header
  const name = companyName || 'Unnamed Company'
  const markStr = mark ? ` · ${mark}` : ''
  const modeStr = companyMode === 'campaign'
    ? ` · Campaign (Game ${campaignGame ?? 1})`
    : ` · Standard (${ipLimit} IP)`
  lines.push(`**⚔ ${name}**${markStr}${modeStr}`)
  lines.push(DIVIDER)

  // Warriors
  const warriorBlocks = slots
    .map((slot, i) => formatWarrior(slot, i))
    .filter(Boolean)

  lines.push(...warriorBlocks.join('\n\n').split('\n'))

  return lines.join('\n')
}
