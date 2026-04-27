// ── Company URL Encoding / Decoding ───────────────────────────────────────────
// Pure functions — no Zustand dependency. Used by builderStore and App.jsx.

import { WARRIORS, MARKS, STAT_IMPROVEMENT, IP_OPTIONS } from '../data/warriors'
import { WEAPONS, WEAPON_NAMES, CLIMBING_ITEMS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { _ENC } from '../data/encoding'

const _ENC_MAP = _ENC
const _DEC_MAP = Object.fromEntries(Object.entries(_ENC_MAP).map(([k, v]) => [v, k]))
const ALL_WARRIORS = Object.keys(WARRIORS)
const ALL_CONSUMABLES = CONSUMABLE_NAMES
const ALL_MARKS = MARKS.map(m => m.name)
const ALL_WEAPONS = WEAPON_NAMES
const ALL_IP_IDS = IP_OPTIONS.map(o => o.id)
const ALL_STAT_KEYS = Object.keys(STAT_IMPROVEMENT)
// Campaign IP IDs extend standard with per-stat slots (stat_0..stat_N)
const CAMP_IP_IDS = ['weapon2', 'climbing', 'consumable', ...ALL_STAT_KEYS.map((_, i) => `stat_${i}`)]

function _idx(arr, val) {
  const i = arr.indexOf(val)
  return i < 0 ? 0 : i
}

function emptySlot(i) {
  return {
    type: null, weapon1: null, weapon2: null, consumable: null,
    climbing: null, ip: [], isCaptain: i === 0,
    notes: [], customName: null,
    earnedIP: 0, statImproves: [],
  }
}

export function encodeCompany(s) {
  const isCampaign = s.companyMode === 'campaign'
  const ipIds = isCampaign ? CAMP_IP_IDS : ALL_IP_IDS
  const parts = [
    _idx(ALL_MARKS, s.mark).toString(36),
    encodeURIComponent(s.companyName || ''),
    s.ipLimit.toString(36),
  ]
  s.slots.forEach(slot => {
    if (!slot.type) { parts.push('_'); return }
    const wIdx   = _idx(ALL_WARRIORS, slot.type).toString(36)
    const w1Idx  = _idx(WEAPON_NAMES, slot.weapon1).toString(36)
    const w2Idx  = slot.weapon2 ? _idx(WEAPON_NAMES, slot.weapon2).toString(36) : '-'
    const cIdx   = slot.consumable ? _idx(ALL_CONSUMABLES, slot.consumable).toString(36) : '-'
    const clIdx  = slot.climbing ? _idx(Object.keys(CLIMBING_ITEMS), slot.climbing).toString(36) : '-'
    const ipStr  = slot.ip.map(id => _idx(ipIds, id).toString(36)).join('') || '-'
    const cap    = slot.isCaptain ? '1' : '0'
    const notesEnc = (slot.notes && slot.notes.length) ? encodeURIComponent(JSON.stringify(slot.notes)) : '-'
    const nameEnc  = slot.customName ? encodeURIComponent(slot.customName) : '-'
    const earnedEnc   = isCampaign ? (slot.earnedIP || 0).toString(36) : '-'
    const statImpsEnc = isCampaign
      ? (slot.statImproves?.length ? slot.statImproves.map(st => _idx(ALL_STAT_KEYS, st).toString(36)).join('') : '-')
      : (slot.statImprove ? _idx(ALL_STAT_KEYS, slot.statImprove).toString(36) : '-')
    parts.push([wIdx, w1Idx, w2Idx, cIdx, clIdx, ipStr, cap, notesEnc, nameEnc, earnedEnc, statImpsEnc].join(':'))
  })
  const encoded = btoa(parts.join('|')).replace(/=/g, '')
  return isCampaign ? `v2c_${s.campaignGame || 0}_${encoded}` : encoded
}

export function decodeCompany(code) {
  try {
    let isCampaign = false
    let campaignGame = 0
    let rawCode = code
    if (code.startsWith('v2c_')) {
      const under = code.indexOf('_', 4)
      campaignGame = parseInt(code.slice(4, under)) || 0
      rawCode = code.slice(under + 1)
      isCampaign = true
    }
    const ipIds = isCampaign ? CAMP_IP_IDS : ALL_IP_IDS

    let raw = rawCode
    try {
      const padded = rawCode + '=='.slice(0, (4 - rawCode.length % 4) % 4)
      const decoded = atob(padded)
      if (decoded.includes('|')) raw = decoded
    } catch {}

    const parts = raw.split('|')
    const mark       = ALL_MARKS[parseInt(parts[0], 36)] || ALL_MARKS[0]
    const companyName = decodeURIComponent(parts[1] || '')
    const ipLimit    = parseInt(parts[2], 36) || (isCampaign ? 0 : 3)
    const slots = Array.from({ length: 3 }, (_, i) => {
      const slotRaw = parts[3 + i]
      if (!slotRaw || slotRaw === '_') return emptySlot(i)
      const [wIdx, w1Idx, w2Idx, cIdx, clIdx, ipStr, cap, notesEnc, nameEnc, earnedEnc, statImpsEnc] = slotRaw.split(':')
      const type      = ALL_WARRIORS[parseInt(wIdx, 36)] || null
      const weapon1   = WEAPON_NAMES[parseInt(w1Idx, 36)] || null
      const weapon2   = w2Idx === '-' ? null : WEAPON_NAMES[parseInt(w2Idx, 36)] || null
      const consumable = cIdx === '-' ? null : ALL_CONSUMABLES[parseInt(cIdx, 36)] || null
      const climbing  = clIdx === '-' ? null : Object.keys(CLIMBING_ITEMS)[parseInt(clIdx, 36)] || null
      const ip        = ipStr === '-' ? [] : ipStr.split('').map(c => ipIds[parseInt(c, 36)]).filter(Boolean)
      const earnedIP  = earnedEnc && earnedEnc !== '-' ? parseInt(earnedEnc, 36) : 0
      const statImproves = isCampaign && statImpsEnc && statImpsEnc !== '-'
        ? statImpsEnc.split('').map(c => ALL_STAT_KEYS[parseInt(c, 36)]).filter(Boolean)
        : []
      const statImprove = !isCampaign && statImpsEnc && statImpsEnc !== '-'
        ? (ALL_STAT_KEYS[parseInt(statImpsEnc[0], 36)] || null)
        : null
      let notes = []
      if (notesEnc && notesEnc !== '-') {
        try {
          const dec = decodeURIComponent(notesEnc)
          notes = dec.startsWith('[') ? JSON.parse(dec) : [{ title: '', body: dec }]
        } catch {}
      }
      const customName = nameEnc && nameEnc !== '-' ? decodeURIComponent(nameEnc) : null
      return { type, weapon1, weapon2, consumable, climbing, ip, isCaptain: cap === '1', notes, customName, earnedIP, statImproves, statImprove }
    })
    return { mark, companyName, ipLimit, companyMode: isCampaign ? 'campaign' : 'standard', campaignGame, slots }
  } catch (e) {
    return null
  }
}
