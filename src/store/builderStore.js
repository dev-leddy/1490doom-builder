import { create } from 'zustand'

// iOS Safari <15.4 doesn't have crypto.randomUUID
const randomUUID = () =>
  crypto.randomUUID?.() ??
  ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
import { WARRIORS, MARKS, STAT_IMPROVEMENT, IP_OPTIONS } from '../data/warriors'
import { WEAPON_NAMES, CLIMBING_ITEMS, CONSUMABLE_NAMES } from '../data/weapons'
import { encodeCompany, decodeCompany } from './builderEncoding'
import { fetchCloudSaves, removeCloudCompany, createSaver, migrateLocalData, snapshotCompany } from './builderPersistence'
import { useAuthStore } from './authStore'

function getUser() { return useAuthStore.getState().user }

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
  const twoHanded = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']
  if (twoHanded.includes(primaryWeapon)) return []
  // Polearm (one-handed) always pairs with Shield only
  if (primaryWeapon === 'Polearm (one-handed)') {
    return cantHave.includes('Shield') ? [] : ['Shield']
  }
  const canShield = (wdata.allowedWeapons || []).includes('Shield') && !cantHave.includes('Shield')
  const canDualLight = !cantHave.includes('Light Weapon')
  // Light Weapon primary: can dual-wield or pair with Shield
  if (primaryWeapon === 'Light Weapon') {
    return [...(canDualLight ? ['Light Weapon'] : []), ...(canShield ? ['Shield'] : [])]
  }
  // Other one-handed: Light Weapon or Shield offhand (if allowed)
  return [...(canDualLight ? ['Light Weapon'] : []), ...(canShield ? ['Shield'] : [])]
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

function defaultState() {
  return {
    companyId: randomUUID(),
    mark: MARKS[0].name,
    companyName: '',
    companyAvatar: null,
    ipLimit: 3,
    companyMode: 'standard',
    campaignGame: 0,
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
        return { ...defaultState(), ...imported, _fromShare: true }
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
        set({ ...company, companyAvatar: company.companyAvatar ?? null })
        get()._toast('Updated with changes from another device.')
      }
    },
    onForbidden: (snapshot) => {
      // Id already used by another account — keep the company under a new id
      const moved = { ...snapshot, companyId: randomUUID() }
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
      set({ mark })
      get()._autoDraft()
    },
    setCompanyName(name) {
      set({ companyName: name })
      get()._autoDraft()
    },
    setCompanyAvatar(avatar) {
      set({ companyAvatar: avatar })
      get()._autoDraft()
    },
    setEarnedIPAll(ip) {
      const { slots } = get()
      set({ slots: slots.map(slot => ({ ...slot, earnedIP: ip })) })
      get()._autoDraft()
    },
    setEarnedIP(slotIndex, ip) {
      const { slots } = get()
      const newSlots = slots.map((slot, i) => i === slotIndex ? { ...slot, earnedIP: Math.max(0, ip) } : slot)
      set({ slots: newSlots })
      get()._autoDraft()
    },
    addSlot() {
      const { slots } = get()
      if (slots.length >= 8) return
      set({ slots: [...slots, emptySlot(slots.length, false)] })
      get()._autoDraft()
    },
    removeSlot() {
      const { slots } = get()
      if (slots.length <= 1) return
      // Always remove an empty slot first; fall back to last slot
      const lastEmptyIdx = slots.map((s, i) => (!s.type ? i : -1)).filter(i => i !== -1).pop()
      const removeIdx = lastEmptyIdx ?? slots.length - 1
      set({ slots: slots.filter((_, i) => i !== removeIdx) })
      get()._autoDraft()
    },
    changeIPLimit(delta) {
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
      }
      set({ slots })
      get()._autoDraft()
    },
    randomizeWarriors() {
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
      const slots = [...get().slots]
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
          const opt = IP_OPTIONS.find(o => o.id === id)
          if (!opt) return false
          if (opt.id === 'w2stat' && !value) return false
          return true
        })
      }
      set({ slots })
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
        slot.ip = (slot.ip || []).filter(id => id !== optId)
      }
      slots[slotIndex] = slot
      set({ slots })
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
      
      set({ slots })
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
      const { mark: m, companyName: n, companyAvatar: a = null, ipLimit: ip, slots: sl, companyId: cid, companyMode: cm = 'standard', campaignGame: cg = 0 } = save
      set({ mark: m, companyName: n, companyAvatar: a, ipLimit: ip, slots: sl, companyId: cid || randomUUID(), companyMode: cm, campaignGame: cg, viewingShare: false })
      get()._toast('Company loaded!')
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
      const { mark, companyName, ipLimit, slots } = get()
      const code = encodeCompany({ mark, companyName, ipLimit, slots })
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
      set({ ...defaultState(), ...imported, companyId: randomUUID(), viewingShare: true, _savedSnapshot: JSON.stringify(imported) })
      get()._toast('Company loaded from shared link!')
      return true
    },
    doImport(raw) {
      const code = raw.trim().replace(/^.*#/, '')
      const imported = decodeCompany(code)
      if (!imported) { get()._toast('Invalid import code'); return false }
      // New id: an import is a new company, never an overwrite of the one being edited
      set({ ...imported, companyId: randomUUID(), viewingShare: false, _savedSnapshot: JSON.stringify(imported) })
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
      set({ ...result, companyId: randomUUID() })
      get()._autoDraft()
    },
    applyQuizCompany({ mark, companyName, warriors }) {
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

      set({ 
        mark, 
        companyName, 
        slots,
        companyId: randomUUID() 
      })
      get()._autoDraft()
    },
    rollRandom({ warriors = 3, ipLimit = 3 } = {}) {
      const result = get().buildRandomResult({ warriors, ipLimit })
      get().applyRandomResult(result)
    },

    // ── CAMPAIGN ───────────────────────────────────────────────────────────────
    setCompanyMode(mode) {
      set({ companyMode: mode, ipLimit: mode === 'campaign' ? 0 : 3 })
      get()._autoDraft()
    },
    awardEndOfGame({ survivorIndices, ipAllocations = {}, newCaptainIndex, retreat = false }) {
      const { slots, campaignGame } = get()
      const newSlots = slots.map((slot, i) => {
        if (!slot.type) return slot
        const survived = survivorIndices.includes(i)
        if (!survived) {
          // Warrior fell — replace with a fresh empty slot
          return emptySlot(i, false)
        }
        // Survived — add manually allocated IPs
        const add = ipAllocations[i] || 0
        // Handle captain promotion: override isCaptain on promoted warrior
        let isCaptain = slot.isCaptain
        if (newCaptainIndex != null) {
          isCaptain = (i === newCaptainIndex)
        }
        return { ...slot, earnedIP: (slot.earnedIP || 0) + add, isCaptain }
      })
      const nextGame = campaignGame + 1
      set({ slots: newSlots, campaignGame: nextGame })
      get()._autoDraft()
      const totalIP = Object.values(ipAllocations).reduce((sum, n) => sum + n, 0)
      get()._toast(retreat ? `Game ${nextGame} complete — Coward!` : totalIP > 0 ? `Game ${nextGame} complete — IP awarded!` : `Game ${nextGame} complete — Coward!`)
    },
    addStatImprove(slotIndex, stat) {
      const slots = [...get().slots]
      const slot = { ...slots[slotIndex] }
      if (slot.statImproves?.includes(stat)) return
      const statKey = `stat_${slot.statImproves?.length || 0}`
      slot.statImproves = [...(slot.statImproves || []), stat]
      slot.ip = [...(slot.ip || []), statKey]
      slots[slotIndex] = slot
      set({ slots })
      get()._autoDraft()
    },
    removeStatImprove(slotIndex, stat) {
      const slots = [...get().slots]
      const slot = { ...slots[slotIndex] }
      const statIdx = slot.statImproves?.indexOf(stat)
      if (statIdx < 0) return
      const newImproves = slot.statImproves.filter(s => s !== stat)
      const otherIps = (slot.ip || []).filter(id => !id.startsWith('stat_'))
      const newStatIps = newImproves.map((_, i) => `stat_${i}`)
      slot.statImproves = newImproves
      slot.ip = [...otherIps, ...newStatIps]
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
    // Called after every edit: queue a cloud save (signed-in users only).
    _autoDraft() {
      if (!getUser() || get().viewingShare) return
      const snapshot = snapshotCompany(get())
      if (!snapshot.slots.some(s => s.type)) return // don't save empty companies
      const saves = get().saves
      const existing = saves.findIndex(s => s.companyId === snapshot.companyId)
      const entry = { ...snapshot, savedAt: Date.now() }
      set({ saves: existing >= 0 ? saves.map((s, i) => i === existing ? entry : s) : [entry, ...saves] })
      saver.schedule(snapshot)
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
