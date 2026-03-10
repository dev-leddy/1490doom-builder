import { create } from 'zustand'
import { WARRIORS, NO_RESTORE_OPG } from '../data/warriors'
import { STATUS_DEFS, CACHE_ITEMS } from '../data/items'
import { useBuilderStore } from './builderStore'

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function getOPGAbilities(warriorType) {
  const wdata = WARRIORS[warriorType]
  if (!wdata) return []
  return wdata.abilities.filter(ab => ab.desc.toLowerCase().includes('once per game'))
}

export function canRestoreWithReliquary(abilityName) {
  return !NO_RESTORE_OPG.has(abilityName)
}

function buildWarriorTrackerState(slot, index, builderState) {
  if (!slot.type) return null
  const wdata = WARRIORS[slot.type]
  const baseVit = parseInt(wdata.stats.VIT)
  const bonusVit = slot.ip.includes('stat') && slot.statImprove === 'VIT' ? 1 : 0
  const maxVit = baseVit + bonusVit
  return {
    index,
    type: slot.type,
    weapon1: slot.weapon1,
    weapon2: slot.weapon2,
    climbing: slot.climbing,
    consumable: slot.consumable || null,
    ip: slot.ip || [],
    statImprove: slot.statImprove || null,
    maxVit,
    currentVit: maxVit,
    dead: false,
    opgUsed: {},
    consumableUsed: false,
    reliquaryUsed: false,
    cacheItems: [],
    statuses: [],
    isCaptain: slot.isCaptain,
    notes: slot.notes || [],
  }
}

// ── STORE ─────────────────────────────────────────────────────────────────────

export const useTrackerStore = create((set, get) => ({
  // ── STATE ──────────────────────────────────────────────────────────────────
  active: false,
  round: 1,
  companyName: '',
  mark: '',
  warriors: [],
  activeWarriorIdx: 0,
  refOpen: false,

  // Modal state
  confirmModal: null,      // { title, subtitle, onConfirm }
  cacheLootTarget: null,   // warrior index
  statusTarget: null,      // warrior index
  markPopupOpen: false,
  reliquaryModal: null,    // { wi, cacheItemId: number|null }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────
  openTracker(builderState) {
    const activeSlots = builderState.slots.filter(s => s.type)
    if (!activeSlots.length) return false

    const warriors = builderState.slots
      .map((slot, i) => buildWarriorTrackerState(slot, i, builderState))
      .filter(Boolean)

    set({
      active: true,
      round: 1,
      companyName: builderState.companyName || 'Unnamed Company',
      mark: builderState.mark || '',
      warriors,
      activeWarriorIdx: 0,
      refOpen: false,
    })
    return true
  },
  closeTracker() {
    set({ active: false })
  },
  resetTracker() {
    set(state => ({
      round: 1,
      warriors: state.warriors.map(w => ({
        ...w,
        currentVit: w.maxVit,
        dead: false,
        opgUsed: {},
        consumableUsed: false,
        reliquaryUsed: false,
        cacheItems: [],
        statuses: [],
      })),
    }))
  },

  // ── ROUND ──────────────────────────────────────────────────────────────────
  changeRound(delta) {
    set(state => ({ round: Math.max(1, state.round + delta) }))
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
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.dead) return state
      if (vi === w.currentVit - 1) {
        w.currentVit = vi
      } else if (vi < w.currentVit) {
        w.currentVit = vi
      } else {
        w.currentVit = vi + 1
      }
      w.currentVit = Math.max(0, Math.min(w.maxVit, w.currentVit))
      warriors[wi] = w
      return { warriors }
    })
  },

  // ── OPG ABILITIES ──────────────────────────────────────────────────────────
  toggleOPG(wi, abilityName) {
    const w = get().warriors[wi]
    if (w.dead) return
    const label = abilityName === '__captain__' ? 'Captain Re-Roll' : abilityName
    const isUsed = !!w.opgUsed[abilityName]
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
      }
    )
  },

  // ── CONSUMABLE ─────────────────────────────────────────────────────────────
  toggleConsumable(wi) {
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      if (w.dead) return state
      w.consumableUsed = !w.consumableUsed
      warriors[wi] = w
      return { warriors }
    })
  },

  // ── RELIQUARY ──────────────────────────────────────────────────────────────
  useReliquary(wi) {
    // Opens selection modal; consumable source (cacheItemId = null)
    get().openReliquaryModal(wi, null)
  },
  openReliquaryModal(wi, cacheItemId = null) {
    set({ reliquaryModal: { wi, cacheItemId } })
  },
  closeReliquaryModal() {
    set({ reliquaryModal: null })
  },
  confirmReliquary(wi, abilityName) {
    const { reliquaryModal } = get()
    if (!reliquaryModal) return
    const { cacheItemId } = reliquaryModal
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi], opgUsed: { ...warriors[wi].opgUsed } }
      if (abilityName) w.opgUsed[abilityName] = false
      if (cacheItemId !== null) {
        // Cache item — remove it permanently
        w.cacheItems = w.cacheItems.filter(c => c.id !== cacheItemId)
      } else {
        // Consumable — mark as used
        w.reliquaryUsed = true
      }
      warriors[wi] = w
      return { warriors, reliquaryModal: null }
    })
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
  },
  useCacheItem(wi, itemId) {
    const w = get().warriors[wi]
    const item = w.cacheItems.find(c => c.id === itemId)
    if (!item) return

    // ── Herbs & Tonic: restore up to +3 VIT ──
    if (item.name === 'Herbs & Tonic') {
      get().openConfirm(
        'Expend Herbs & Tonic?',
        `Restore up to 3 Vitality (current: ${w.currentVit} / ${w.maxVit}).
        This will automatically update this warrior's current Vitality.`,
        () => {
          set(state => {
            const warriors = [...state.warriors]
            const w = { ...warriors[wi] }
            w.cacheItems = w.cacheItems.filter(c => c.id !== itemId)
            w.currentVit = Math.min(w.maxVit, w.currentVit + 3)
            warriors[wi] = w
            return { warriors }
          })
          useBuilderStore.getState()._toast('🌿 Herbs & Tonic — Vitality +3')
        }
      )
      return
    }

    // ── Reliquary: open OPG ability selection modal ──
    if (item.name === 'Reliquary') {
      get().openReliquaryModal(wi, itemId)
      return
    }

    // ── Default: simple confirm + remove ──
    get().openConfirm(
      `Expend ${item.name}?`,
      'This item will be removed permanently.',
      () => {
        set(state => {
          const warriors = [...state.warriors]
          const w = { ...warriors[wi] }
          w.cacheItems = w.cacheItems.filter(c => c.id !== itemId)
          warriors[wi] = w
          return { warriors }
        })
      }
    )
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
  },
  removeStatus(wi, statusId) {
    const w = get().warriors[wi]
    const status = w.statuses.find(s => s.id === statusId)
    if (!status) return
    get().openConfirm(
      `Remove ${status.name}?`,
      'Mark this status as cleared.',
      () => {
        set(state => {
          const warriors = [...state.warriors]
          const w = { ...warriors[wi] }
          w.statuses = w.statuses.filter(s => s.id !== statusId)
          warriors[wi] = w
          return { warriors }
        })
      }
    )
  },

  // ── DEAD TOGGLE ────────────────────────────────────────────────────────────
  toggleDead(wi) {
    set(state => {
      const warriors = [...state.warriors]
      const w = { ...warriors[wi] }
      w.dead = !w.dead
      w.currentVit = w.dead ? 0 : w.maxVit
      warriors[wi] = w
      return { warriors }
    })
  },

  // ── CONFIRM MODAL ──────────────────────────────────────────────────────────
  openConfirm(title, subtitle, onConfirm) {
    set({ confirmModal: { title, subtitle, onConfirm } })
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
}))
