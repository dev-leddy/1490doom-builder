import { create } from 'zustand'
import { WARRIORS, canRestoreWithReliquary } from '../data/warriors'
import { STATUS_DEFS, CACHE_ITEMS } from '../data/items'
import { useBuilderStore } from './builderStore'
import { saveGame, deleteGame } from '../api/games'
import { getEffectiveStats } from '../utils/stats'
import { expendHerbs, expendReliquary, expendCacheItem, undoCacheItem, undoCacheItemNote } from './trackerItems'
import { afterUseOf, playUnit } from './trackerLoadout'
import { campaignProgress } from './campaign'
import { COMPANIONS, companionAlive, ownerDown } from '../data/companions'

// ── HELPERS ──────────────────────────────────────────────────────────────────

// Confirm and toast copy for OPG abilities that change the gear (see _confirmGearOPG)
const GEAR_OPG_COPY = {
  'THE SHATTERED SHIELD': {
    body: 'Blocks all damage from one standard ATTACK. This can block a Piercing Blow, but cannot block any other special abilities.',
    destroyedText: { 'Shield': 'Destroyed. GUARDED and +1 DEF are lost.' },
    note: 'Declare after a successful COMBAT check, before damage.',
    confirmLabel: 'SHATTER SHIELD',
    doneToast: com => `Shield shattered. COMBAT now ${com}.`,
    undoneToast: com => `Shield restored. COMBAT back to ${com}.`,
  },
}

export function getOPGAbilities(warriorType) {
  const wdata = WARRIORS[warriorType]
  if (!wdata) return []
  return wdata.abilities.filter(ab => ab.desc.toLowerCase().includes('once per game'))
}

// Pure helpers live with their data (unit-testable); re-exported for the tracker UI
export { canRestoreWithReliquary } from '../data/warriors'
export { ownerDown, companionState, companionAlive } from '../data/companions'

function buildCompanion(slot) {
  const def = WARRIORS[slot.type]?.companion
  if (!def || !COMPANIONS[slot.companion]) return null
  const nick = (slot.companionNames?.[slot.companion] || '').trim()
  return { name: slot.companion, ...(nick && { nick }), maxVit: def.vit, currentVit: def.vit, statuses: [], cacheItems: [] }
}

// Same tap rule as the owner's track: tap the last box to lose it, a lost box to heal up to it
function tapVit(current, max, vi) {
  const next = vi === current - 1 || vi < current ? vi : vi + 1
  return Math.max(0, Math.min(max, next))
}

// What a game remembers of each builder slot, to spot roster changes (the animal counts)
const rosterKey = s => (s.companion ? `${s.type}:${s.companion}` : s.type)

let _undoTimer = null
const UNDO_MS = 6000

function buildWarriorTrackerState(slot, index, builderState) {
  if (!slot.type) return null
  // Shared helper: counts standard and every campaign stat improvement (e.g. VIT +1 adds a box)
  const maxVit = getEffectiveStats(slot).VIT.value
  return {
    index,
    type: slot.type,
    customName: slot.customName || null,
    weapon1: slot.weapon1,
    weapon2: slot.weapon2,
    climbing: slot.climbing,
    consumable: slot.consumable || null,
    ip: slot.ip || [],
    statImprove: slot.statImprove || null,
    statImproves: slot.statImproves || [],
    maxVit,
    currentVit: maxVit,
    dead: false,
    activated: false,
    opgUsed: {},
    oprUsed: {},
    consumableUsed: false,
    reliquaryUsed: false,
    crossbowLoaded: true,
    cacheItems: [],
    statuses: [],
    isCaptain: slot.isCaptain,
    notes: slot.notes || [],
    companion: buildCompanion(slot),
  }
}

// ── STORE ─────────────────────────────────────────────────────────────────────

// In-progress games are saved to the cloud (/api/games/:companyId), debounced,
// retrying while offline. Only the latest state matters, so a newer save simply
// replaces one that's still waiting.
const PERSIST_DEBOUNCE_MS = 800
const RETRY_MS = 5000
let _persistTimer = null

function gameSnapshot(state) {
  return {
    active: state.active,
    round: state.round,
    companyName: state.companyName,
    companyAvatar: state.companyAvatar,
    mark: state.mark,
    warriors: state.warriors,
    activeWarriorIdx: state.activeWarriorIdx,
    sessionId: state.sessionId,
    savedBuilderSlots: state.savedBuilderSlots,
    companyId: state.companyId,
    doomedChoirUsed: state.doomedChoirUsed,
    gravebornUsed: state.gravebornUsed,
    campaign: state.campaign, // { gameNumber } for a campaign game, else null
  }
}

function persistState(get, delay = PERSIST_DEBOUNCE_MS) {
  clearTimeout(_persistTimer)
  _persistTimer = setTimeout(async () => {
    const state = get()
    if (!state.active || !state.companyId) return
    try {
      await saveGame(state.companyId, gameSnapshot(state))
    } catch (err) {
      console.warn('[cloud] game save failed, will retry:', err)
      persistState(get, RETRY_MS)
    }
  }, delay)
}

function discardCloudGame(companyId) {
  clearTimeout(_persistTimer)
  if (companyId) deleteGame(companyId).catch(err => console.warn('[cloud] game delete failed:', err))
}

export const useTrackerStore = create((set, get) => ({
  // ── STATE ──────────────────────────────────────────────────────────────────
  active: false,
  round: 1,
  companyName: '',
  companyAvatar: null,
  mark: '',
  warriors: [],
  activeWarriorIdx: 0,
  refOpen: false,
  companyId: null,
  sessionId: null,
  savedBuilderSlots: null,
  restored: false,
  campaign: null,          // { gameNumber } when playing a campaign game

  // Modal state
  confirmModal: null,      // { title, subtitle, onConfirm }
  cacheLootTarget: null,   // warrior index
  statusTarget: null,      // warrior index
  markPopupOpen: false,
  reliquaryModal: null,    // { wi, cacheItemId: number|null }
  markAbilityModal: null,  // { type: 'ashbound'|'doomed-choir'|'graveborn', warriorIdx?: number }
  companionStatusTarget: null, // warrior index whose companion gets a status
  companionLootTarget: null,   // warrior index whose companion (e.g. the Monkey) inspects a cache
  undoToast: null,         // { message, undo }: a short-lived toast with an Undo button

  // Company mark ability tracking (resets on new game)
  doomedChoirUsed: false,
  gravebornUsed: false,

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────
  openTracker(builderState) {
    const activeSlots = builderState.slots.filter(s => s.type)
    if (!activeSlots.length) return false

    const warriors = builderState.slots
      .map((slot, i) => buildWarriorTrackerState(slot, i, builderState))
      .filter(Boolean)

    const newMark = builderState.mark || ''
    set({
      active: true,
      round: 1,
      companyName: builderState.companyName || 'Unnamed Company',
      companyAvatar: builderState.companyAvatar || null,
      mark: newMark,
      warriors,
      activeWarriorIdx: 0,
      refOpen: false,
      companyId: builderState.companyId,
      sessionId: Date.now().toString(36),
      savedBuilderSlots: builderState.slots.map(rosterKey),
      restored: false,
      campaign: builderState.companyMode === 'campaign'
        ? { gameNumber: campaignProgress(builderState).nextGame }
        : null,
      doomedChoirUsed: false,
      gravebornUsed: false,
      // Ashbound: pop up a reminder as soon as the game starts
      markAbilityModal: newMark === 'Ashbound' ? { type: 'ashbound' } : null,
    })
    persistState(get, 0)
    return true
  },
  closeTracker() {
    discardCloudGame(get().companyId)
    set({ active: false, returnToBuilder: true, sessionId: null, savedBuilderSlots: null, restored: false })
  },
  checkMismatch(builderSlots) {
    const state = get()
    if (!state.sessionId) return null
    const currentSlots = builderSlots.map(rosterKey)
    const savedSlots = state.savedBuilderSlots
    if (!savedSlots) return null

    const mismatch = savedSlots.length !== currentSlots.length ||
      savedSlots.some((s, i) => s !== currentSlots[i])
    return mismatch
  },
  // stored: the game state from loadGame()
  restoreSession(stored) {
    if (!stored) return false

    set({
      active: stored.active,
      round: stored.round,
      companyName: stored.companyName,
      companyAvatar: stored.companyAvatar,
      mark: stored.mark,
      warriors: stored.warriors,
      activeWarriorIdx: stored.activeWarriorIdx,
      sessionId: stored.sessionId,
      savedBuilderSlots: stored.savedBuilderSlots,
      companyId: stored.companyId,
      doomedChoirUsed: stored.doomedChoirUsed || false,
      gravebornUsed: stored.gravebornUsed || false,
      campaign: stored.campaign || null, // games saved before this field have none
      markAbilityModal: null, // never restore transient modal state
      restored: true,
    })
    return true
  },
  discardSession() {
    discardCloudGame(get().companyId)
    set({ active: false, sessionId: null, savedBuilderSlots: null, restored: false })
  },
  resetTracker() {
    const { mark } = get()
    set(state => ({
      round: 1,
      doomedChoirUsed: false,
      gravebornUsed: false,
      markAbilityModal: mark === 'Ashbound' ? { type: 'ashbound' } : null,
      warriors: state.warriors.map(w => ({
        ...w,
        currentVit: w.maxVit,
        dead: false,
        opgUsed: {},
        oprUsed: {},
        consumableUsed: false,
        reliquaryUsed: false,
        crossbowLoaded: true,
        cacheItems: [],
        statuses: [],
        companion: w.companion ? { ...w.companion, currentVit: w.companion.maxVit, statuses: [], cacheItems: [] } : null,
      })),
    }))
    persistState(get)
  },

  // ── ROUND ──────────────────────────────────────────────────────────────────
  changeRound(delta) {
    set(state => ({
      round: Math.max(1, state.round + delta),
      warriors: state.warriors.map(w => ({ ...w, oprUsed: {}, activated: false })),
    }))
    persistState(get)
    // Doomed Choir: prompt at the start of every round after round 1 (only when advancing)
    const { round, mark, doomedChoirUsed } = get()
    if (delta > 0 && round > 1 && mark === 'Doomed Choir' && !doomedChoirUsed) {
      set({ markAbilityModal: { type: 'doomed-choir' } })
    }
  },

  // ── ACTIVATED ───────────────────────────────────────────────────────────────
  toggleActivated(wi) {
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.dead) return state
      w.activated = !w.activated
      warriors[wi] = w
      return { warriors }
    })
    persistState(get)
  },

  // ── NAVIGATION ─────────────────────────────────────────────────────────────
  selectWarrior(wi) {
    set({ activeWarriorIdx: wi, refOpen: false })
  },
  openRef() {
    set({ refOpen: true })
  },
  closeRef() {
    set({ refOpen: false })
  },

  // ── VITALITY ───────────────────────────────────────────────────────────────
  hit(wi, vi) {
    const before = get().warriors[wi]
    const prevVit = before?.currentVit ?? 1
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.dead) return state
      w.currentVit = tapVit(w.currentVit, w.maxVit, vi)
      warriors[wi] = w
      return { warriors }
    })
    persistState(get)
    if (get().warriors[wi]?.currentVit === 0 && prevVit > 0) get()._companionPerishes(wi, before)
    // Graveborn: prompt when a warrior drops to 0 VIT (only on the downward transition)
    const { warriors, mark, gravebornUsed } = get()
    const w = warriors[wi]
    if (w && w.currentVit === 0 && prevVit > 0 && mark === 'Graveborn' && !gravebornUsed) {
      set({ markAbilityModal: { type: 'graveborn', warriorIdx: wi } })
    }
  },

  // ── COMPANION ──────────────────────────────────────────────────────────────
  // The owner perished: the animal is removed as perished (its VIT goes to 0). Reviving the
  // owner doesn't bring it back; each model is revived on its own.
  _companionPerishes(wi, before) {
    const c = before?.companion
    if (!c || c.currentVit <= 0) return
    get()._setCompanion(wi, { currentVit: 0, cacheItems: [] })
    const name = before.customName || before.type
    get().showUndoToast(`${c.name} removed with ${name}`, () => {
      // put both models back exactly as they were (including anything the animal held)
      set(state => {
        const warriors = [...state.warriors]
        warriors[wi] = { ...warriors[wi], currentVit: before.currentVit, dead: before.dead, companion: { ...warriors[wi].companion, currentVit: c.currentVit, cacheItems: c.cacheItems || [] } }
        return { warriors }
      })
      persistState(get)
    })
  },
  _setCompanion(wi, patch) {
    set(state => {
      const warriors = [...state.warriors]
      const w = warriors[wi]
      if (!w?.companion) return state
      warriors[wi] = { ...w, companion: { ...w.companion, ...patch } }
      return { warriors }
    })
    persistState(get)
  },
  hitCompanion(wi, vi) {
    const c = get().warriors[wi]?.companion
    if (!c) return
    const currentVit = tapVit(c.currentVit, c.maxVit, vi)
    const dropped = currentVit === 0 && c.currentVit > 0 ? c.cacheItems || [] : []
    get()._setCompanion(wi, dropped.length ? { currentVit, cacheItems: [] } : { currentVit })
    if (dropped.length) {
      get().showUndoToast(`${c.name} dropped ${dropped.map(i => i.name).join(', ')}`, () => {
        get()._setCompanion(wi, { currentVit: c.currentVit, cacheItems: dropped })
      })
    }
  },
  // Companions that hold items (the Monkey): inspect a cache, hand items to a warrior, drop them
  openCompanionLoot(wi) {
    set({ companionLootTarget: wi })
  },
  closeCompanionLoot() {
    set({ companionLootTarget: null })
  },
  addCompanionCacheItem(wi, roll) {
    const item = CACHE_ITEMS.find(c => c.roll === roll)
    const c = get().warriors[wi]?.companion
    set({ companionLootTarget: null })
    if (!item || !c) return
    get()._setCompanion(wi, { cacheItems: [...(c.cacheItems || []), { id: Date.now(), name: item.name, desc: item.desc, used: false }] })
  },
  // Animals can't HANDOFF: a friendly warrior takes the item from it
  takeCompanionItem(wi, itemId, toWi) {
    const c = get().warriors[wi]?.companion
    const item = c?.cacheItems?.find(i => i.id === itemId)
    const to = get().warriors[toWi]
    if (!item || !to || to.dead || to.currentVit <= 0) return
    set(state => {
      const warriors = [...state.warriors]
      warriors[wi] = { ...warriors[wi], companion: { ...c, cacheItems: c.cacheItems.filter(i => i.id !== itemId) } }
      warriors[toWi] = { ...warriors[toWi], cacheItems: [...warriors[toWi].cacheItems, item] }
      return { warriors }
    })
    persistState(get)
    useBuilderStore.getState()._toast(`${to.customName || to.type} takes ${item.name} from the ${c.name}`)
  },
  dropCompanionItem(wi, itemId) {
    const c = get().warriors[wi]?.companion
    if (!c?.cacheItems?.some(i => i.id === itemId)) return
    get()._setCompanion(wi, { cacheItems: c.cacheItems.filter(i => i.id !== itemId) })
  },
  openCompanionStatus(wi) {
    set({ companionStatusTarget: wi })
  },
  closeCompanionStatus() {
    set({ companionStatusTarget: null })
  },
  addCompanionStatus(wi, statusName) {
    const def = STATUS_DEFS.find(s => s[0] === statusName)
    const c = get().warriors[wi]?.companion
    set({ companionStatusTarget: null })
    if (!def || !c || c.statuses.some(s => s.name === statusName)) return
    get()._setCompanion(wi, { statuses: [...c.statuses, { id: Date.now(), name: statusName, desc: def[1] }] })
  },
  removeCompanionStatus(wi, statusId) {
    const c = get().warriors[wi]?.companion
    const status = c?.statuses.find(s => s.id === statusId)
    if (!status) return
    // No confirm: clearing is quick to redo; the toast makes it obvious it happened
    get()._setCompanion(wi, { statuses: c.statuses.filter(s => s.id !== statusId) })
    useBuilderStore.getState()._toast(`${status.name} cleared from ${c.name}`)
  },

  // ── UNDO TOAST ─────────────────────────────────────────────────────────────
  showUndoToast(message, undo) {
    clearTimeout(_undoTimer)
    _undoTimer = setTimeout(() => set({ undoToast: null }), UNDO_MS)
    set({ undoToast: { message, undo } })
  },
  doUndo() {
    const t = get().undoToast
    clearTimeout(_undoTimer)
    set({ undoToast: null })
    t?.undo?.()
  },
  dismissUndo() {
    clearTimeout(_undoTimer)
    set({ undoToast: null })
  },

  // ── OPG ABILITIES ──────────────────────────────────────────────────────────
  toggleOPG(wi, abilityName) {
    const w = get().warriors[wi]
    const isCompanionAbility = abilityName.startsWith('companion:')
    if (isCompanionAbility ? !companionAlive(w) : w.dead) return
    const label = abilityName === '__captain__' ? 'Captain Re-Roll'
      : isCompanionAbility ? COMPANIONS[w.companion.name].ability.name : abilityName
    const isUsed = !!w.opgUsed[abilityName]
    if (afterUseOf(w.type, abilityName)) return get()._confirmGearOPG(wi, abilityName)
    get().openConfirm(
      isUsed ? `Restore ${label}?` : `Use ${label}?`,
      isUsed ? 'Mark this ability as available again.' : 'This once per game ability will be marked as used.',
      () => {
        set(state => {
          const warriors = [...state.warriors]
          const w = { ...warriors[wi], opgUsed: { ...warriors[wi].opgUsed } }
          w.opgUsed[abilityName] = !isUsed
          warriors[wi] = w
          return { warriors }
        })
        persistState(get)
      }
    )
  },

  // An OPG ability that changes the gear (The Shattered Shield): the confirm spells out what
  // is lost and how COMBAT changes; undo (for a mis-tap) says what comes back
  _confirmGearOPG(wi, abilityName) {
    const w = get().warriors[wi]
    const rule = afterUseOf(w.type, abilityName)
    const copy = GEAR_OPG_COPY[abilityName] || {}
    const isUsed = !!w.opgUsed[abilityName]
    const com = used => getEffectiveStats(playUnit({ ...w, opgUsed: { ...w.opgUsed, [abilityName]: used } }), { statuses: w.statuses }).COM.display
    const comNow = com(isUsed)
    const comNext = com(!isUsed)
    const apply = () => {
      set(state => {
        const warriors = [...state.warriors]
        // oprUsed is left alone, so an undo brings back this round's shield state too
        warriors[wi] = { ...warriors[wi], opgUsed: { ...warriors[wi].opgUsed, [abilityName]: !isUsed } }
        return { warriors }
      })
      persistState(get)
      const toast = isUsed ? copy.undoneToast : copy.doneToast
      if (toast) useBuilderStore.getState()._toast(toast(comNext))
    }

    if (isUsed) {
      get().openConfirm(
        `Undo ${abilityName}?`,
        '',  // just the question: the title asks whether to undo
        apply,
        { confirmLabel: 'UNDO' }
      )
      return
    }

    // One row per gear change, then COMBAT if it moves
    const rules = Object.entries(rule.gear)
      .filter(([from]) => w.weapon1 === from || w.weapon2 === from)
      .map(([from, to]) => ({
        label: from.split(' (')[0],
        text: to ? (/two-handed/i.test(to) ? 'Two-handed for the rest of the game.' : `Becomes ${to}.`)
                 : (copy.destroyedText?.[from] || 'Destroyed.'),
        limit: !to,
      }))
    if (comNow !== comNext) rules.push({ label: 'Combat', text: `${comNow} becomes ${comNext}.` })
    get().openConfirm(
      `Use ${abilityName}?`,
      copy.body || rule.summary,
      apply,
      { rules, note: copy.note, confirmLabel: copy.confirmLabel }
    )
  },

  // ── TPG (TWICE PER GAME) ABILITIES ─────────────────────────────────────────
  tapTPG(wi, abilityName) {
    const w = get().warriors[wi]
    if (w.dead) return
    const count = w.opgUsed[abilityName] || 0
    const next = count >= 2 ? 0 : count + 1
    const msg = next === 0
      ? `Restore ${abilityName}?`
      : next === 1
        ? `Use ${abilityName} (1st of 2)?`
        : `Use ${abilityName} (2nd of 2)?`
    const sub = next === 0
      ? 'Mark both uses as available again.'
      : next === 2
        ? 'Both uses will now be spent.'
        : 'One use will be spent. One remains.'
    get().openConfirm(msg, sub, () => {
      set(state => {
        const warriors = [...state.warriors]
        const w = { ...warriors[wi], opgUsed: { ...warriors[wi].opgUsed } }
        w.opgUsed[abilityName] = next
        warriors[wi] = w
        return { warriors }
      })
      persistState(get)
    })
  },

  // ── OPR (ONCE PER ROUND) ABILITIES ─────────────────────────────────────────
  toggleOPR(wi, abilityName) {
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi], oprUsed: { ...warriors[wi].oprUsed } }
      if (w.dead) return state
      w.oprUsed[abilityName] = !w.oprUsed[abilityName]
      warriors[wi] = w
      return { warriors }
    })
    persistState(get)
  },

  // ── CROSSBOW ───────────────────────────────────────────────────────────────
  toggleCrossbowLoaded(wi) {
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.dead) return state
      w.crossbowLoaded = !w.crossbowLoaded
      warriors[wi] = w
      return { warriors }
    })
    persistState(get)
  },

  // ── CONSUMABLE ─────────────────────────────────────────────────────────────
  // Expend straight from its sheet; undoing (tap the expended card) asks first
  toggleConsumable(wi) {
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.dead) return state
      w.consumableUsed = !w.consumableUsed
      warriors[wi] = w
      return { warriors }
    })
    persistState(get)
  },
  undoConsumable(wi) {
    const w = get().warriors[wi]
    if (!w || w.dead || !w.consumableUsed) return
    get().openConfirm(
      `Undo ${w.consumable}?`,
      `${w.consumable} comes back, unused.`,
      () => get().toggleConsumable(wi)
    )
  },

  // ── RELIQUARY ──────────────────────────────────────────────────────────────
  openReliquaryModal(wi, cacheItemId = null) {
    set({ reliquaryModal: { wi, cacheItemId } })
  },
  closeReliquaryModal() {
    set({ reliquaryModal: null })
  },
  confirmReliquary(wi, abilityName) {
    const { reliquaryModal } = get()
    if (!reliquaryModal) return
    // Some abilities can't be restored (The Shattered Shield: the Shield is gone)
    if (abilityName && !canRestoreWithReliquary(abilityName)) return
    const { cacheItemId } = reliquaryModal
    set(state => {
      const warriors = [...state.warriors]
      if (cacheItemId !== null) {
        // Kept on the warrior as used, remembering the ability, so it can be undone
        warriors[wi] = expendReliquary(warriors[wi], cacheItemId, abilityName)
      } else {
        warriors[wi] = { ...warriors[wi], opgUsed: { ...warriors[wi].opgUsed, [abilityName]: false }, reliquaryUsed: true }
      }
      return { warriors, reliquaryModal: null }
    })
    persistState(get)
    if (abilityName) {
      const label = abilityName === '__captain__' ? 'Captain Re-Roll' : abilityName
      useBuilderStore.getState()._toast(`⟳ ${label} restored`)
    }
  },

  // ── CACHE ITEMS ────────────────────────────────────────────────────────────
  openCacheLoot(wi) {
    set({ cacheLootTarget: wi })
  },
  closeCacheLoot() {
    set({ cacheLootTarget: null })
  },
  addCacheItem(wi, roll) {
    const item = CACHE_ITEMS.find(c => c.roll === roll)
    if (!item) return
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      w.cacheItems = [...w.cacheItems, { id: Date.now(), name: item.name, desc: item.desc, used: false }]
      warriors[wi] = w
      return { warriors, cacheLootTarget: null }
    })
    persistState(get)
  },
  spendCacheItem(wi, itemId) {
    const w = get().warriors[wi]
    const item = w.cacheItems.find(c => c.id === itemId)
    if (!item || item.used || w.dead) return

    // ── Herbs & Tonic: restore up to +3 VIT ──
    if (item.name === 'Herbs & Tonic') {
      get().openConfirm(
        'Expend Herbs & Tonic?',
        `Restore up to 3 Vitality (current: ${w.currentVit} / ${w.maxVit}).
        This will automatically update this warrior's current Vitality.`,
        () => {
          set(state => {
            const warriors = [...state.warriors]
            warriors[wi] = expendHerbs(warriors[wi], itemId)
            return { warriors }
          })
          persistState(get)
          const healed = get().warriors[wi].cacheItems.find(c => c.id === itemId)?.effect?.healed ?? 0
          useBuilderStore.getState()._toast(`🌿 Herbs & Tonic — Vitality +${healed}`)
        }
      )
      return
    }

    // ── Reliquary: open OPG ability selection modal ──
    if (item.name === 'Reliquary') {
      get().openReliquaryModal(wi, itemId)
      return
    }

    // ── Default: confirm, then mark used (it stays on the card and can be undone) ──
    get().openConfirm(
      `Expend ${item.name}?`,
      'Tap it again later to undo.',
      () => {
        set(state => {
          const warriors = [...state.warriors]
          warriors[wi] = expendCacheItem(warriors[wi], itemId)
          return { warriors }
        })
        persistState(get)
      }
    )
  },
  // An accidental use: put the item back and reverse what it did (asks first)
  undoCacheItem(wi, itemId) {
    const w = get().warriors[wi]
    const item = w?.cacheItems.find(c => c.id === itemId)
    if (!item?.used || w.dead) return
    get().openConfirm(`Undo ${item.name}?`, undoCacheItemNote(item), () => {
      const result = undoCacheItem(get().warriors[wi], itemId)
      if (result.error) {
        useBuilderStore.getState()._toast(result.error)
        return
      }
      set(state => {
        const warriors = [...state.warriors]
        warriors[wi] = result.warrior
        return { warriors }
      })
      persistState(get)
      useBuilderStore.getState()._toast(`${item.name} restored`)
    })
  },

  // ── STATUSES ───────────────────────────────────────────────────────────────
  openStatusModal(wi) {
    set({ statusTarget: wi })
  },
  closeStatusModal() {
    set({ statusTarget: null })
  },
  addStatus(wi, statusName) {
    const def = STATUS_DEFS.find(s => s[0] === statusName)
    if (!def) return
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.statuses.find(s => s.name === statusName)) return { statusTarget: null }
      w.statuses = [...w.statuses, { id: Date.now(), name: statusName, desc: def[1] }]
      warriors[wi] = w
      return { warriors, statusTarget: null }
    })
    persistState(get)
  },
  removeStatus(wi, statusId) {
    const w = get().warriors[wi]
    const status = w.statuses.find(s => s.id === statusId)
    if (!status) return
    // No confirm: clearing is quick to redo; the toast makes it obvious it happened
    set(state => {
      const warriors = [...state.warriors]
      warriors[wi] = { ...warriors[wi], statuses: warriors[wi].statuses.filter(s => s.id !== statusId) }
      return { warriors }
    })
    persistState(get)
    useBuilderStore.getState()._toast(`${status.name} cleared from ${w.customName || w.type}`)
  },

  // ── DEAD TOGGLE ────────────────────────────────────────────────────────────
  toggleDead(wi) {
    const before = get().warriors[wi]
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      w.dead = !w.dead
      w.currentVit = w.dead ? 0 : w.maxVit
      warriors[wi] = w
      return { warriors }
    })
    persistState(get)
    if (get().warriors[wi].dead && !ownerDown(before)) get()._companionPerishes(wi, before)
  },

  // ── CONFIRM MODAL ──────────────────────────────────────────────────────────
  // opts: { rules: [{ label, text, limit }], note, confirmLabel } (see shared/ConfirmModal)
  openConfirm(title, subtitle, onConfirm, opts = {}) {
    set({ confirmModal: { ...opts, title, subtitle, onConfirm } })
  },
  closeConfirm() {
    set({ confirmModal: null })
  },
  doConfirm() {
    const { confirmModal } = get()
    if (confirmModal?.onConfirm) confirmModal.onConfirm()
    set({ confirmModal: null })
  },

  // ── MARK POPUP ─────────────────────────────────────────────────────────────
  openMarkPopup() {
    set({ markPopupOpen: true })
  },
  closeMarkPopup() {
    set({ markPopupOpen: false })
  },

  // ── MARK ABILITY MODAL ─────────────────────────────────────────────────────
  closeMarkAbilityModal() {
    set({ markAbilityModal: null })
  },
  setDoomedChoirUsed(val) {
    set({ doomedChoirUsed: val })
    persistState(get)
  },
  setGravebornUsed(val) {
    set({ gravebornUsed: val })
    persistState(get)
  },

  // ── RESTORE PROMPT ─────────────────────────────────────────────────────────
  showRestorePrompt: false,
  pendingRestore: null,    // { savedAt, data } from loadGame(), shown in the prompt
  promptRestore: (saved) => set({ pendingRestore: saved, showRestorePrompt: true }),
  setShowRestorePrompt: (val) => set(val ? { showRestorePrompt: true } : { showRestorePrompt: false, pendingRestore: null }),
}))

// Page closing: send the latest game state without waiting for the debounce
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    const state = useTrackerStore.getState()
    if (!state.active || !state.companyId) return
    clearTimeout(_persistTimer)
    saveGame(state.companyId, gameSnapshot(state), { keepalive: true }).catch(() => {})
  })
}
