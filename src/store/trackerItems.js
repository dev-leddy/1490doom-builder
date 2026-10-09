// Play mode items: expending and undoing. Pure (warrior in, warrior out) so it's unit-testable.
// An expended cache item stays on the warrior marked `used`, with what the use changed in
// `effect`, so an accidental use can be undone exactly.

const abilityLabel = name => (name === '__captain__' ? 'Captain Re-Roll' : name)

// Herbs & Tonic: up to +3 Vitality; remembers the real gain (a capped heal gains less)
export function expendHerbs(w, itemId) {
  const healed = Math.min(w.maxVit, w.currentVit + 3) - w.currentVit
  return {
    ...w,
    currentVit: w.currentVit + healed,
    cacheItems: w.cacheItems.map(c => (c.id === itemId ? { ...c, used: true, effect: { healed } } : c)),
  }
}

// Reliquary: makes a used Once Per Game ability available again; remembers its previous value
export function expendReliquary(w, itemId, abilityName) {
  const restoredFrom = w.opgUsed[abilityName]
  return {
    ...w,
    opgUsed: { ...w.opgUsed, [abilityName]: false },
    cacheItems: w.cacheItems.map(c => (c.id === itemId ? { ...c, used: true, effect: { restored: abilityName, restoredFrom } } : c)),
  }
}

// Any other cache item: just marked used
export function expendCacheItem(w, itemId) {
  return { ...w, cacheItems: w.cacheItems.map(c => (c.id === itemId ? { ...c, used: true } : c)) }
}

// Puts an expended cache item back and reverses what it did.
// Returns { warrior } or { error } when it can't be undone cleanly.
export function undoCacheItem(w, itemId) {
  const item = w.cacheItems.find(c => c.id === itemId)
  if (!item?.used) return { error: 'Nothing to undo' }
  const effect = item.effect || {}
  let next = { ...w, cacheItems: w.cacheItems.map(c => (c.id === itemId ? { ...c, used: false, effect: undefined } : c)) }

  if (effect.healed) {
    // Take back only what it healed, so hits taken since still count
    if (!w.dead) next.currentVit = Math.max(0, w.currentVit - effect.healed)
  }

  if (effect.restored) {
    if (w.opgUsed[effect.restored]) {
      return { error: `${abilityLabel(effect.restored)} was used again since. Restore it from its ability first.` }
    }
    next = { ...next, opgUsed: { ...next.opgUsed, [effect.restored]: effect.restoredFrom ?? true } }
  }
  return { warrior: next }
}

// What undoing will do, for the confirm
export function undoCacheItemNote(item) {
  const effect = item?.effect || {}
  if (effect.healed) return `${item.name} comes back and this warrior loses the ${effect.healed} Vitality it restored.`
  if (effect.restored) return `${item.name} comes back and ${abilityLabel(effect.restored)} is marked used again.`
  return `${item?.name} comes back, unused.`
}
