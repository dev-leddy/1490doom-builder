// Play mode: the gear a warrior actually carries right now.
// Some once-per-game abilities change the loadout for the rest of the game (The Shattered
// Shield destroys the Hedge Knight's Shield and makes the Polearm two-handed). Nothing extra
// is stored: it's all derived from opgUsed, so undoing the ability puts the gear back.

import { WARRIORS } from '../data/warriors'

// The ability's afterUse rule ({ gear, summary }), or null
export function afterUseOf(type, abilityName) {
  const ab = WARRIORS[type]?.abilities?.find(a => a.name === abilityName)
  return ab?.afterUse || null
}

// { weapon1, weapon2, destroyed: [item names] } after every used ability's gear swaps
export function getPlayLoadout(w) {
  let weapon1 = w.weapon1 || null
  let weapon2 = w.weapon2 || null
  const destroyed = []
  for (const ab of WARRIORS[w.type]?.abilities || []) {
    if (!ab.afterUse?.gear || !w.opgUsed?.[ab.name]) continue
    for (const [from, to] of Object.entries(ab.afterUse.gear)) {
      // Only swap gear the warrior actually has
      if (weapon1 === from) {
        weapon1 = to
        if (!to) destroyed.push(from)
      } else if (weapon2 === from) {
        weapon2 = to
        if (!to) destroyed.push(from)
      }
    }
  }
  return { weapon1, weapon2, destroyed }
}

// The warrior as play mode should show it: same object, current gear
export function playUnit(w) {
  const { weapon1, weapon2, destroyed } = getPlayLoadout(w)
  return { ...w, weapon1, weapon2, destroyedGear: destroyed }
}
