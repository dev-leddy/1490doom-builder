// ── Discord Image Roster ───────────────────────────────────────────────────────
// Compact list-style image export, similar to Star Wars Legion list builder.
// Portrait + name on one line, stats as text, equipment + ability pills below.

import { forwardRef, useMemo } from 'react'
import { WARRIORS, MARKS_MAP } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS } from '../data/weapons'

// ── Stat helpers ──────────────────────────────────────────────────────────────

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return `${parseInt(base) - 1}+`
  return parseInt(base) + 1
}

function debuffStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return `${parseInt(base) + 1}+`
  return Math.max(0, parseInt(base) - 1)
}

const STAT_KEYS = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  ash:       '#080808',
  fog:       '#111111',
  dim:       '#252525',
  bone:      '#dcdcdc',
  parchment: '#ffffff',
  mist:      '#555555',
  blood:     '#be4127',
  green:     '#4a9a4a',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    width: '420px',
    background: C.ash,
    padding: '14px 14px 18px',
    fontFamily: "'Oswald', 'Arial Narrow', Arial, sans-serif",
    color: C.bone,
    boxSizing: 'border-box',
  },

  // Header
  pageHeader: {
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${C.dim}`,
  },
  companyName: {
    fontFamily: "'Caslon Antique', 'Palatino Linotype', Georgia, serif",
    fontSize: '18px',
    fontWeight: '700',
    color: C.parchment,
    lineHeight: '1',
    marginBottom: '4px',
  },
  markName: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: C.blood,
    marginBottom: '2px',
  },
  markDesc: {
    fontSize: '10px',
    color: C.mist,
    lineHeight: '1.4',
  },

  // Warrior rows
  warriors: {
    display: 'flex',
    flexDirection: 'column',
  },
  warriorRow: {
    padding: '2px 0',
  },

  // Name line: name + captain badge
  nameLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginBottom: '4px',
  },
  warriorName: {
    fontFamily: "'Caslon Antique', 'Palatino Linotype', Georgia, serif",
    fontSize: '15px',
    fontWeight: '700',
    color: C.parchment,
    lineHeight: '1',
    flex: 1,
  },
  captainBadge: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '15px',
    fontWeight: '700',
    color: C.blood,
    flexShrink: 0,
  },
  classIpLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  customSubname: {
    fontSize: '9px',
    color: C.mist,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  ipLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '9px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.blood,
  },
  ipLabelZero: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '9px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.mist,
  },

  // Stats: single text line with · separators
  statsLine: {
    display: 'flex',
    gap: '3px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  statChunk: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.05em',
    color: C.bone,
    whiteSpace: 'nowrap',
  },
  statChunkModified: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.05em',
    color: C.green,
    textDecoration: 'underline',
    textDecorationSkipInk: 'none',
    whiteSpace: 'nowrap',
  },
  statChunkDebuffed: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.05em',
    color: C.blood,
    whiteSpace: 'nowrap',
  },
  statSep: {
    fontSize: '9px',
    color: C.mist,
  },

  // Pills row — left-aligned, pills centered internally
  pillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '3px',
    marginBottom: '1px',
    marginTop: '2px',
    justifyContent: 'flex-start',
    width: '100%'
  },
  pill: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '9px',
    lineHeight: '1.2',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: C.bone,
    background: C.fog,
    border: `1px solid ${C.dim}`,
    padding: '3px 6px 11px',
    width: '80px'

  },
  pillIP: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '9px',
    lineHeight: '1.2',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: C.green,
    background: C.fog,
    border: `1px solid ${C.dim}`,
    padding: '3px 6px 11px',
    width: '80px',
  },
  pillTopRow: {
    whiteSpace: 'nowrap',
  },
  pillTopRowIP: {
    whiteSpace: 'nowrap',
    textDecoration: 'underline',
    textDecorationSkipInk: 'none',
  },
  pillStat: {
    fontSize: '8px',
    color: C.mist,
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    marginTop: '1px',
    textDecoration: 'none',
  },
  abilityPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '8px',
    lineHeight: '1.2',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.mist,
    border: `1px solid ${C.dim}`,
    padding: '3px 6px 11px',
    whiteSpace: 'nowrap',
    background: 'transparent',
  },

  // Website URL line
  siteUrl: {
    marginTop: '10px',
    fontSize: '8px',
    color: C.mist,
    letterSpacing: '0.06em',
    textAlign: 'center',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

const DiscordImageRoster = forwardRef(function DiscordImageRoster({ state }, ref) {
  const { companyName, mark, slots = [] } = state

  const markName = (mark && typeof mark === 'object') ? mark.name : mark

  const filledSlots = useMemo(() => slots.filter(s => s?.type), [slots])
  const captainIndex = useMemo(() => {
    const idx = filledSlots.findIndex(s => s?.isCaptain)
    return idx >= 0 ? idx : 0
  }, [filledSlots])
  const orderedSlots = useMemo(() => {
    if (!filledSlots.length) return []
    return [filledSlots[captainIndex], ...filledSlots.filter((_, i) => i !== captainIndex)]
  }, [filledSlots, captainIndex])

  return (
    <div ref={ref} style={S.page}>

      {/* ── Header ── */}
      <div style={S.pageHeader}>
        <div style={S.companyName}>{companyName || 'Unnamed Company'}</div>
        {markName && (
          <>
            <div style={S.markName}>{markName}</div>
            {MARKS_MAP[markName] && <div style={S.markDesc}>{MARKS_MAP[markName]}</div>}
          </>
        )}
      </div>

      {/* ── Warriors ── */}
      <div style={S.warriors}>
        {orderedSlots.map((slot, idx) => {
          const wdata = WARRIORS[slot.type]
          if (!wdata) return null
          const isCaptain = idx === 0 && filledSlots[captainIndex] === slot
          const spent = slot.ip || []

          const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
          const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0

          // Build stat entries
          const stats = STAT_KEYS.map(s => {
            let base = wdata.stats[s]
            if (s === 'ATK') base = parseInt(base) + dualWieldBonus
            const improved = (slot.statImproves?.includes(s)) || (spent.includes('stat') && slot.statImprove === s)
            const debuffed = slot.weapon1 === 'Polearm (one-handed)' && s === 'COM'
            const both = improved && debuffed
            let val = base
            if (improved && !both) val = improveStatDisplay(val, s)
            else if (debuffed && !both) val = debuffStatDisplay(val, s)
            const isModified = (improved && !both) || (s === 'ATK' && dualWieldBonus > 0 && !both)
            return { s, val, isModified, isDebuffed: debuffed && !both }
          })

          // Build equipment pills
          const equipPills = []
          for (const [weaponKey, isIP] of [[slot.weapon1, false], [slot.weapon2, spent.includes('weapon2')]]) {
            if (!weaponKey) continue
            const w = WEAPONS[weaponKey]
            const statParts = []
            if (w?.damage > 0) statParts.push(`${w.damage} dmg`)
            if (w?.range && w.range !== '—' && w.range !== 'Base') statParts.push(w.range)
            equipPills.push({ key: weaponKey + (isIP ? '-ip' : ''), name: weaponKey, stat: statParts.join(' · '), isIP })
          }
          if (slot.climbing && slot.climbing !== 'None') {
            const c = CLIMBING_ITEMS[slot.climbing]
            equipPills.push({ key: 'climb', name: slot.climbing, stat: c ? `HT ${c.height}` : null, isIP: spent.includes('climbing') })
          }
          if (slot.consumable && slot.consumable !== 'None') {
            equipPills.push({ key: 'consumable', name: slot.consumable, stat: null, isIP: spent.includes('consumable') })
          }

          // Build abilities — track whether each comes from class or equipment/upgrade
          const abilities = (wdata.abilities || []).map(a => ({ name: a.name.toUpperCase(), fromEquip: false }))
          for (const wKey of [slot.weapon1, slot.weapon2]) {
            if (!wKey) continue
            const w = WEAPONS[wKey]
            if (w?.abilityName) abilities.push({ name: w.abilityName.toUpperCase(), fromEquip: true })
          }

          const displayName = slot.customName || slot.type

          return (
            <div key={idx} style={S.warriorRow}>

              {/* Name row */}
              <div style={S.nameLine}>
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px' }}>
                  {isCaptain && <span style={S.captainBadge}>★</span>}
                  <span style={S.warriorName}>{displayName}</span>
                </span>
              </div>

              {/* Class + IP line — always shown */}
              <div style={S.classIpLine}>
                {slot.customName && <span style={S.customSubname}>{slot.type}</span>}
                <span style={spent.length > 0 ? S.ipLabel : S.ipLabelZero}>
                  {spent.length} IP Upgrade{spent.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Stats line */}
              <div style={S.statsLine}>
                {stats.map((st, i) => (
                  <span key={st.s} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {i > 0 && <span style={S.statSep}>·</span>}
                    <span style={st.isModified ? S.statChunkModified : st.isDebuffed ? S.statChunkDebuffed : S.statChunk}>
                      {`${st.s} ${st.val}`}
                    </span>
                  </span>
                ))}
              </div>

              {/* Equipment pills */}
              {equipPills.length > 0 && (
                <div style={S.pillsRow}>
                  {equipPills.map(pill => (
                    <span key={pill.key} style={pill.isIP ? S.pillIP : S.pill}>
                      <span style={pill.isIP ? S.pillTopRowIP : S.pillTopRow}>{pill.name}</span>
                      {pill.stat && <span style={S.pillStat}>{pill.stat}</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* Ability pills */}
              {abilities.length > 0 && (
                <div style={S.pillsRow}>
                  {abilities.map(ability => (
                    <span key={ability.name} style={S.abilityPill}>
                      {ability.fromEquip ? `*${ability.name}` : ability.name}
                    </span>
                  ))}
                </div>
              )}

            </div>
          )
        })}
      </div>

      <div style={S.siteUrl}>1490doomcompanybuilder.com</div>

    </div>
  )
})

export default DiscordImageRoster
