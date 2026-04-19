// ── Discord Image Roster ───────────────────────────────────────────────────────
// Renders an off-screen dark-themed roster card for html2canvas capture.
// Similar to PrintRoster but: dark theme, ability names only (no descriptions),
// no tracking panel, no quick reference section.

import { forwardRef, useMemo } from 'react'
import { WARRIORS, MARKS_MAP } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS } from '../data/weapons'
import { WARRIOR_IMAGES, MARK_IMAGES, ITEM_ICONS } from '../data/images'

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

// ── Styles (inline — avoids CSS var / font issues with html2canvas) ───────────

const C = {
  bg:        '#1a1614',
  card:      '#231f1c',
  cardBorder:'#3a3330',
  captain:   '#8b1a1a',
  header:    '#2a2522',
  label:     '#8a7f78',
  text:      '#e8ddd4',
  textMuted: '#9a8f88',
  gold:      '#c8a96e',
  improved:  '#c8a96e',
  debuffed:  '#c0392b',
  pill:      '#2e2926',
  pillBorder:'#4a4340',
  ipMark:    '#c8a96e',
}

const S = {
  page: {
    width: '420px',
    background: C.bg,
    padding: '24px',
    fontFamily: "'Oswald', 'Arial Narrow', Arial, sans-serif",
    color: C.text,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2px solid ${C.cardBorder}`,
    paddingBottom: '16px',
    marginBottom: '20px',
    gap: '16px',
  },
  companyName: {
    fontSize: '26px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    lineHeight: '1',
    color: C.text,
  },
  companySub: {
    fontSize: '10px',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: C.label,
    marginTop: '4px',
  },
  markWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderLeft: `1px solid ${C.cardBorder}`,
    paddingLeft: '16px',
    flexShrink: 0,
  },
  markImg: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'center',
    border: `1px solid ${C.cardBorder}`,
    filter: 'grayscale(20%) contrast(1.1)',
    flexShrink: 0,
  },
  markLabel: {
    fontSize: '9px',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: C.label,
    lineHeight: '1',
    marginBottom: '3px',
  },
  markName: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: C.text,
  },
  warriors: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardCaptain: {
    background: C.card,
    border: `2px solid ${C.captain}`,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  portrait: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'top center',
    border: `1px solid ${C.cardBorder}`,
    flexShrink: 0,
    filter: 'grayscale(20%) contrast(1.1)',
  },
  portraitCaptain: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'top center',
    border: `1.5px solid ${C.captain}`,
    flexShrink: 0,
    filter: 'grayscale(20%) contrast(1.1)',
  },
  warriorName: {
    fontSize: '15px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    lineHeight: '1',
    color: C.text,
  },
  customName: {
    fontSize: '11px',
    color: C.label,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  captainBadge: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    background: C.captain,
    color: '#fff',
    padding: '2px 5px',
    display: 'inline-block',
    marginTop: '3px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '3px',
  },
  statBox: {
    background: C.bg,
    border: `1px solid ${C.cardBorder}`,
    textAlign: 'center',
    padding: '3px 2px',
  },
  statBoxImproved: {
    background: C.bg,
    border: `1px solid ${C.gold}`,
    textAlign: 'center',
    padding: '3px 2px',
  },
  statLbl: {
    fontSize: '8px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: C.label,
    display: 'block',
    lineHeight: '1',
  },
  statVal: {
    fontSize: '14px',
    fontWeight: '700',
    display: 'block',
    lineHeight: '1.2',
    color: C.text,
  },
  statValImproved: {
    fontSize: '14px',
    fontWeight: '700',
    display: 'block',
    lineHeight: '1.2',
    color: C.improved,
    textDecoration: 'underline',
  },
  statValDebuffed: {
    fontSize: '14px',
    fontWeight: '700',
    display: 'block',
    lineHeight: '1.2',
    color: C.debuffed,
  },
  sectionLabel: {
    fontSize: '8px',
    fontWeight: '700',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: C.label,
    marginBottom: '4px',
  },
  equipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '3px',
  },
  equipIcon: {
    width: '12px',
    height: '12px',
    flexShrink: 0,
    filter: 'brightness(0) invert(0.55)',
  },
  equipName: {
    fontSize: '11px',
    color: C.text,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  equipNameIP: {
    fontSize: '11px',
    color: C.ipMark,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textDecoration: 'underline',
  },
  equipPill: {
    fontSize: '9px',
    border: `1px solid ${C.pillBorder}`,
    background: C.pill,
    padding: '1px 4px',
    color: C.textMuted,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  abilitiesWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  abilityTag: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    border: `1px solid ${C.cardBorder}`,
    padding: '2px 6px',
    color: C.textMuted,
    whiteSpace: 'nowrap',
  },
  footer: {
    marginTop: '16px',
    paddingTop: '10px',
    borderTop: `1px solid ${C.cardBorder}`,
    fontSize: '9px',
    color: C.label,
    letterSpacing: '0.05em',
    textAlign: 'center',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

const DiscordImageRoster = forwardRef(function DiscordImageRoster({ state }, ref) {
  const { companyName, mark, slots = [] } = state

  const markName = (mark && typeof mark === 'object') ? mark.name : mark
  const markImgSrc = markName ? (MARK_IMAGES[markName] || '') : ''
  const markRule = markName ? (MARKS_MAP[markName] || '') : ''

  const filledSlots = useMemo(() => slots.filter(s => s?.type), [slots])

  const captainIndex = useMemo(() => {
    const idx = filledSlots.findIndex(s => s?.isCaptain)
    return idx >= 0 ? idx : 0
  }, [filledSlots])

  const orderedSlots = useMemo(() => {
    if (!filledSlots.length) return []
    return [
      filledSlots[captainIndex],
      ...filledSlots.filter((_, i) => i !== captainIndex),
    ]
  }, [filledSlots, captainIndex])

  return (
    <div ref={ref} style={S.page}>

      {/* ── Company header ── */}
      <div style={S.header}>
        <div>
          <div style={S.companyName}>{companyName || 'Unnamed Company'}</div>
          <div style={S.companySub}>Doom Company Roster</div>
        </div>
        {markName && (
          <div style={S.markWrap}>
            {markImgSrc && <img src={markImgSrc} alt={markName} style={S.markImg} crossOrigin="anonymous" />}
            <div>
              <div style={S.markLabel}>Company Mark</div>
              <div style={S.markName}>{markName}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Warriors grid ── */}
      <div style={S.warriors}>
        {orderedSlots.map((slot, idx) => {
          const wdata = WARRIORS[slot.type]
          if (!wdata) return null
          const isCaptain = idx === 0 && filledSlots[captainIndex] === slot
          const portraitSrc = WARRIOR_IMAGES[slot.type] || ''
          const spent = slot.ip || []

          const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
          const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0

          // Build equipment rows
          const equipRows = []
          for (const [weaponKey, isIP] of [
            [slot.weapon1, false],
            [slot.weapon2, spent.includes('weapon2')],
          ]) {
            if (!weaponKey) continue
            const w = WEAPONS[weaponKey]
            const pills = []
            if (w?.damage > 0) pills.push(`${w.damage}dmg`)
            if (w?.range && w.range !== 'Base' && w.range !== '—') pills.push(w.range)
            equipRows.push({ key: weaponKey + (isIP ? '-ip' : ''), iconSrc: ITEM_ICONS[weaponKey] || '', name: weaponKey, pills, isIP })
          }
          if (slot.climbing && slot.climbing !== 'None') {
            const c = CLIMBING_ITEMS[slot.climbing]
            const pills = c ? [`HT ${c.height}`] : []
            equipRows.push({ key: 'climb', iconSrc: ITEM_ICONS[slot.climbing] || '', name: slot.climbing, pills, isIP: spent.includes('climbing') })
          }
          if (slot.consumable && slot.consumable !== 'None') {
            equipRows.push({ key: 'consumable', iconSrc: ITEM_ICONS[slot.consumable] || '', name: slot.consumable, pills: [], isIP: spent.includes('consumable') })
          }

          // Build ability names
          const abilityNames = (wdata.abilities || []).map(a => a.name.toUpperCase())
          for (const wKey of [slot.weapon1, slot.weapon2]) {
            if (!wKey) continue
            const w = WEAPONS[wKey]
            if (w?.abilityName) abilityNames.push(w.abilityName.toUpperCase())
          }

          return (
            <div key={idx} style={isCaptain ? S.cardCaptain : S.card}>

              {/* Header */}
              <div style={S.cardHeader}>
                {portraitSrc
                  ? <img src={portraitSrc} alt={slot.type} style={isCaptain ? S.portraitCaptain : S.portrait} />
                  : <div style={{ ...S.portrait, background: C.header }} />
                }
                <div>
                  <div style={S.warriorName}>{slot.type}</div>
                  {slot.customName && <div style={S.customName}>{slot.customName}</div>}
                  {isCaptain && <div style={S.captainBadge}>★ Captain</div>}
                </div>
              </div>

              {/* Stats */}
              <div>
                <div style={S.sectionLabel}>Stats</div>
                <div style={S.statsGrid}>
                  {STAT_KEYS.map(s => {
                    let base = wdata.stats[s]
                    if (s === 'ATK') base = parseInt(base) + dualWieldBonus

                    const improved =
                      (slot.statImproves?.includes(s)) ||
                      (spent.includes('stat') && slot.statImprove === s)
                    const debuffed = slot.weapon1 === 'Polearm (one-handed)' && s === 'COM'

                    let val = base
                    if (improved && !debuffed) val = improveStatDisplay(val, s)
                    else if (debuffed && !improved) val = debuffStatDisplay(val, s)

                    const both = improved && debuffed
                    return (
                      <div key={s} style={improved && !both ? S.statBoxImproved : S.statBox}>
                        <span style={S.statLbl}>{s}</span>
                        <span style={improved && !both ? S.statValImproved : debuffed && !both ? S.statValDebuffed : S.statVal}>
                          {val}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Equipment */}
              {equipRows.length > 0 && (
                <div>
                  <div style={S.sectionLabel}>Equipment</div>
                  {equipRows.map(row => (
                    <div key={row.key} style={S.equipRow}>
                      {row.iconSrc && <img src={row.iconSrc} alt="" style={S.equipIcon} />}
                      <span style={row.isIP ? S.equipNameIP : S.equipName}>{row.name}</span>
                      {row.pills.map(p => <span key={p} style={S.equipPill}>{p}</span>)}
                    </div>
                  ))}
                </div>
              )}

              {/* Abilities — names only */}
              {abilityNames.length > 0 && (
                <div>
                  <div style={S.sectionLabel}>Abilities</div>
                  <div style={S.abilitiesWrap}>
                    {abilityNames.map(name => (
                      <span key={name} style={S.abilityTag}>{name}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div style={S.footer}>
        1490 DOOM · Compatible with the Buer Games Third Party License · All Warrior &amp; Mark artwork © Buer Games
      </div>

    </div>
  )
})

export default DiscordImageRoster
