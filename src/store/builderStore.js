import { create } from 'zustand'
import { WARRIORS, MARKS, STAT_IMPROVEMENT, IP_OPTIONS } from '../data/warriors'
import { WEAPONS, WEAPON_NAMES, CLIMBING_ITEMS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { _ENC } from '../data/encoding'

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
  // fixedWeapon warriors have exactly one option
  if (wdata.fixedWeapon) return [wdata.fixedWeapon]
  // Use the explicit allowedWeapons whitelist; Shield is always off-hand only, never primary
  return (wdata.allowedWeapons || WEAPON_NAMES).filter(w => w !== 'Shield')
}

export function getSecondWeaponOptions(wdata, primaryWeapon) {
  if (!wdata || !primaryWeapon) return []
  const twoHanded = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']
  if (twoHanded.includes(primaryWeapon)) return []
  // Polearm (one-handed) is always paired with Shield only
  if (primaryWeapon === 'Polearm (one-handed)') return ['Shield']
  const allowed = getAllowedWeapons(wdata)
  // Light Weapon primary: can dual wield OR pair with a Shield
  if (primaryWeapon === 'Light Weapon') return allowed.filter(w => w === 'Light Weapon' || w === 'Shield')
  // Other one-handed primaries: Light Weapon or Shield offhand
  return allowed.filter(w => ['Light Weapon', 'Shield'].includes(w))
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

function generateCompanyName() {
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

function defaultState() {
  return {
    companyId: crypto.randomUUID(),
    mark: MARKS[0].name,
    companyName: '',
    ipLimit: 3,
    slots: Array.from({ length: 3 }, (_, i) => ({
      type: null,
      weapon1: null,
      weapon2: null,
      consumable: null,
      climbing: null,
      ip: [],
      isCaptain: i === 0,
      notes: [],
    })),
  }
}

// ── ENCODE / DECODE ───────────────────────────────────────────────────────────

const _ENC_MAP = _ENC
const _DEC_MAP = Object.fromEntries(Object.entries(_ENC_MAP).map(([k, v]) => [v, k]))
const ALL_WARRIORS = Object.keys(WARRIORS)
const ALL_CONSUMABLES = CONSUMABLE_NAMES
const ALL_MARKS = MARKS.map(m => m.name)
const ALL_WEAPONS = WEAPON_NAMES
const ALL_IP_IDS = IP_OPTIONS.map(o => o.id)

function _idx(arr, val) {
  const i = arr.indexOf(val)
  return i < 0 ? 0 : i
}

export function encodeCompany(s) {
  const parts = [
    _idx(ALL_MARKS, s.mark).toString(36),
    encodeURIComponent(s.companyName || ''),
    s.ipLimit.toString(36),
  ]
  s.slots.forEach(slot => {
    if (!slot.type) { parts.push('_'); return }
    const wIdx = _idx(ALL_WARRIORS, slot.type).toString(36)
    const w1Idx = _idx(WEAPON_NAMES, slot.weapon1).toString(36)
    const w2Idx = slot.weapon2 ? _idx(WEAPON_NAMES, slot.weapon2).toString(36) : '-'
    const cIdx = slot.consumable ? _idx(ALL_CONSUMABLES, slot.consumable).toString(36) : '-'
    const clIdx = slot.climbing ? _idx(Object.keys(CLIMBING_ITEMS), slot.climbing).toString(36) : '-'
    const ipStr = slot.ip.map(id => _idx(ALL_IP_IDS, id).toString(36)).join('') || '-'
    const cap = slot.isCaptain ? '1' : '0'
    const notesEnc = (slot.notes && slot.notes.length)
      ? encodeURIComponent(JSON.stringify(slot.notes))
      : '-'
    parts.push([wIdx, w1Idx, w2Idx, cIdx, clIdx, ipStr, cap, notesEnc].join(':'))
  })
  return btoa(parts.join('|')).replace(/=/g, '')
}

export function decodeCompany(code) {
  try {
    // Support both base64 (new) and raw pipe-delimited (legacy) formats
    let raw = code
    try {
      const padded = code + '=='.slice(0, (4 - code.length % 4) % 4)
      const decoded = atob(padded)
      if (decoded.includes('|')) raw = decoded
    } catch {}
    const parts = raw.split('|')
    const mark = ALL_MARKS[parseInt(parts[0], 36)] || ALL_MARKS[0]
    const companyName = decodeURIComponent(parts[1] || '')
    const ipLimit = parseInt(parts[2], 36) || 3
    const slots = Array.from({ length: 3 }, (_, i) => {
      const raw = parts[3 + i]
      if (!raw || raw === '_') return { type: null, weapon1: null, weapon2: null, consumable: null, climbing: null, ip: [], isCaptain: i === 0, notes: [] }
      const [wIdx, w1Idx, w2Idx, cIdx, clIdx, ipStr, cap, notesEnc] = raw.split(':')
      const type = ALL_WARRIORS[parseInt(wIdx, 36)] || null
      const weapon1 = WEAPON_NAMES[parseInt(w1Idx, 36)] || null
      const weapon2 = w2Idx === '-' ? null : WEAPON_NAMES[parseInt(w2Idx, 36)] || null
      const consumable = cIdx === '-' ? null : ALL_CONSUMABLES[parseInt(cIdx, 36)] || null
      const climbing = clIdx === '-' ? null : Object.keys(CLIMBING_ITEMS)[parseInt(clIdx, 36)] || null
      const ip = ipStr === '-' ? [] : ipStr.split('').map(c => ALL_IP_IDS[parseInt(c, 36)]).filter(Boolean)
      let notes = []
      if (notesEnc && notesEnc !== '-') {
        try {
          const dec = decodeURIComponent(notesEnc)
          notes = dec.startsWith('[') ? JSON.parse(dec) : [{ title: '', body: dec }]
        } catch {}
      }
      return { type, weapon1, weapon2, consumable, climbing, ip, isCaptain: cap === '1', notes }
    })
    return { mark, companyName, ipLimit, slots }
  } catch (e) {
    return null
  }
}

// ── SAVES ─────────────────────────────────────────────────────────────────────

function getSaves() {
  try { return JSON.parse(localStorage.getItem('doom_saves') || '[]') } catch { return [] }
}
function setSaves(saves) {
  localStorage.setItem('doom_saves', JSON.stringify(saves))
}

// ── STORE ─────────────────────────────────────────────────────────────────────

export const useBuilderStore = create((set, get) => {
  // Load initial state from URL hash or draft
  const loadInitial = () => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const imported = decodeCompany(hash)
      if (imported) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
        return { ...defaultState(), ...imported, _fromShare: true }
      }
    }
    try {
      const draft = localStorage.getItem('doom_draft')
      if (draft) {
        const parsed = JSON.parse(draft)
        if (Array.isArray(parsed.slots)) parsed.slots = parsed.slots.slice(0, 3)
        return { ...defaultState(), ...parsed }
      }
    } catch {}
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
    const imported = decodeCompany(hash)
    if (imported) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
      set({ ...imported, _savedSnapshot: JSON.stringify(imported) })
      get()._toast('Company loaded from shared link!')
    }
  })

  return {
    // ── STATE ──────────────────────────────────────────────────────────────────
    ...initial,
    _savedSnapshot: JSON.stringify(initial),
    toast: null,
    validationMsg: null,
    shareCode: null,
    importOpen: false,
    saves: getSaves(),

    // ── COMPUTED ───────────────────────────────────────────────────────────────
    getCompanyIP() {
      return get().ipLimit
    },
    getTotalIPSpent() {
      return get().slots.reduce((sum, s) => sum + (s.ip?.length || 0), 0)
    },
    isDirty() {
      const { mark, companyName, ipLimit, slots } = get()
      return JSON.stringify({ mark, companyName, ipLimit, slots }) !== get()._savedSnapshot
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
      slots[slotIndex] = {
        ...slots[slotIndex],
        type,
        weapon1: firstWeapon,
        weapon2: fixedShield ? 'Shield' : null,
        consumable: null,
        climbing: null,
        ip: [],
      }
      set({ slots })
      get()._autoDraft()
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
              const totalSpent = slots.reduce((sum, s) => sum + (s.ip?.length || 0), 0)
              if (totalSpent < get().ipLimit) {
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
    toggleIP(slotIndex, optId, checked) {
      const slots = [...get().slots]
      const slot = { ...slots[slotIndex] }
      const totalSpent = get().getTotalIPSpent()
      const ipLimit = get().ipLimit

      if (checked) {
        if (totalSpent >= ipLimit) return // pool full
        slot.ip = [...(slot.ip || []), optId]
      } else {
        slot.ip = (slot.ip || []).filter(id => id !== optId)
      }
      slots[slotIndex] = slot
      set({ slots })
      get()._autoDraft()
    },
    setCaptain(slotIndex) {
      const slots = get().slots.map((s, i) => ({ ...s, isCaptain: i === slotIndex }))
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
    saveCompany() {
      const errors = get()._validate()
      if (errors) { set({ validationMsg: errors }); return false }
      const saves = getSaves()
      const { mark, companyName, ipLimit, slots, companyId } = get()
      const saveData = { mark, companyName, ipLimit, slots, companyId, savedAt: Date.now() }
      const existingIndex = saves.findIndex(s => s.companyId === companyId)
      if (existingIndex >= 0) {
        saves[existingIndex] = saveData
      } else {
        saves.unshift(saveData)
        if (saves.length > 10) saves.pop()
      }
      setSaves(saves)
      set({ saves, _savedSnapshot: JSON.stringify({ mark, companyName, ipLimit, slots }) })
      get()._toast('Company saved.')
      return true
    },
    loadCompany(index) {
      const saves = getSaves()
      const save = saves[index]
      if (!save) return
      const { mark, companyName, ipLimit, slots, companyId } = save
      set({ mark, companyName, ipLimit, slots, companyId: companyId || crypto.randomUUID(), _savedSnapshot: JSON.stringify({ mark, companyName, ipLimit, slots }) })
      get()._toast('Company loaded!')
    },
    deleteCompany(index) {
      const saves = getSaves()
      saves.splice(index, 1)
      setSaves(saves)
      set({ saves })
    },
    clearBuilder() {
      const fresh = defaultState()
      const { companyId, ...snapshot } = fresh
      set({ ...fresh, _savedSnapshot: JSON.stringify(snapshot) })
      localStorage.removeItem('doom_draft')
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
    doImport(raw) {
      const code = raw.trim().replace(/^.*#/, '')
      const imported = decodeCompany(code)
      if (!imported) { get()._toast('Invalid import code'); return false }
      set({ ...imported, _savedSnapshot: JSON.stringify(imported) })
      get()._toast('Company imported!')
      set({ importOpen: false })
      return true
    },

    // ── RANDOM ────────────────────────────────────────────────────────────────
    rollRandom() {
      const allTypes = Object.keys(WARRIORS)
      const shuffled = [...allTypes].sort(() => Math.random() - 0.5)
      const picked = shuffled.slice(0, 3)
      const mark = MARKS[Math.floor(Math.random() * MARKS.length)].name
      const ipLimit = 3
      let ipPool = ipLimit

      const slots = Array.from({ length: 3 }, (_, i) => {
        const type = picked[i] || null
        if (!type) return { type: null, weapon1: null, weapon2: null, consumable: null, climbing: null, ip: [], isCaptain: i === 0, notes: [] }
        const wdata = WARRIORS[type]
        const allowed = getAllowedWeapons(wdata)
        const twoHanded = ['Heavy Weapon', 'Polearm (two-handed)', 'Bow', 'Crossbow']

        // Use fixed weapon if warrior requires it, otherwise pick randomly
        // Exclude Polearm (one-handed) if pool can't afford the mandatory Shield IP
        const affordableWeapons = allowed.filter(w => {
          if (w === 'Polearm (one-handed)' && !wdata.fixedShield && ipPool < 1) return false
          return true
        })
        const weapon1 = wdata.fixedWeapon ||
          affordableWeapons[Math.floor(Math.random() * (affordableWeapons.length || 1))] ||
          allowed[0]

        const ip = []
        let weapon2 = null

        if (wdata.fixedShield) {
          // Fixed shield warriors (Knight, Hedge Knight) get Shield free
          weapon2 = 'Shield'
        } else if (weapon1 === 'Polearm (one-handed)') {
          // Mandatory Shield costs 1 IP
          weapon2 = 'Shield'
          ip.push('weapon2')
          ipPool--
        } else if (!twoHanded.includes(weapon1)) {
          // Optional second weapon — random chance if pool allows
          const w2opts = getSecondWeaponOptions(wdata, weapon1)
          if (w2opts.length && Math.random() > 0.5 && ipPool > 0) {
            weapon2 = w2opts[Math.floor(Math.random() * w2opts.length)]
            ip.push('weapon2')
            ipPool--
          }
        }

        // Random remaining IP upgrades (climbing, consumable, stat)
        const remainingOpts = IP_OPTIONS.filter(o => o.id !== 'weapon2')
        for (const opt of remainingOpts.sort(() => Math.random() - 0.5)) {
          if (ipPool <= 0) break
          if (Math.random() > 0.6) { ip.push(opt.id); ipPool-- }
        }

        return { type, weapon1, weapon2, consumable: null, climbing: null, ip, isCaptain: i === 0, notes: [] }
      })
      set({ mark, companyName: generateCompanyName(), ipLimit, slots })
      get()._autoDraft()
    },

    // ── INTERNAL ──────────────────────────────────────────────────────────────
    _toast(msg) {
      set({ toast: msg })
      setTimeout(() => set({ toast: null }), 2500)
    },
    _autoDraft() {
      const { mark, companyName, ipLimit, slots, companyId } = get()
      try { localStorage.setItem('doom_draft', JSON.stringify({ mark, companyName, ipLimit, slots, companyId })) } catch {}
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
