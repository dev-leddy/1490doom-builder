import { create } from 'zustand'

// iOS Safari <15.4 doesn't have crypto.randomUUID
const randomUUID = () =>
  crypto.randomUUID?.() ??
  ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
import { WARRIORS, MARKS, STAT_IMPROVEMENT, IP_OPTIONS } from '../data/warriors'
import { CLIMBING_ITEMS, CONSUMABLE_NAMES } from '../data/weapons'
import { getAllowedWeapons, getSecondWeaponOptions } from '../utils/loadout'
import {
  normalizeCampaign, campaignProgress, spendableCapacity, validateEndOfGame, applyEndOfGame,
  canUndoLastGame, undoLastGame, hireIntoVacancy, permanenceBlock, isPermanentUpgrade,
  minEarnedIP, removeSlotBlock, logUpgrade, PERMANENT_GEAR, syncUpgradeItem, unlogLastUpgrade,
  undoLastUpgrade as undoLastUpgradeOf, undoRecruit as undoRecruitOf, undoRecruitBlock,
  nameWithClass, upgradeLabel, setGameScenario as setGameScenarioOf,
  endCampaign as endCampaignOf, reopenCampaign as reopenCampaignOf,
  reRecordLatestGame, editOutcome, resurrectWarrior as resurrectWarriorOf,
} from './campaign'
import { encodeCompany, decodeCompany } from './builderEncoding'
import { fetchCloudSaves, removeCloudCompany, createSaver, migrateLocalData, snapshotCompany } from './builderPersistence'
import { useAuthStore } from './authStore'
import { makeEvent, makeBaselineEvent, newEventId, MAX_NOTE_LENGTH } from './campaignEvents'

// Weapon rules live in utils/loadout (pure); re-exported for the UI
export { getAllowedWeapons, getSecondWeaponOptions }

function getUser() { return useAuthStore.getState().user }

const nameOfSlot = s => (s?.customName && s.customName.trim()) || s?.type || null

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function getAvailableWarriorTypes(slotIndex, slots) {
  const usedTypes = slots
    .filter((_, i) => i !== slotIndex && slots[i]?.type)
    .map(s => s.type)
  return Object.keys(WARRIORS).filter(t => !usedTypes.includes(t))
}

export function getBaseIP(slotIndex) {
  return slotIndex === 0 ? 3 : slotIndex <= 2 ? 2 : 1
}

export function getTotalCompanyIP(ipLimit) {
  return ipLimit
}

export function isOPG(abilityName) {
  const w = Object.values(WARRIORS).find(wr =>
    wr.abilities.some(a => a.name === abilityName)
  )
  if (!w) return false
  const a = w.abilities.find(ab => ab.name === abilityName)
  return a?.desc?.toLowerCase().includes('once per game') || false
}

// ── RANDOM NAME GENERATOR ─────────────────────────────────────────────────────

const _ADJ = [
  'Ashen','Blighted','Bone-Tired','Broken','Burned','Charred','Creeping',
  'Crimson','Cursed','Damned','Doomed','Dread','Fallen','Festering',
  'Forsaken','Gaunt','God-Cursed','Grim','Hollow','Howling','Hungry',
  'Iron','Lost','Pale','Plague-Ridden','Rotting','Ruined','Scarred',
  'Seething','Smoldering','Soot-Stained','Starving','Sunken','Tattered',
  'Thorn-Crowned','War-Born','Wailing','Wretched','Blackened','Bitter',
]
const _NOUN = [
  'Ashes','Axes','Bells','Blades','Bones','Brands','Chains','Claws',
  'Crows','Curs','Dogs','Embers','Eyes','Fists','Flies','Graves','Hammers',
  'Hounds','Kings','Knives','Maggots','Men','Nails','Nooses','Pikes',
  'Ravens','Rats','Ruins','Skulls','Smoke','Teeth','Thorns','Toads',
  'Tombs','Vipers','Wolves','Worms',
]
const _SUFFIX = [
  'Band','Brotherhood','Company','Coven','Crew','Fellowship',
  'Guard','Host','Legion','Order','Pack','Warband','Watch',
]

function _rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export function generateCompanyName() {
  const pattern = Math.floor(Math.random() * 6)
  switch (pattern) {
    case 0: return `The ${_rnd(_ADJ)} ${_rnd(_NOUN)}`
    case 1: return `${_rnd(_ADJ)} ${_rnd(_NOUN)}`
    case 2: return `${_rnd(_ADJ)} ${_rnd(_NOUN)} ${_rnd(_SUFFIX)}`
    case 3: return `The ${_rnd(_NOUN)} of ${_rnd(_ADJ)} ${_rnd(_NOUN)}`
    case 4: return `${_rnd(_SUFFIX)} of ${_rnd(_ADJ)} ${_rnd(_NOUN)}`
    default: return `The ${_rnd(_ADJ)} ${_rnd(_SUFFIX)}`
  }
}

function emptySlot(i, isCaptain) {
  return {
    type: null, weapon1: null, weapon2: null, consumable: null,
    climbing: null, ip: [], isCaptain: isCaptain ?? (i === 0),
    notes: [], customName: null,
    earnedIP: 0, statImproves: [],
  }
}

// The old end-of-game modal hands out one pool of IP; split it into the engine's draft
// (survivor point, bonus) and leave out the winner's Captain point, which the engine adds
function allocationToDraft(slots, { survivorIndices = [], ipAllocations = {}, newCaptainIndex = null, result, scenario = null }) {
  const fallenIndices = slots.map((s, i) => (s.type && !survivorIndices.includes(i) ? i : -1)).filter(i => i >= 0)
  const alloc = { ...ipAllocations }
  const captainIdx = slots.findIndex(s => s.type && s.isCaptain)
  if (result === 'win' && survivorIndices.includes(captainIdx) && alloc[captainIdx] > 0) alloc[captainIdx]--
  const given = Object.entries(alloc).filter(([, n]) => n > 0).map(([i, n]) => [Number(i), n])
  // The survivor point goes to someone who can use it, if anyone can; the rest is bonus
  const first = given.find(([i]) => spendableCapacity(slots[i]) > 0) ?? given[0]
  const survivorPick = first ? first[0] : null
  const bonus = given
    .map(([index, n]) => ({ index, ip: index === survivorPick ? n - 1 : n }))
    .filter(b => b.ip > 0)
  return { result, scenario, fallenIndices, newCaptainIndex, survivorPick, bonus }
}

function defaultState() {
  return {
    companyId: randomUUID(),
    mark: MARKS[0].name,
    companyName: '',
    companyAvatar: null,
    ipLimit: 3,
    companyMode: 'standard',
    campaignGame: 0,
    campaign: null,        // campaign log etc. (see store/campaign.js); null for standard companies
    slots: Array.from({ length: 3 }, (_, i) => emptySlot(i)),
  }
}

// ── STORE ─────────────────────────────────────────────────────────────────────

export const useBuilderStore = create((set, get) => {
  // Load initial state from a shared-link URL hash, if any
  const loadInitial = () => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const imported = decodeCompany(hash)
      if (imported) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
        return { ...normalizeCampaign({ ...defaultState(), ...imported }), _fromShare: true }
      }
    }
    return defaultState()
  }

  const initial = loadInitial()

  if (initial._fromShare) {
    setTimeout(() => get()._toast('Company loaded from shared link!'), 0)
  }

  // Handle share links pasted into an already-open tab (no full page reload)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    if (decodeCompany(hash)) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
      get().openSharedLink(hash)
    }
  })

  // ── Campaign activity events ───────────────────────────────────────────────
  // companyId → events not yet handed to the save queue (see _logEvent / _autoDraft).
  // Memory only: they reach the server with the company's next save.
  const unsentEvents = new Map()

  // ── Cloud auto-save ─────────────────────────────────────────────────────────
  const upsertSave = (save) => {
    const saves = get().saves.filter(s => s.companyId !== save.companyId)
    set({ saves: [save, ...saves] })
  }
  // "Saved" is a brief confirmation, then the indicator clears; "Offline" stays until resolved
  let savedTimer = null
  const saver = createSaver({
    onStatus: saveStatus => {
      clearTimeout(savedTimer)
      set({ saveStatus })
      if (saveStatus === 'saved') savedTimer = setTimeout(() => set({ saveStatus: 'idle' }), 2000)
    },
    onSaved: (snapshot, savedAt) => {
      if (get().saves.some(s => s.companyId === snapshot.companyId)) upsertSave({ ...snapshot, savedAt })
    },
    onConflict: (save) => {
      upsertSave(save)
      if (save.companyId === get().companyId) {
        const { savedAt: _t, ...company } = save
        set({ ...normalizeCampaign({ campaign: null, ...company }), companyAvatar: company.companyAvatar ?? null })
        get()._toast('Updated with changes from another device.')
      }
    },
    onForbidden: (snapshot) => {
      // Id already used by another account — keep the company under a new id
      const moved = { ...snapshot, companyId: randomUUID() }
      if (unsentEvents.has(snapshot.companyId)) {
        unsentEvents.set(moved.companyId, unsentEvents.get(snapshot.companyId))
        unsentEvents.delete(snapshot.companyId)
      }
      set({ saves: get().saves.map(s => s.companyId === snapshot.companyId ? { ...s, companyId: moved.companyId } : s) })
      if (get().companyId === snapshot.companyId) set({ companyId: moved.companyId })
      return moved
    },
  })
  window.addEventListener('pagehide', () => saver.flushOnUnload())

  return {
    // ── STATE ──────────────────────────────────────────────────────────────────
    ...initial,
    _savedSnapshot: JSON.stringify(initial),
    toast: null,
    validationMsg: null,
    shareCode: null,
    importOpen: false,
    saves: [],             // cloud saves for the signed-in user
    savesLoaded: false,
    saveStatus: 'idle',    // 'idle' | 'saving' | 'saved' | 'offline'
    viewingShare: !!initial._fromShare, // showing a shared link that isn't saved to the account

    // ── COMPUTED ───────────────────────────────────────────────────────────────
    getCompanyIP() {
      return get().ipLimit
    },
    getTotalIPSpent() {
      return get().slots.reduce((sum, s) => sum + (s.ip?.length || 0), 0)
    },

    // ── ACTIONS ────────────────────────────────────────────────────────────────
    setMark(mark) {
      const from = get().mark
      set({ mark })
      if (from !== mark) get()._logEvent('mark.changed', { from: from || null, to: mark || null })
      get()._autoDraft()
    },
    setCompanyName(name) {
      const from = get().companyName
      set({ companyName: name })
      // Naming a company that has no warriors yet (the new-company wizard) isn't a rename;
      // keystrokes coalesce in the save queue
      if (from !== name && get().slots.some(x => x.type)) get()._logEvent('company.renamed', { from, to: name })
      get()._autoDraft()
    },
    setCompanyAvatar(avatar) {
      set({ companyAvatar: avatar })
      get()._autoDraft()
    },
    setEarnedIPAll(ip) {
      const { slots } = get()
      // Campaign: never below what a warrior has already spent
      const floor = slot => (get().companyMode === 'campaign' ? minEarnedIP(slot) : 0)
      const next = slots.map(slot => ({ ...slot, earnedIP: Math.max(floor(slot), ip) }))
      set({ slots: next })
      next.forEach((s, i) => get()._logIPEdit(slots[i], s))
      get()._autoDraft()
    },
    setEarnedIP(slotIndex, ip) {
      const { slots } = get()
      const floor = slot => (get().companyMode === 'campaign' ? minEarnedIP(slot) : 0)
      const newSlots = slots.map((slot, i) => i === slotIndex ? { ...slot, earnedIP: Math.max(0, floor(slot), ip) } : slot)
      set({ slots: newSlots })
      get()._logIPEdit(slots[slotIndex], newSlots[slotIndex])
      get()._autoDraft()
    },
    addSlot() {
      const { slots } = get()
      if (slots.length >= 8) return
      const slot = emptySlot(slots.length, false)
      set({ slots: [...slots, get().companyMode === 'campaign' ? { ...slot, uid: randomUUID() } : slot] })
      get()._autoDraft()
    },
    removeSlot() {
      const { slots } = get()
      if (slots.length <= 1) return
      // Always remove an empty slot first; fall back to last slot
      const lastEmptyIdx = slots.map((s, i) => (!s.type ? i : -1)).filter(i => i !== -1).pop()
      const removeIdx = lastEmptyIdx ?? slots.length - 1
      // Campaign: a warrior with upgrades, or the Captain, stays
      const blocked = get().companyMode === 'campaign' && removeSlotBlock(slots[removeIdx])
      if (blocked) { get()._toast(blocked); return }
      set({ slots: slots.filter((_, i) => i !== removeIdx) })
      const gone = slots[removeIdx]
      if (gone?.type) get()._logEvent('warrior.removed', { uid: gone.uid, name: nameWithClass(gone), type: gone.type })
      get()._autoDraft()
    },
    changeIPLimit(delta) {
      if (get().companyMode === 'campaign') return // campaign IP is earned per warrior, not a pool
      const { ipLimit, slots } = get()
      const newLimit = Math.max(0, Math.min(20, ipLimit + delta))
      // Remove IP from slots that exceed new pool
      let spent = 0
      const newSlots = slots.map(slot => {
        const slotIP = []
        for (const id of (slot.ip || [])) {
          spent++
          if (spent <= newLimit) slotIP.push(id)
        }
        return { ...slot, ip: slotIP }
      })
      set({ ipLimit: newLimit, slots: newSlots })
      get()._autoDraft()
    },
    selectWarrior(slotIndex, type) {
      const slots = [...get().slots]
      // Campaign: a class is locked once chosen (undoRecruit is the way back). A class picked
      // for an empty slot is a recruit, hired (uid, roster log) keeping any IP already set.
      if (get().companyMode === 'campaign') {
        const current = slots[slotIndex]
        if (current?.type) {
          if (type !== current.type) get()._toast("A warrior's class is locked in a campaign.")
          return
        }
        if (type) get().hireWarrior(slotIndex, type, { startIP: current?.earnedIP || 0 })
        return
      }
      const wdata = type ? WARRIORS[type] : null
      const firstWeapon = wdata ? (wdata.fixedWeapon || getAllowedWeapons(wdata)[0]) : null
      const fixedShield = wdata?.fixedShield || false
      const fixedDualWield = wdata?.fixedDualWield || false
      slots[slotIndex] = {
        ...slots[slotIndex],
        type,
        weapon1: firstWeapon,
        weapon2: fixedShield ? 'Shield' : fixedDualWield ? 'Light Weapon' : null,
        consumable: null,
        climbing: null,
        ip: [],
        // Spent IP is refunded on a class change, so campaign stat picks go with it (no free stats)
        statImproves: [],
      }
      set({ slots })
      get()._autoDraft()
    },
    randomizeWarriors() {
      // Campaign rosters are earned game by game; a reroll would throw away permanent upgrades
      if (get().companyMode === 'campaign') {
        get()._toast("A campaign company can't be randomized.")
        return
      }
      const { ipLimit, companyMode } = get()
      const allTypes = Object.keys(WARRIORS)
      const shuffled = [...allTypes].sort(() => Math.random() - 0.5)
      const twoHanded = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']
      const climbingOptions = Object.keys(CLIMBING_ITEMS).filter(k => k !== 'None')
      const statOptions = Object.keys(STAT_IMPROVEMENT)

      // Standard mode uses a shared IP pool; campaign mode gives each warrior their earned IP
      let sharedPool = companyMode === 'standard' ? ipLimit : 0

      const slots = get().slots.map((slot, i) => {
        const type = shuffled[i % shuffled.length]
        const wdata = WARRIORS[type]
        const allowed = getAllowedWeapons(wdata) // already respects cantHave + fixedWeapon
        let ipPool = companyMode === 'campaign' ? (slot.earnedIP || 0) : sharedPool

        // Pick weapon1
        const affordableWeapons = allowed.filter(w =>
          w !== 'Polearm (one-handed)' || wdata.fixedShield || ipPool >= 1
        )
        const weapon1 = wdata.fixedWeapon ||
          affordableWeapons[Math.floor(Math.random() * (affordableWeapons.length || 1))] ||
          allowed[0]

        // ── weapon2: only possible when weapon1 is one-handed ─────────────────
        // Two-handed weapons (Bow, Crossbow, Heavy Weapon, Polearm two-handed)
        // occupy both hands — no second weapon is ever possible.
        // We check this FIRST so no branch below can accidentally assign weapon2.
        const ip = []
        let weapon2 = null
        let climbing = null
        let consumable = null
        let statImprove = null

        if (weapon1 && !twoHanded.includes(weapon1)) {
          if (wdata.fixedShield) {
            weapon2 = 'Shield'                          // class rule — free, no IP
          } else if (wdata.fixedDualWield) {
            weapon2 = 'Light Weapon'                    // class rule — free, no IP
          } else if (weapon1 === 'Polearm (one-handed)') {
            weapon2 = 'Shield'                          // required pairing — costs 1 IP
            ip.push('weapon2')
            ipPool--
          } else {
            // Optional offhand: Light Weapon or Shield (if class allows), costs 1 IP
            const w2opts = getSecondWeaponOptions(wdata, weapon1) // only returns Shield / Light Weapon
            if (w2opts.length && Math.random() > 0.5 && ipPool > 0) {
              weapon2 = w2opts[Math.floor(Math.random() * w2opts.length)]
              ip.push('weapon2')
              ipPool--
            }
          }
        }

        // Randomly assign remaining IP options (stat, climbing, consumable)
        for (const opt of IP_OPTIONS.filter(o => o.id !== 'weapon2').sort(() => Math.random() - 0.5)) {
          if (ipPool <= 0) break
          if (Math.random() > 0.4) {
            ip.push(opt.id)
            ipPool--
            if (opt.id === 'climbing')   climbing   = climbingOptions[Math.floor(Math.random() * climbingOptions.length)]
            if (opt.id === 'consumable') consumable = CONSUMABLE_NAMES[Math.floor(Math.random() * CONSUMABLE_NAMES.length)]
            if (opt.id === 'stat')       statImprove = statOptions[Math.floor(Math.random() * statOptions.length)]
          }
        }

        if (companyMode === 'standard') sharedPool = ipPool

        return {
          ...slot,
          type,
          weapon1,
          weapon2,
          consumable,
          climbing,
          statImprove,
          ip,
        }
      })

      // Guarantee at least 2 warriors have at least 1 IP upgrade
      const minGuaranteed = Math.min(2, slots.length)
      const withUpgrades = slots.filter(s => s.ip.length > 0).length
      if (withUpgrades < minGuaranteed) {
        const need = minGuaranteed - withUpgrades
        const bare = slots.filter(s => s.ip.length === 0)
        const remainingPool = companyMode === 'standard' ? sharedPool : 0
        let forced = remainingPool
        for (let i = 0; i < need && i < bare.length; i++) {
          const s = bare[i]
          if (companyMode === 'campaign' && (s.earnedIP || 0) === 0) continue
          if (companyMode === 'standard' && forced <= 0) break
          // Pick a random non-weapon2 option
          const opts = IP_OPTIONS.filter(o => o.id !== 'weapon2').sort(() => Math.random() - 0.5)
          const opt = opts[0]
          if (!opt) continue
          s.ip = [opt.id]
          if (opt.id === 'climbing')   s.climbing   = climbingOptions[Math.floor(Math.random() * climbingOptions.length)]
          if (opt.id === 'consumable') s.consumable = CONSUMABLE_NAMES[Math.floor(Math.random() * CONSUMABLE_NAMES.length)]
          if (opt.id === 'stat')       s.statImprove = statOptions[Math.floor(Math.random() * statOptions.length)]
          if (companyMode === 'standard') forced--
        }
      }

      const mark = MARKS[Math.floor(Math.random() * MARKS.length)].name
      const companyName = generateCompanyName()
      set({ slots, mark, companyName })
      get()._autoDraft()
      const randomToasts = [
        '⚔ The dice have spoken.',
        '☠ A new company rises from the ash.',
        '⚔ Fate is cruel. Your roster is set.',
        '☠ Blood and chance have decided.',
        '☠ Your doom is randomized.',
        '⚔ New blood. New doom.',
        '⚔ Chaos has assembled your company.',
        '☠ Another rabble thrown into the fog.',
      ]
      get()._toast(randomToasts[Math.floor(Math.random() * randomToasts.length)])
    },
    setWarriorProp(slotIndex, prop, value) {
      const allSlotsBefore = get().slots
      const slots = [...allSlotsBefore]
      const prevIP = slots[slotIndex]?.ip || []
      if (get().companyMode === 'campaign') {
        const current = slots[slotIndex]
        const blocked = permanenceBlock(current, prop, value)
        if (blocked) { get()._toast(blocked); return }
        // A one-handed polearm brings a Shield that costs 1 IP; never hand it out free
        const wdata = WARRIORS[current?.type]
        if (prop === 'weapon1' && value === 'Polearm (one-handed)' && value !== current.weapon1 &&
            !wdata?.fixedShield && !current.ip?.includes('weapon2') &&
            (current.ip?.length || 0) >= (current.earnedIP || 0)) {
          get()._toast('A one-handed polearm comes with a Shield for 1 IP. No IP left.')
          return
        }
      }
      slots[slotIndex] = { ...slots[slotIndex], [prop]: value }
      // Handle weapon1 changes
      if (prop === 'weapon1') {
        const twoHanded = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']
        if (twoHanded.includes(value)) {
          // Two-handed: clear second weapon and remove its IP
          slots[slotIndex].weapon2 = null
          slots[slotIndex].ip = slots[slotIndex].ip.filter(id => id !== 'weapon2')
        } else if (value === 'Polearm (one-handed)') {
          // Auto-equip Shield — spend 1 IP if pool allows (and not a fixedShield warrior)
          const wdata = WARRIORS[slots[slotIndex].type]
          if (!wdata?.fixedShield) {
            if (!slots[slotIndex].ip.includes('weapon2')) {
              const { companyMode, ipLimit } = get()
              const spent = slots.reduce((sum, s) => sum + (s.ip?.length || 0), 0)
              const canAfford = companyMode === 'campaign'
                ? slots[slotIndex].ip.length < (slots[slotIndex].earnedIP || 0)
                : spent < ipLimit
              if (canAfford) {
                slots[slotIndex].ip = [...slots[slotIndex].ip, 'weapon2']
              }
            }
          }
          slots[slotIndex].weapon2 = 'Shield'
        }
      }
      if (prop === 'weapon2') {
        slots[slotIndex].ip = slots[slotIndex].ip.filter(id => {
          if (/^stat_\d+$/.test(id)) return true // campaign stat keys aren't IP_OPTIONS ids
          const opt = IP_OPTIONS.find(o => o.id === id)
          if (!opt) return false
          if (opt.id === 'w2stat' && !value) return false
          return true
        })
      }
      set({ slots })
      if (get().companyMode === 'campaign') {
        const ip = slots[slotIndex].ip || []
        // The one-handed polearm's Shield was just bought: log it. A bought item that
        // changed: update its log entry rather than adding one.
        if (ip.includes('weapon2') && !prevIP.includes('weapon2')) get()._logUpgradeBought(slotIndex, 'weapon2')
        else if (PERMANENT_GEAR.includes(prop) && ip.includes(prop)) {
          const before = get().campaign?.upgrades || []
          const uid = slots[slotIndex].uid
          let at = before.length - 1
          while (at >= 0 && !(before[at].uid === uid && before[at].id === prop)) at--
          set({ campaign: syncUpgradeItem(get(), slotIndex, prop) })
          const now = get().campaign?.upgrades?.[at]
          if (at >= 0 && now && now.label !== before[at].label) {
            get()._logEvent('upgrade.changed', { uid, name: now.name, id: prop, from: before[at].label, to: now.label })
          }
        }
        if (prop === 'customName') {
          const from = nameOfSlot(allSlotsBefore[slotIndex])
          const to = nameOfSlot(slots[slotIndex])
          if (allSlotsBefore[slotIndex]?.type && from !== to) get()._logEvent('warrior.renamed', { uid: slots[slotIndex].uid, from, to, type: slots[slotIndex].type })
        }
      }
      get()._autoDraft()
    },
    // In standard mode with a captain: only reserve IP if captain has 0 IP used
    // Once captain uses 1+ IP, pool is fully available
    getMaxIPForSlot(slotIndex) {
      const { companyMode, ipLimit, slots } = get()
      if (companyMode !== 'standard') return slots[slotIndex]?.earnedIP || 0
      const slot = slots[slotIndex]
      if (!slot) return ipLimit
      const hasCaptain = slots.some(s => s.isCaptain)
      const captainSlot = slots.find(s => s.isCaptain)
      const captainHasIP = captainSlot && (captainSlot.ip?.length || 0) > 0
      const isCaptain = slot.isCaptain
      // If no captain or captain has used IP, no limit
      if (!hasCaptain || captainHasIP) return ipLimit
      // Captain hasn't used IP yet - reserve 1 for them
      return isCaptain ? ipLimit : Math.max(0, ipLimit - 1)
    },
    toggleIP(slotIndex, optId, checked) {
      const { companyMode, slots: allSlots, getTotalIPSpent } = get()
      const slots = [...allSlots]
      const slot = { ...slots[slotIndex] }

      if (checked) {
        if (companyMode === 'campaign') {
          if ((slot.ip?.length || 0) >= (slot.earnedIP || 0)) return // warrior's pool full
        } else {
          const spent = getTotalIPSpent()
          const max = get().getMaxIPForSlot(slotIndex)
          if (spent >= max) return // pool full
        }
        slot.ip = [...(slot.ip || []), optId]
      } else {
        // Campaign upgrades are permanent; undoLastUpgrade is the only way back
        if (companyMode === 'campaign' && slot.ip?.includes(optId) && isPermanentUpgrade(optId)) {
          get()._toast('Campaign upgrades are permanent. Use Undo last upgrade to fix a mistake.')
          return
        }
        slot.ip = (slot.ip || []).filter(id => id !== optId)
      }
      slots[slotIndex] = slot
      set({ slots })
      // Campaign: log the purchase (what and for whom) for the game log
      if (checked && companyMode === 'campaign' && PERMANENT_GEAR.includes(optId)) {
        get()._logUpgradeBought(slotIndex, optId)
      }
      get()._autoDraft()
    },
    setCaptain(slotIndex) {
      let slots = [...get().slots]
      // Mark the selected index as captain, others as not
      slots = slots.map((s, i) => ({ ...s, isCaptain: i === slotIndex }))
      
      // If the new captain is not in slot 0, swap them to slot 0
      if (slotIndex !== 0) {
        const temp = slots[0]
        slots[0] = slots[slotIndex]
        slots[slotIndex] = temp
      }

      // Campaign: a Captain picked among the recruits fills the place left when everyone fell
      const { campaign } = get()
      const was = get().slots.find(s => s.type && s.isCaptain)
      if (campaign?.needsCaptain && slots[0]?.type) set({ campaign: { ...campaign, needsCaptain: false } })
      set({ slots })
      if (slots[0]?.type && was?.uid !== slots[0].uid) {
        get()._logEvent('captain.changed', { uid: slots[0].uid, to: nameWithClass(slots[0]), from: was ? nameWithClass(was) : null })
      }
      get()._autoDraft()
    },
    setNotes(slotIndex, notes) {
      const slots = [...get().slots]
      slots[slotIndex] = { ...slots[slotIndex], notes }
      set({ slots })
      get()._autoDraft()
    },

    // ── SAVE / LOAD ────────────────────────────────────────────────────────────
    // Companies auto-save to the cloud (see _autoDraft); these manage the list.
    async loadSaves() {
      try {
        let saves = await fetchCloudSaves()
        const moved = await migrateLocalData(saves)
        if (moved) {
          saves = await fetchCloudSaves()
          get()._toast(`Moved ${moved} ${moved === 1 ? 'company' : 'companies'} from this browser to your account.`)
        }
        set({ saves, savesLoaded: true })
      } catch (err) {
        console.warn('[cloud] loading saves failed:', err)
        set({ savesLoaded: true, saveStatus: 'offline' })
        get()._toast("Couldn't load your companies. Check your connection.")
      }
    },
    loadCompany(index) {
      const save = get().saves[index]
      if (!save) return
      const { mark: m, companyName: n, companyAvatar: a = null, ipLimit: ip, slots: sl, companyId: cid, companyMode: cm = 'standard', campaignGame: cg = 0, campaign: cp = null } = save
      // Every saved field must be listed here, or the next auto-save drops it (campaign holds the game log)
      const loaded = normalizeCampaign({ companyMode: cm, campaignGame: cg, campaign: cp, slots: sl })
      set({ mark: m, companyName: n, companyAvatar: a, ipLimit: ip, companyId: cid || randomUUID(), ...loaded, viewingShare: false })
    },
    async deleteCompany(index) {
      const removed = get().saves[index]
      if (!removed) return
      try {
        await removeCloudCompany(removed.companyId)
      } catch {
        get()._toast("Couldn't delete — check your connection.")
        return
      }
      set({ saves: get().saves.filter(s => s.companyId !== removed.companyId) })
      // Don't let the open editor re-save a company that was just deleted
      if (removed.companyId === get().companyId) get().clearBuilder()
    },
    clearBuilder() {
      const fresh = defaultState()
      const { companyId, ...snapshot } = fresh
      set({ ...fresh, viewingShare: false, _savedSnapshot: JSON.stringify(snapshot) })
    },
    // Signed out: forget everything belonging to the previous account
    resetForSignOut() {
      saver.cancel()
      unsentEvents.clear()
      get().clearBuilder()
      set({ saves: [], savesLoaded: false, saveStatus: 'idle' })
    },
    // Keep a copy of the shared company currently on screen in the account
    saveSharedCopy() {
      set({ companyId: randomUUID(), viewingShare: false })
      get()._autoDraft()
      get()._toast('Saved to your companies.')
    },
    flushSaves() {
      return saver.flush()
    },

    // ── SHARE / IMPORT ─────────────────────────────────────────────────────────
    openShare() {
      // Campaign fields too, or a campaign company is shared as a standard one
      const { mark, companyName, ipLimit, slots, companyMode, campaignGame } = get()
      const code = encodeCompany({ mark, companyName, ipLimit, slots, companyMode, campaignGame })
      const url = `${window.location.origin}${window.location.pathname}#${code}`
      set({ shareCode: url })
    },
    closeShare() {
      set({ shareCode: null })
    },
    openImport() {
      set({ importOpen: true })
    },
    closeImport() {
      set({ importOpen: false })
    },
    // Show a shared company read-only; saveSharedCopy() keeps it in the account
    openSharedLink(code) {
      const imported = decodeCompany(code)
      if (!imported) return false
      set({ ...normalizeCampaign({ ...defaultState(), ...imported }), companyId: randomUUID(), viewingShare: true, _savedSnapshot: JSON.stringify(imported) })
      get()._toast('Company loaded from shared link!')
      return true
    },
    doImport(raw) {
      const code = raw.trim().replace(/^.*#/, '')
      const imported = decodeCompany(code)
      if (!imported) { get()._toast('Invalid import code'); return false }
      // New id: an import is a new company, never an overwrite of the one being edited
      // campaign: null first, so the open company's game log isn't carried into the import
      set({ ...normalizeCampaign({ campaign: null, ...imported }), companyId: randomUUID(), viewingShare: false, _savedSnapshot: JSON.stringify(imported) })
      get()._autoDraft()
      get()._toast('Company imported!')
      set({ importOpen: false })
      return true
    },

    // ── RANDOM ────────────────────────────────────────────────────────────────
    // Pure computation — returns result without touching store state
    buildRandomResult({ warriors: numWarriors = 3, ipLimit: overrideIpLimit = 3 } = {}) {
      const allTypes = Object.keys(WARRIORS)
      const shuffled = [...allTypes].sort(() => Math.random() - 0.5)
      const picked = shuffled.slice(0, numWarriors)
      const mark = MARKS[Math.floor(Math.random() * MARKS.length)].name
      const ipLimit = overrideIpLimit
      let ipPool = ipLimit

      const slots = Array.from({ length: numWarriors }, (_, i) => {
        const type = picked[i] || null
        if (!type) return { type: null, weapon1: null, weapon2: null, consumable: null, climbing: null, ip: [], isCaptain: i === 0, notes: [] }
        const wdata = WARRIORS[type]
        const allowed = getAllowedWeapons(wdata) // already respects cantHave + fixedWeapon
        const twoHanded = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']

        const affordableWeapons = allowed.filter(w => {
          if (w === 'Polearm (one-handed)' && !wdata.fixedShield && ipPool < 1) return false
          return true
        })
        // fixedWeapon always wins; fall back through affordable → allowed[0]
        const weapon1 = wdata.fixedWeapon ||
          affordableWeapons[Math.floor(Math.random() * (affordableWeapons.length || 1))] ||
          allowed[0]

        // ── weapon2: only possible when weapon1 is one-handed ─────────────────
        // Two-handed weapons (Bow, Crossbow, Heavy Weapon, Polearm two-handed)
        // occupy both hands — no second weapon is ever possible.
        // We check this FIRST so no branch below can accidentally assign weapon2.
        const ip = []
        let weapon2 = null

        if (weapon1 && !twoHanded.includes(weapon1)) {
          if (wdata.fixedShield) {
            weapon2 = 'Shield'                          // class rule — free, no IP
          } else if (wdata.fixedDualWield) {
            weapon2 = 'Light Weapon'                    // class rule — free, no IP
          } else if (weapon1 === 'Polearm (one-handed)') {
            weapon2 = 'Shield'                          // required pairing — costs 1 IP
            ip.push('weapon2')
            ipPool--
          } else {
            // Optional offhand: Light Weapon or Shield (if class allows), costs 1 IP
            const w2opts = getSecondWeaponOptions(wdata, weapon1) // only returns Shield / Light Weapon
            if (w2opts.length && Math.random() > 0.5 && ipPool > 0) {
              weapon2 = w2opts[Math.floor(Math.random() * w2opts.length)]
              ip.push('weapon2')
              ipPool--
            }
          }
        }

        const climbingOptions = Object.keys(CLIMBING_ITEMS).filter(k => k !== 'None')
        const statOptions = Object.keys(STAT_IMPROVEMENT)
        let climbing = null
        let consumable = null
        let statImprove = null

        const remainingOpts = IP_OPTIONS.filter(o => o.id !== 'weapon2')
        for (const opt of remainingOpts.sort(() => Math.random() - 0.5)) {
          if (ipPool <= 0) break
          if (Math.random() > 0.6) {
            ip.push(opt.id)
            ipPool--
            if (opt.id === 'climbing')   climbing    = climbingOptions[Math.floor(Math.random() * climbingOptions.length)]
            if (opt.id === 'consumable') consumable  = CONSUMABLE_NAMES[Math.floor(Math.random() * CONSUMABLE_NAMES.length)]
            if (opt.id === 'stat')       statImprove = statOptions[Math.floor(Math.random() * statOptions.length)]
          }
        }

        return { type, weapon1, weapon2, consumable, climbing, statImprove, ip, isCaptain: i === 0, notes: [] }
      })
      return { mark, companyName: generateCompanyName(), ipLimit, slots }
    },
    // Apply a pre-built random result to the store
    applyRandomResult(result) {
      // A new company: game 0 and a fresh campaign, never the previous one's log
      get()._dropUnsavedEvents()
      set(normalizeCampaign({ companyMode: get().companyMode, ...result, companyId: randomUUID(), campaignGame: 0, campaign: null }))
      get()._logNewCampaign()
      get()._autoDraft()
    },
    applyQuizCompany({ mark, companyName, warriors }) {
      get()._dropUnsavedEvents()
      const slots = Array.from({ length: 3 }, (_, i) => emptySlot(i, i === 0))

      if (warriors) {
        const parts = warriors.split(' · ')
        parts.forEach((p, i) => {
          if (i >= 3) return
          const match = p.match(/^(.+?)\s*\(/)
          const type = match ? match[1].trim() : p.trim()
          
          if (!WARRIORS[type]) return
          slots[i].type = type

          const wdata = WARRIORS[type]
          const allowed = getAllowedWeapons(wdata)
          const firstWeapon = wdata.fixedWeapon || allowed[0]
          slots[i].weapon1 = firstWeapon
          
          if (wdata.fixedShield) {
            slots[i].weapon2 = 'Shield'
          } else if (wdata.fixedDualWield) {
            slots[i].weapon2 = 'Light Weapon'
          } else if (firstWeapon === 'Polearm (one-handed)') {
            slots[i].weapon2 = 'Shield'
            slots[i].ip.push('weapon2')
          }
        })
      }

      set(normalizeCampaign({
        companyMode: get().companyMode,
        mark,
        companyName,
        slots,
        companyId: randomUUID(),
        campaignGame: 0,
        campaign: null,
      }))
      get()._logNewCampaign()
      get()._autoDraft()
    },
    rollRandom({ warriors = 3, ipLimit = 3 } = {}) {
      const result = get().buildRandomResult({ warriors, ipLimit })
      get().applyRandomResult(result)
    },

    // ── CAMPAIGN ───────────────────────────────────────────────────────────────
    setCompanyMode(mode) {
      const { slots, campaign, campaignGame, companyMode: was } = get()
      if (was === 'campaign' && mode !== 'campaign') get()._logEvent('campaign.left', { completed: campaignProgress(get()).completed })
      set({ ...normalizeCampaign({ companyMode: mode, slots, campaign, campaignGame }), ipLimit: mode === 'campaign' ? 0 : 3 })
      if (mode === 'campaign' && was !== 'campaign') {
        get()._logEvent(campaign ? 'campaign.resumed' : 'campaign.started', { games: campaignProgress(get()).total })
      }
      get()._autoDraft()
    },
    // ── Campaign settings ──
    // Each returns true when done; otherwise the reason is toasted
    setGameScenario(gameNumber, name) {
      const from = get().campaign?.log?.find(r => r.gameNumber === gameNumber)?.scenario ?? null
      const next = setGameScenarioOf(get(), gameNumber, name)
      if (!next) { get()._toast('There is no such game in the log.'); return false }
      set({ campaign: next.campaign })
      const to = next.campaign.log.find(r => r.gameNumber === gameNumber).scenario
      const eventId = next.campaign.log.find(r => r.gameNumber === gameNumber).eventId ?? null
      if (from !== to) get()._logEvent('game.renamed', { gameNumber, from, to }, { ref: eventId })
      get()._autoDraft()
      return true
    },
    // A note on an activity-log row (eventId = the event it is about). '' removes the note.
    // Only logs an event; the company itself doesn't change. Returns true when queued.
    noteLogEntry(eventId, text, { afterGame } = {}) {
      if (!eventId || !get()._canLogEvents()) return false
      const note = String(text ?? '').trim().slice(0, MAX_NOTE_LENGTH)
      get()._logEvent('entry.noted', { text: note }, { ref: eventId, afterGame })
      get()._autoDraft()
      return true
    },
    // Kept for older callers: campaigns have no length any more (does nothing)
    setCampaignLength() {
      return true
    },
    // Kept for older callers: same as reopenCampaign
    keepPlaying() {
      return get().reopenCampaign()
    },
    // The player ends the campaign (the only way it completes). Logged as campaign.completed.
    endCampaign() {
      let next
      try { next = endCampaignOf(get()) } catch (err) { get()._toast(err.message); return false }
      set({ campaign: next.campaign })
      get()._logEvent('campaign.completed', { games: campaignProgress(next).completed })
      get()._autoDraft()
      get()._toast('Campaign ended.')
      return true
    },
    // Older name
    endCampaignEarly() {
      return get().endCampaign()
    },
    reopenCampaign() {
      let next
      try { next = reopenCampaignOf(get()) } catch (err) { get()._toast(err.message); return false }
      set({ campaign: next.campaign })
      get()._logEvent('campaign.reopened', { completed: campaignProgress(next).completed })
      get()._autoDraft()
      get()._toast('Campaign reopened.')
      return true
    },
    getCampaignProgress() {
      return campaignProgress(get())
    },
    // 0 = this warrior has no upgrade left to spend another IP on (grey them out for awards)
    getSpendableCapacity(slotIndex) {
      return spendableCapacity(get().slots[slotIndex])
    },
    canUndoLastCampaignGame() {
      return canUndoLastGame(get())
    },
    // Record a finished campaign game (draft shape: see store/campaign.js).
    // Returns { ok, errors, record }; on errors nothing changes and the first one is toasted.
    recordCampaignGame(draft) {
      const errors = validateEndOfGame(get(), draft)
      if (errors.length) {
        get()._toast(errors[0])
        return { ok: false, errors, record: null }
      }
      const eventId = newEventId()
      const wasEnded = campaignProgress(get()).ended
      const { company, record } = applyEndOfGame(get(), draft, { eventId })
      set({ slots: company.slots, campaignGame: company.campaignGame, campaign: company.campaign })
      const n = record.gameNumber
      const nameOfUid = uid => {
        const f = record.fallen.find(x => x.uid === uid)
        return f ? nameWithClass(f) : record.roster.find(x => x.uid === uid)?.name || null
      }
      get()._logEvent('game.recorded', {
        gameNumber: n, result: record.result, scenario: record.scenario,
        awards: record.awards.map(a => ({ uid: a.uid, name: nameOfUid(a.uid), ip: a.ip, reason: a.reason })),
        fallen: record.fallen.map(nameWithClass),
        captainChange: record.captainChange
          ? { from: nameOfUid(record.captainChange.from), to: record.captainChange.to ? nameOfUid(record.captainChange.to) : null }
          : null,
      }, { id: eventId, afterGame: n - 1 })
      // A game after the player ended the campaign reopens it
      if (wasEnded) get()._logEvent('campaign.reopened', { completed: n })
      get()._autoDraft()
      get()._toast(
        company.campaign.needsCaptain ? `Game ${n} recorded. Recruit new warriors and choose a Captain.`
          : record.result === 'retreat' ? `Game ${n} recorded. No IP for a retreat.`
          : `Game ${n} recorded.`
      )
      return { ok: true, errors: [], record }
    },
    // Enter the latest game again from a new End of Game draft (prefill: draftFromRecord).
    // Like an undo + record, so upgrades bought and recruits hired since are lost
    // (editLatestGameLosses). Returns { ok, errors, record }; fallback: true means this game
    // has no snapshot, so only editGameOutcome can change it.
    editLatestGame(draft) {
      const last = get().campaign?.log?.at(-1)
      if (!last?.before) {
        const msg = 'Only the result and the survivor point of this game can be changed.'
        get()._toast(msg)
        return { ok: false, errors: [msg], record: null, fallback: true }
      }
      let res
      try { res = reRecordLatestGame(get(), draft) } catch (err) {
        get()._toast(err.message)
        return { ok: false, errors: [err.message], record: null, fallback: false }
      }
      const { company, record, previous, deltas } = res
      set({ slots: company.slots, campaignGame: company.campaignGame, campaign: company.campaign })
      get()._logGameEdited(previous, record, deltas)
      get()._autoDraft()
      get()._toast(`Game ${record.gameNumber} updated.`)
      return { ok: true, errors: [], record, fallback: false }
    },
    // Any recorded game: change the result and/or the survivor point (change.survivorPick is
    // a warrior uid). Returns { ok, reason, deltas, warnings }.
    editGameOutcome(gameNumber, change) {
      let res
      try { res = editOutcome(get(), gameNumber, change) } catch (err) {
        get()._toast(err.message)
        return { ok: false, reason: err.message, deltas: [], warnings: [] }
      }
      const { company, record, previous, deltas, warnings } = res
      set({ slots: company.slots, campaign: company.campaign })
      get()._logGameEdited(previous, record, deltas)
      get()._autoDraft()
      get()._toast(warnings[0] || `Game ${gameNumber} updated.`)
      return { ok: true, reason: null, deltas, warnings }
    },
    // Older entry point (pooled IP allocation); maps onto recordCampaignGame
    awardEndOfGame({ survivorIndices, ipAllocations = {}, newCaptainIndex = null, retreat = false, result, scenario = null }) {
      const draft = allocationToDraft(get().slots, {
        survivorIndices, ipAllocations, newCaptainIndex, scenario,
        result: retreat ? 'retreat' : (result || 'loss'),
      })
      return get().recordCampaignGame(draft).ok
    },
    // Puts the company back as it was before the latest game (only that one)
    undoLastCampaignGame() {
      const last = get().campaign?.log?.at(-1)
      const restored = undoLastGame(get())
      if (!restored) { get()._toast('There is no game to undo.'); return false }
      // The activity log already started stays started (the snapshot may predate it)
      set({ slots: restored.slots, campaignGame: restored.campaignGame, campaign: { ...restored.campaign, eventLog: get().campaign?.eventLog } })
      get()._logEvent('game.undone', { gameNumber: last.gameNumber, result: last.result }, { ref: last.eventId ?? null })
      get()._autoDraft()
      get()._toast(`Game ${restored.campaignGame + 1} undone.`)
      return true
    },
    // New warrior in an empty slot. startIP: house rules (the rule is 0).
    // makeCaptain: the recruit becomes Captain (when the company has no living Captain).
    hireWarrior(slotIndex, type, { startIP = 0, makeCaptain = false } = {}) {
      let company
      const eventId = newEventId()
      const target = get().slots[slotIndex]
      try {
        company = hireIntoVacancy(get(), slotIndex, type, { startIP, makeCaptain, eventId })
      } catch (err) {
        get()._toast(err.message)
        return false
      }
      set({ slots: company.slots, ...(company.campaign ? { campaign: company.campaign } : {}) })
      const hired = company.slots[slotIndex]
      get()._logEvent('warrior.hired', {
        uid: hired.uid, name: nameWithClass(hired), type, startIP: hired.earnedIP || 0,
        replaced: target?.fallen ? nameWithClass(target.fallen) : null, captain: !!hired.isCaptain,
      }, { id: eventId })
      get()._autoDraft()
      return true
    },
    // Brings a warrior from The Fallen back (their own empty slot, else slotIndex or the
    // first empty one) with `ip` IP to spend (default: what they had; see resurrectDefaults)
    // and nothing bought. Returns true when done, else toasts the reason.
    resurrectWarrior(gameNumber, uid, { slotIndex, ip } = {}) {
      const entry = get().campaign?.log?.find(r => r.gameNumber === gameNumber)?.fallen?.find(f => f.uid === uid)
      let res
      try { res = resurrectWarriorOf(get(), { gameNumber, uid }, { slotIndex, ip }) } catch (err) {
        get()._toast(err.message)
        return false
      }
      const { company, slotIndex: at, warnings } = res
      set({ slots: company.slots, campaign: company.campaign })
      const w = company.slots[at]
      // earnedIP: what they had when they fell; ip: what they came back with
      get()._logEvent('warrior.resurrected', { uid, name: nameWithClass(w), type: w.type, fromGame: gameNumber, slotIndex: at, earnedIP: entry?.earnedIP || 0, ip: w.earnedIP || 0 })
      get()._autoDraft()
      get()._toast(warnings[0] || `${nameWithClass(w)} is back.`)
      return true
    },
    // Campaign: takes a recruit back out (only with no upgrades bought). Returns null when
    // done, else the reason it can't be (also toasted). Noted in campaign.roster.
    undoRecruit(slotIndex) {
      const reason = undoRecruitBlock(get().slots[slotIndex])
      if (reason) { get()._toast(reason); return reason }
      const slot = get().slots[slotIndex]
      const hire = [...(get().campaign?.roster || [])].reverse().find(e => e.uid === slot.uid && e.action === 'recruited')
      const company = undoRecruitOf(get(), slotIndex)
      set({ slots: company.slots, ...(company.campaign ? { campaign: company.campaign } : {}) })
      get()._logEvent('warrior.recruitUndone', { uid: slot.uid, name: nameWithClass(slot), type: slot.type }, { ref: hire?.eventId ?? null })
      get()._autoDraft()
      get()._toast('Recruit undone. Noted in the campaign log.')
      return null
    },
    // The escape hatch for permanent campaign upgrades: takes back only the most recent one
    undoLastUpgrade(slotIndex) {
      const slot = get().slots[slotIndex]
      const next = slot && undoLastUpgradeOf(slot)
      if (!next) return false
      get()._logUpgradeUndone(slot)
      set({ slots: get().slots.map((s, i) => (i === slotIndex ? next : s)), campaign: unlogLastUpgrade(get(), slot) })
      get()._autoDraft()
      return true
    },
    addStatImprove(slotIndex, stat) {
      const slots = [...get().slots]
      const slot = { ...slots[slotIndex] }
      if (slot.statImproves?.includes(stat)) return
      if (get().companyMode === 'campaign' && (slot.ip?.length || 0) >= (slot.earnedIP || 0)) return // no IP left
      const statKey = `stat_${slot.statImproves?.length || 0}`
      slot.statImproves = [...(slot.statImproves || []), stat]
      slot.ip = [...(slot.ip || []), statKey]
      slots[slotIndex] = slot
      set({ slots })
      if (get().companyMode === 'campaign') get()._logUpgradeBought(slotIndex, statKey)
      get()._autoDraft()
    },
    removeStatImprove(slotIndex, stat) {
      const slots = [...get().slots]
      const slot = { ...slots[slotIndex] }
      const statIdx = slot.statImproves?.indexOf(stat) ?? -1
      if (statIdx < 0) return
      // Campaign: permanent, except for undoing the most recent upgrade
      if (get().companyMode === 'campaign' && slot.ip?.at(-1) !== `stat_${statIdx}`) {
        get()._toast('Only the most recent upgrade can be undone.')
        return
      }
      // Campaign: this is an undo of the last upgrade, so its log entry goes too
      if (get().companyMode === 'campaign') {
        get()._logUpgradeUndone(slots[slotIndex])
        set({ campaign: unlogLastUpgrade(get(), slots[slotIndex]) })
      }
      // Renumber stat keys in place: slot.ip's order is the purchase order (see store/campaign.js)
      let n = 0
      slot.ip = (slot.ip || [])
        .filter(id => id !== `stat_${statIdx}`)
        .map(id => (id.startsWith('stat_') ? `stat_${n++}` : id))
      slot.statImproves = slot.statImproves.filter(s => s !== stat)
      slots[slotIndex] = slot
      set({ slots })
      get()._autoDraft()
    },

    // ── INTERNAL ──────────────────────────────────────────────────────────────
    _toast(msg) {
      if (get()._toastTimer) clearTimeout(get()._toastTimer)
      const timer = setTimeout(() => set({ toast: null, _toastTimer: null }), 2500)
      set({ toast: msg, _toastTimer: timer })
    },
    // ── Activity log (campaign companies, signed in, not a shared link) ──
    _canLogEvents() {
      const s = get()
      return s.companyMode === 'campaign' && !!s.campaign && !!getUser() && !s.viewingShare
    },
    // The first event of a campaign that predates the activity log is a baseline: games
    // played so far and who is in the company. A brand new campaign starts with campaign.started.
    _ensureEventLog(startingNow = false) {
      const s = get()
      if (!get()._canLogEvents() || s.campaign.eventLog) return
      set({ campaign: { ...s.campaign, eventLog: 1 } })
      if (startingNow) return
      const ev = makeBaselineEvent(s)
      if (!ev) return
      unsentEvents.set(s.companyId, [...(unsentEvents.get(s.companyId) || []), ev])
    },
    // Queue an activity event for the next save. opts: { ref, id, afterGame }
    _logEvent(type, payload = {}, { ref = null, id, afterGame } = {}) {
      if (!get()._canLogEvents()) return
      get()._ensureEventLog(type === 'campaign.started')
      const s = get()
      const ev = makeEvent(type, payload, { afterGame: afterGame ?? campaignProgress(s).completed, ref, id })
      unsentEvents.set(s.companyId, [...(unsentEvents.get(s.companyId) || []), ev])
    },
    // game.edited: what the game's result and awards were and became, and the IP moved
    _logGameEdited(previous, record, deltas) {
      const nameOf = (r, uid) => r.fallen?.find(f => f.uid === uid) ? nameWithClass(r.fallen.find(f => f.uid === uid))
        : r.roster?.find(x => x.uid === uid)?.name || null
      const side = r => ({ result: r.result, awards: (r.awards || []).map(a => ({ uid: a.uid, name: nameOf(r, a.uid), ip: a.ip, reason: a.reason })) })
      get()._logEvent('game.edited', {
        gameNumber: record.gameNumber, from: side(previous), to: side(record),
        deltas: deltas.map(d => ({ uid: d.uid, name: d.name || nameOf(record, d.uid) || nameOf(previous, d.uid), ip: d.ip })),
      }, { ref: record.eventId ?? previous.eventId ?? null, afterGame: record.gameNumber - 1 })
    },
    _logIPEdit(before, after) {
      if (!after?.type || (before?.earnedIP || 0) === (after.earnedIP || 0)) return
      get()._logEvent('ip.edited', { uid: after.uid, name: nameWithClass(after), from: before?.earnedIP || 0, to: after.earnedIP || 0 })
    },
    // Logs a purchase twice over: campaign.upgrades (the game log) and the activity log
    _logUpgradeBought(slotIndex, id) {
      const eventId = newEventId()
      set({ campaign: logUpgrade(get(), slotIndex, id, { eventId }) })
      const e = get().campaign?.upgrades?.at(-1)
      if (!e || e.eventId !== eventId) return
      get()._logEvent('upgrade.bought', { uid: e.uid, name: e.name, id, kind: e.kind, stat: e.stat ?? null, item: e.item ?? null, label: e.label }, { id: eventId })
    },
    // Call before the slot loses the upgrade: finds the entry undoLastUpgrade takes back
    _logUpgradeUndone(slot) {
      const ups = get().campaign?.upgrades || []
      const lastId = (slot.ip || []).at(-1)
      let at = ups.length - 1
      while (at >= 0 && !(ups[at].uid === slot.uid && ups[at].id === lastId)) at--
      const entry = ups[at]
      const label = entry?.label || upgradeLabel(slot, lastId).label
      get()._logEvent('upgrade.undone', { uid: slot.uid, name: nameWithClass(slot), id: lastId, label }, { ref: entry?.eventId ?? null })
    },
    // A brand new company in campaign mode (random / quiz): its log starts here
    _logNewCampaign() {
      if (get().companyMode !== 'campaign') return
      get()._logEvent('campaign.started', { games: campaignProgress(get()).total })
      get().slots.forEach(x => {
        if (x.type) get()._logEvent('warrior.hired', { uid: x.uid, name: nameWithClass(x), type: x.type, startIP: x.earnedIP || 0, replaced: null, captain: !!x.isCaptain })
      })
    },
    // The open company was never saved (no warriors): its queued events go nowhere
    _dropUnsavedEvents() {
      const { companyId, slots } = get()
      if (!slots.some(x => x.type)) unsentEvents.delete(companyId)
    },
    // Called after every edit: queue a cloud save (signed-in users only).
    _autoDraft() {
      if (!getUser() || get().viewingShare) return
      get()._ensureEventLog()
      const snapshot = snapshotCompany(get())
      // Don't save empty companies, except a campaign that has played (a game where everyone fell must be kept)
      if (!snapshot.slots.some(s => s.type) && !snapshot.campaign?.log?.length) return
      const saves = get().saves
      const existing = saves.findIndex(s => s.companyId === snapshot.companyId)
      const entry = { ...snapshot, savedAt: Date.now() }
      set({ saves: existing >= 0 ? saves.map((s, i) => i === existing ? entry : s) : [entry, ...saves] })
      const events = unsentEvents.get(snapshot.companyId) || []
      unsentEvents.delete(snapshot.companyId)
      saver.schedule(snapshot, events)
    },
    _validate() {
      const { slots } = get()
      const active = slots.filter(s => s.type)
      if (active.length === 0) return 'Add at least one warrior before saving.'
      const noWeapon = active.find(s => !s.weapon1)
      if (noWeapon) return `${noWeapon.type} needs a primary weapon.`
      return null
    },
    dismissValidation() {
      set({ validationMsg: null })
    },
  }
})
