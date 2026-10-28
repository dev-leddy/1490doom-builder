// ── Companions ────────────────────────────────────────────────────────────────
// Animals that come with a warrior class as a separate model (e.g. THE MENAGERIE).
// A companion is a free, required choice stored on the slot (`slot.companion`), not
// an IP upgrade. COMPANION_NAMES order is used in share links: append only.

import { WARRIORS } from './warriors.js'

export const COMPANIONS = {
  Raptor: {
    bonus: { MOV: 1 },
    // A static ability (always on), shown like a class's passive abilities
    passive: { name: 'FLIGHT', desc: 'Flies over all terrain, never falls.' },
    ability: { name: 'RAPTOR · SUNDER WEAPON', desc: "Once per game, spend an action to Sunder an enemy's weapon while in base contact." },
  },
  Monkey: {
    bonus: { SKL: 1 },
    passive: null,
    holdsItems: true,
    ability: { name: 'MONKEY · THIEF!', desc: 'Once per game, spend an action to either auto-inspect a Resource Cache or use HANDOFF on an enemy, both requiring base contact. The Monkey holds what it takes.' },
  },
  Cat: {
    bonus: { COM: 1 },
    passive: null,
    ability: { name: 'CAT · STUN', desc: 'Once per game, spend an action to Stun an enemy in base contact.' },
  },
}

export const COMPANION_NAMES = ['Raptor', 'Monkey', 'Cat']

// Placeholder silhouettes for companion icons (24x24 SVG paths), until official art exists
export const COMPANION_ICON_PATHS = {
  // bird of prey: head, hooked beak, swept wing
  Raptor: 'M3 13c3-1 5-4 6-8 1 2 1 4 0 6 2-2 4-3 7-3l-2 2 4 1-4 1c-1 3-4 5-8 5l-1 3-1-3c-1 0-2-1-1-2z M14 8.6a.8.8 0 1 0 0 .01z',
  // monkey: round head, ears, muzzle
  Monkey: 'M12 4a6 6 0 0 0-5.6 3.8 2.3 2.3 0 1 0 0 4.4A6 6 0 0 0 12 20a6 6 0 0 0 5.6-7.8 2.3 2.3 0 1 0 0-4.4A6 6 0 0 0 12 4zm-2.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM12 14c1.6 0 2.8.8 2.8 1.8S13.6 17.6 12 17.6 9.2 16.8 9.2 15.8 10.4 14 12 14z',
  // cat: head with pointed ears
  Cat: 'M5 3l3.5 4.2A7 7 0 0 1 12 6.5a7 7 0 0 1 3.5.7L19 3v8a7 7 0 1 1-14 0zm4.5 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 14.5l-1 1h2z',
}

// Key for the companion's once-per-game use in play mode (can't clash with a class ability)
export const companionKey = name => `companion:${name}`

// "+1 MOV" style label for a companion's bonus
export function companionBonusLabel(name) {
  const bonus = COMPANIONS[name]?.bonus || {}
  return Object.entries(bonus).map(([stat, n]) => `+${n} ${stat}`).join(' ')
}

// The animal a slot of this class starts with (null for classes without one)
export function defaultCompanion(type, { random = false } = {}) {
  const options = WARRIORS[type]?.companion?.options
  if (!options?.length) return null
  return random ? options[Math.floor(Math.random() * options.length)] : options[0]
}

// Make sure a slot's companion matches its class: classes with a companion always have a
// valid one; everyone else has none. Used when slots are created, loaded or decoded.
// Campaign: an animal that died while its owner survived sits out the next game
// (slot.restingCompanion), so it can't be the chosen one.
export function withCompanion(slot) {
  if (!slot) return slot
  const options = WARRIORS[slot.type]?.companion?.options
  const allowed = (options || []).filter(o => o !== slot.restingCompanion)
  const companion = options?.length ? (allowed.includes(slot.companion) ? slot.companion : allowed[0] || options[0]) : null
  return slot.companion === companion ? slot : { ...slot, companion }
}

// ── In play ──────────────────────────────────────────────────────────────────
// A separate model on its owner's card: own vitality and statuses, shares the owner's stats.
// "Removed" is derived, never stored: an animal standing while its owner is down is out of play.
export const ownerDown = w => !!(w.dead || w.currentVit <= 0)
export function companionState(w) {
  const c = w?.companion
  if (!c) return null
  if (c.currentVit <= 0) return 'slain'
  if (ownerDown(w)) return 'removed'
  return 'alive'
}
export const companionAlive = w => companionState(w) === 'alive'
