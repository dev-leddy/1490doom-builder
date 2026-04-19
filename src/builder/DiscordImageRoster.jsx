// ── Discord Image Roster ───────────────────────────────────────────────────────
// Off-screen render of a builder-style roster for html2canvas capture.
// Matches the builder page aesthetic: dark cards, stat boxes, upgrade tray,
// ability name rows. Ability descriptions omitted. IP upgrades underlined.

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

// ── Colors (builder CSS vars resolved to hex) ─────────────────────────────────
const C = {
  ash:       '#080808',   // --ash  (page + card bg)
  fog:       '#111111',   // --fog  (stat box bg)
  dim:       '#222222',   // --dim  (borders)
  bone:      '#dcdcdc',   // --bone (primary text)
  parchment: '#ffffff',   // --parchment (bright text)
  mist:      '#444444',   // --mist (muted)
  blood:     '#be4127',   // --blood / --gold (accent, captain)
  green:     '#4a9a4a',   // --green (modified stat)
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const S = {
  page: {
    width: '420px',
    background: C.ash,
    padding: '14px',
    fontFamily: "'Oswald', 'Arial Narrow', Arial, sans-serif",
    color: C.bone,
    boxSizing: 'border-box',
  },

  // ── Company header ──
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${C.dim}`,
    paddingBottom: '10px',
    marginBottom: '12px',
    gap: '10px',
  },
  companyName: {
    fontFamily: "'Caslon Antique', 'Palatino Linotype', Georgia, serif",
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '0.03em',
    lineHeight: '1',
    color: C.parchment,
  },
  companySub: {
    fontSize: '9px',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: C.mist,
    marginTop: '4px',
  },
  markWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    borderLeft: `1px solid ${C.dim}`,
    paddingLeft: '10px',
    flexShrink: 0,
  },
  markImg: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'center',
    border: `1px solid ${C.dim}`,
    flexShrink: 0,
  },
  markLabel: {
    fontSize: '8px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: C.mist,
    lineHeight: '1',
    marginBottom: '2px',
  },
  markName: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: C.bone,
  },

  // ── Warrior cards ──
  warriors: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    background: C.ash,
    border: `1px solid ${C.dim}`,
    padding: '8px 10px 10px',
  },
  cardCaptain: {
    background: C.ash,
    border: `1px solid ${C.blood}`,
    padding: '8px 10px 10px',
  },

  // ── Card header ──
  slotHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  captainLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '8px',
    fontWeight: '700',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: C.blood,
    display: 'block',
    marginBottom: '2px',
  },
  warriorName: {
    fontFamily: "'Caslon Antique', 'Palatino Linotype', Georgia, serif",
    fontSize: '17px',
    fontWeight: '700',
    color: C.parchment,
    lineHeight: '1',
  },
  classLabel: {
    fontSize: '9px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: C.mist,
    marginTop: '3px',
  },

  // ── Portrait + stats row ──
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  portraitCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  portrait: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'top center',
    border: `1px solid ${C.dim}`,
    display: 'block',
  },
  portraitCaptain: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'top center',
    border: `2px solid ${C.blood}`,
    display: 'block',
  },

  // ── Stats ──
  statsRow: {
    display: 'flex',
    gap: '4px',
    flex: 1,
    flexWrap: 'wrap',
  },
  statBox: {
    background: C.fog,
    border: `1px solid ${C.dim}`,
    padding: '3px 5px',
    textAlign: 'center',
    flex: '1',
    minWidth: '32px',
  },
  statBoxModified: {
    background: C.fog,
    border: `1px solid ${C.dim}`,
    padding: '3px 5px',
    textAlign: 'center',
    flex: '1',
    minWidth: '32px',
  },
  statLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '8px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: C.mist,
    display: 'block',
    lineHeight: '1',
  },
  statVal: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '14px',
    fontWeight: '700',
    color: C.bone,
    display: 'block',
    lineHeight: '1.2',
  },
  statValModified: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '14px',
    fontWeight: '700',
    color: C.green,
    textDecoration: 'underline',
    display: 'block',
    lineHeight: '1.2',
  },
  statValDebuffed: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '14px',
    fontWeight: '700',
    color: C.blood,
    display: 'block',
    lineHeight: '1.2',
  },

  // ── Upgrade tray ──
  upgradeTray: {
    marginBottom: '8px',
  },
  upgradeTrayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  upgradeTrayLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '9px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: C.blood,
  },
  upgradeCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '4px',
  },
  upgradeCard: {
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${C.dim}`,
    borderRadius: '3px',
    padding: '5px 4px',
    textAlign: 'center',
  },
  upgradeCardSelected: {
    background: 'rgba(190,65,39,0.15)',
    border: `1px solid ${C.blood}`,
    borderRadius: '3px',
    padding: '5px 4px',
    textAlign: 'center',
  },
  upgradeIcon: {
    width: '14px',
    height: '14px',
    margin: '0 auto 3px',
    display: 'block',
    filter: 'brightness(0) invert(0.4)',
  },
  upgradeIconSelected: {
    width: '14px',
    height: '14px',
    margin: '0 auto 3px',
    display: 'block',
    filter: 'brightness(0) invert(0.7) sepia(1) saturate(2) hue-rotate(330deg)',
  },
  upgradeLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '7px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: C.mist,
    lineHeight: '1.2',
    display: 'block',
  },
  upgradeLabelSelected: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '7px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: C.blood,
    lineHeight: '1.2',
    display: 'block',
  },

  // ── Equipment ──
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingBottom: '4px',
    borderBottom: `1px solid ${C.dim}`,
    marginBottom: '4px',
  },
  sectionTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '9px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: C.bone,
  },
  equipList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginBottom: '8px',
  },
  equipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  equipIcon: {
    width: '11px',
    height: '11px',
    flexShrink: 0,
    filter: 'brightness(0) invert(0.5)',
  },
  equipName: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: C.bone,
  },
  equipNameIP: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: C.bone,
    textDecoration: 'underline',
  },
  equipPill: {
    fontSize: '8px',
    border: `1px solid ${C.dim}`,
    background: C.fog,
    padding: '1px 4px',
    color: C.mist,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },

  // ── Abilities ──
  abilitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  abilityRow: {
    background: C.ash,
    borderLeft: `3px solid ${C.dim}`,
    padding: '4px 6px',
  },
  abilityName: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: C.bone,
  },

  // ── Footer ──
  footer: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: `1px solid ${C.dim}`,
    fontSize: '8px',
    color: C.mist,
    letterSpacing: '0.04em',
    textAlign: 'center',
  },
}

// ── Upgrade card definitions ───────────────────────────────────────────────────

const UPGRADE_DEFS = [
  { id: 'weapon2',    icon: 'Dual Wield',          label: '2nd\nWeapon' },
  { id: 'climbing',   icon: 'Grappling Hook',       label: 'Climbing\nItem' },
  { id: 'consumable', icon: 'Fog of War Flask',     label: 'Consumable\nItem' },
  { id: 'stat',       icon: null,                   label: 'Improve\na Stat' },
]

const StatArrowSVG = ({ selected }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={selected ? '#be4127' : '#444'}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: '14px', height: '14px', display: 'block', margin: '0 auto 3px' }}
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

const DiscordImageRoster = forwardRef(function DiscordImageRoster({ state }, ref) {
  const { companyName, mark, slots = [] } = state

  const markName = (mark && typeof mark === 'object') ? mark.name : mark
  const markImgSrc = markName ? (MARK_IMAGES[markName] || '') : ''

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

      {/* ── Warriors ── */}
      <div style={S.warriors}>
        {orderedSlots.map((slot, idx) => {
          const wdata = WARRIORS[slot.type]
          if (!wdata) return null
          const isCaptain = idx === 0 && filledSlots[captainIndex] === slot
          const portraitSrc = WARRIOR_IMAGES[slot.type] || ''
          const spent = slot.ip || []

          const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
          const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0

          // Equipment rows
          const equipRows = []
          for (const [weaponKey, isIP] of [[slot.weapon1, false], [slot.weapon2, spent.includes('weapon2')]]) {
            if (!weaponKey) continue
            const w = WEAPONS[weaponKey]
            const pills = []
            if (w?.damage > 0) pills.push(`${w.damage}dmg`)
            if (w?.range && w.range !== 'Base' && w.range !== '—') pills.push(w.range)
            equipRows.push({ key: weaponKey + (isIP ? '-ip' : ''), iconKey: weaponKey, name: weaponKey, pills, isIP })
          }
          if (slot.climbing && slot.climbing !== 'None') {
            const c = CLIMBING_ITEMS[slot.climbing]
            equipRows.push({ key: 'climb', iconKey: slot.climbing, name: slot.climbing, pills: c ? [`HT ${c.height}`] : [], isIP: spent.includes('climbing') })
          }
          if (slot.consumable && slot.consumable !== 'None') {
            equipRows.push({ key: 'consumable', iconKey: slot.consumable, name: slot.consumable, pills: [], isIP: spent.includes('consumable') })
          }

          // Ability names
          const abilityNames = (wdata.abilities || []).map(a => a.name.toUpperCase())
          for (const wKey of [slot.weapon1, slot.weapon2]) {
            if (!wKey) continue
            const w = WEAPONS[wKey]
            if (w?.abilityName) abilityNames.push(w.abilityName.toUpperCase())
          }

          // Upgrade card labels (what was actually selected)
          const upgradeLabels = {
            weapon2:    slot.weapon2 || null,
            climbing:   (slot.climbing && slot.climbing !== 'None') ? slot.climbing : null,
            consumable: (slot.consumable && slot.consumable !== 'None') ? slot.consumable : null,
            stat:       slot.statImproves?.length
              ? `+${slot.statImproves.join(', ')}`
              : slot.statImprove ? `+${slot.statImprove}` : null,
          }

          return (
            <div key={idx} style={isCaptain ? S.cardCaptain : S.card}>

              {/* Header: name + class */}
              <div style={S.slotHeader}>
                <div>
                  {isCaptain && <span style={S.captainLabel}>★ Captain</span>}
                  <div style={S.warriorName}>{slot.customName || slot.type}</div>
                  {slot.customName && <div style={S.classLabel}>{slot.type}</div>}
                </div>
              </div>

              {/* Portrait + stats */}
              <div style={S.headerRow}>
                <div style={S.portraitCol}>
                  {portraitSrc
                    ? <img src={portraitSrc} alt={slot.type} style={isCaptain ? S.portraitCaptain : S.portrait} />
                    : <div style={{ ...S.portrait, background: C.fog }} />
                  }
                </div>
                <div style={S.statsRow}>
                  {STAT_KEYS.map(s => {
                    let base = wdata.stats[s]
                    if (s === 'ATK') base = parseInt(base) + dualWieldBonus

                    const improved = (slot.statImproves?.includes(s)) || (spent.includes('stat') && slot.statImprove === s)
                    const debuffed = slot.weapon1 === 'Polearm (one-handed)' && s === 'COM'
                    const both = improved && debuffed

                    let val = base
                    if (improved && !both) val = improveStatDisplay(val, s)
                    else if (debuffed && !both) val = debuffStatDisplay(val, s)

                    const isModified = (improved && !both) || (s === 'ATK' && dualWieldBonus > 0 && !both)
                    const isDebuffed = debuffed && !both

                    return (
                      <div key={s} style={S.statBox}>
                        <span style={S.statLabel}>{s}</span>
                        <span style={isModified ? S.statValModified : isDebuffed ? S.statValDebuffed : S.statVal}>
                          {val}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Upgrade tray — only if any upgrades purchased */}
              {spent.length > 0 && (
                <div style={S.upgradeTray}>
                  <div style={S.upgradeTrayHeader}>
                    <span style={S.upgradeTrayLabel}>Upgrades</span>
                  </div>
                  <div style={S.upgradeCards}>
                    {UPGRADE_DEFS.map(upg => {
                      const selected = spent.includes(upg.id)
                      const cardStyle = selected ? S.upgradeCardSelected : S.upgradeCard
                      const labelStyle = selected ? S.upgradeLabelSelected : S.upgradeLabel
                      const sublabel = selected && upgradeLabels[upg.id]
                        ? upgradeLabels[upg.id]
                        : upg.label

                      return (
                        <div key={upg.id} style={cardStyle}>
                          {upg.icon
                            ? <img
                                src={ITEM_ICONS[upg.icon] || ''}
                                alt=""
                                style={selected ? S.upgradeIconSelected : S.upgradeIcon}
                              />
                            : <StatArrowSVG selected={selected} />
                          }
                          <span style={labelStyle}>{sublabel}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {equipRows.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={S.sectionHeader}>
                    <span style={S.sectionTitle}>Equipment</span>
                  </div>
                  <div style={S.equipList}>
                    {equipRows.map(row => (
                      <div key={row.key} style={S.equipRow}>
                        {ITEM_ICONS[row.iconKey] && (
                          <img src={ITEM_ICONS[row.iconKey]} alt="" style={S.equipIcon} />
                        )}
                        <span style={row.isIP ? S.equipNameIP : S.equipName}>{row.name}</span>
                        {row.pills.map(p => <span key={p} style={S.equipPill}>{p}</span>)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abilities — names only */}
              {abilityNames.length > 0 && (
                <div>
                  <div style={S.sectionHeader}>
                    <span style={S.sectionTitle}>Abilities</span>
                  </div>
                  <div style={S.abilitiesList}>
                    {abilityNames.map(name => (
                      <div key={name} style={S.abilityRow}>
                        <span style={S.abilityName}>{name}</span>
                      </div>
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
        1490 DOOM · Compatible with the Buer Games Third Party License · Warrior &amp; Mark artwork © Buer Games
      </div>

    </div>
  )
})

export default DiscordImageRoster
