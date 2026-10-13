// ── Weapon choices ────────────────────────────────────────────────────────────
// Which weapons a class may carry. Pure (no store) so the campaign engine and its
// unit tests can use it; builderStore re-exports both for the UI.

import { WARRIORS } from '../data/warriors.js'
import { WEAPON_NAMES } from '../data/weapons.js'

export const TWO_HANDED = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']

export function getAllowedWeapons(wdata) {
  if (!wdata) return WEAPON_NAMES.filter(w => w !== 'Shield')
  // fixedWeapon warriors have exactly one primary — no choice
  if (wdata.fixedWeapon) return [wdata.fixedWeapon]
  const cantHave = wdata.cantHave || []
  // Use allowedWeapons whitelist when present; fall back to all weapons minus Shield and cantHave
  return (wdata.allowedWeapons || WEAPON_NAMES).filter(w => w !== 'Shield' && !cantHave.includes(w))
}

export function getSecondWeaponOptions(wdata, primaryWeapon) {
  if (!wdata || !primaryWeapon) return []
  const cantHave = wdata.cantHave || []
  if (TWO_HANDED.includes(primaryWeapon)) return []
  // Polearm (one-handed) always pairs with Shield only
  if (primaryWeapon === 'Polearm (one-handed)') {
    return cantHave.includes('Shield') ? [] : ['Shield']
  }
  const canShield = (wdata.allowedWeapons || []).includes('Shield') && !cantHave.includes('Shield')
  const canDualLight = !cantHave.includes('Light Weapon')
  // Any other one-handed primary: Light Weapon (dual wield) or Shield offhand (if allowed)
  return [...(canDualLight ? ['Light Weapon'] : []), ...(canShield ? ['Shield'] : [])]
}

// A freshly picked warrior of this class: first allowed weapon plus any class off-hand
export function defaultLoadout(type) {
  const wdata = WARRIORS[type]
  if (!wdata) return { weapon1: null, weapon2: null }
  return {
    weapon1: wdata.fixedWeapon || getAllowedWeapons(wdata)[0],
    weapon2: wdata.fixedShield ? 'Shield' : wdata.fixedDualWield ? 'Light Weapon' : null,
  }
}
