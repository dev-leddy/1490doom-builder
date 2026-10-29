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

// Photos of the miniatures (public/companions), square crops
export const COMPANION_PORTRAITS = {
  Raptor: '/companions/raptor.webp',
  Monkey: '/companions/monkey.webp',
  Cat: '/companions/cat.webp',
}

// Key for the companion's once-per-game use in play mode (can't clash with a class ability)
export const companionKey = name => `companion:${name}`

// A player can name each animal of a menagerie (slot.companionNames, keyed by animal), so a
// renamed Raptor keeps its name when the Beastmaster swaps to the Cat and back
export const COMPANION_NAME_MAX = 24
export function companionDisplayName(slot, animal = typeof slot?.companion === 'string' ? slot.companion : slot?.companion?.name) {
  return (slot?.companionNames?.[animal] || '').trim() || animal
}

// "+1 MOV" style label for a companion's bonus
export function companionBonusLabel(name) {
  const bonus = COMPANIONS[name]?.bonus || {}
  return Object.entries(bonus).map(([stat, n]) => `+${n} ${stat}`).join(' ')
}

// The bonus written as a skill, the way the rules print it ("+1 MOVEMENT"), for the
// ability lists in build mode
const STAT_WORDS = { MOV: 'MOVEMENT', ATK: 'ATTACK', VIT: 'VITALITY', SKL: 'SKILL', DEF: 'DEFENSE', COM: 'COMBAT' }
export function companionBonusSkill(name, ownerType) {
  const entries = Object.entries(COMPANIONS[name]?.bonus || {})
  if (!entries.length) return null
  const label = entries.map(([stat, n]) => `+${n} ${STAT_WORDS[stat] || stat}`).join(', ')
  return { name: label, desc: `While the ${name} lives, the ${ownerType || 'owner'} has ${label}.` }
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
