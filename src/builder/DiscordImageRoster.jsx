// ── Discord Image Roster ───────────────────────────────────────────────────────
// The "Copy as image" roster, captured off-screen by html2canvas (see ShareModal).
// One card per warrior: portrait, name, an aligned stat grid, gear chips, ability
// names. Full rules live behind the share link; the image is for reading a list at a glance.
//
// html2canvas notes: inline styles only, solid colours, no CSS variables or filters.
// Portraits are background images (html2canvas has no object-fit).

import { forwardRef, useMemo } from 'react'
import { WARRIORS, MARKS_MAP } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS } from '../data/weapons'
import { WARRIOR_IMAGES, MARK_IMAGES } from '../data/images'
import { getEffectiveStats, improvedStats, STAT_KEYS } from '../utils/stats'

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  page:      '#0a0a0a',
  card:      '#131313',
  well:      '#0c0c0c',
  chip:      '#1d1d1d',
  line:      '#272727',
  bone:      '#dcdcdc',
  parchment: '#ffffff',
  soft:      '#b4b4b4', // ability names, rule text
  mist:      '#7c7c7c', // labels, secondary info
  blood:     '#be4127',
  green:     '#6fbf6f',
}

const SERIF = "'Caslon Antique', 'Palatino Linotype', Georgia, serif"
const SANS  = "'Oswald', 'Arial Narrow', Arial, sans-serif"

// Line heights stay at or above each font's natural height (~1.5em Oswald, ~1.4em Caslon):
// html2canvas draws text too low when the line box is tighter than the glyphs.
const lh = (size, ratio = 1.5) => `${Math.round(size * ratio)}px`

// Small uppercase label text (stat names, section labels)
const label = (color = C.mist, size = 9) => ({
  fontFamily: SANS, fontSize: `${size}px`, lineHeight: lh(size),
  letterSpacing: '0.12em', textTransform: 'uppercase', color,
})

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    background: C.page,
    padding: '18px 16px 14px',
    fontFamily: SANS,
    color: C.bone,
    boxSizing: 'border-box',
  },

  // Header
  header: { display: 'flex', alignItems: 'center', gap: '12px' },
  markImg: {
    width: '52px', height: '52px', flexShrink: 0, borderRadius: '50%',
    border: `1px solid ${C.line}`,
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
  },
  companyName: {
    fontFamily: SERIF, fontSize: '24px', lineHeight: lh(24, 1.4), fontWeight: '700', color: C.parchment,
  },
  meta: { ...label(C.mist, 10), marginTop: '3px' },
  metaSep: { color: C.line, padding: '0 6px' },
  markRule: {
    marginTop: '10px', padding: '7px 10px',
    background: C.card, borderLeft: `2px solid ${C.blood}`,
    fontSize: '10.5px', lineHeight: lh(10.5), color: C.soft,
  },
  markName: { ...label(C.blood, 10), fontWeight: '700', marginRight: '6px' },

  // Warrior cards
  card: {
    background: C.card, border: `1px solid ${C.line}`,
    padding: '10px', boxSizing: 'border-box',
  },
  top: { display: 'flex', gap: '10px', alignItems: 'stretch' },
  portrait: {
    width: '58px', flexShrink: 0, background: C.well,
    backgroundSize: 'cover', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat',
    border: `1px solid ${C.line}`,
  },
  topRight: { flex: 1, minWidth: 0 },
  nameRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' },
  name: {
    fontFamily: SERIF, fontSize: '18px', lineHeight: lh(18, 1.4), fontWeight: '700', color: C.parchment,
  },
  captain: { ...label(C.blood, 9), fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 },
  subline: { ...label(C.mist, 9), marginTop: '1px' },
  subIP: { color: C.blood },

  // Stat grid: six equal columns so every card lines up
  stats: {
    display: 'flex', marginTop: '6px',
    background: C.well, border: `1px solid ${C.line}`,
  },
  statCell: { flex: 1, textAlign: 'center', padding: '1px 0 3px' },
  statCellSep: { borderLeft: `1px solid ${C.line}` },
  statLabel: { ...label(C.mist, 8), letterSpacing: '0.1em' },
  statVal: { fontFamily: SANS, fontSize: '16px', lineHeight: lh(16, 1.45), fontWeight: '500', color: C.parchment },

  // Gear chips
  chips: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' },
  chip: {
    display: 'flex', alignItems: 'baseline', gap: '5px',
    background: C.chip, padding: '1px 7px 3px',
    fontFamily: SANS, fontSize: '10.5px', lineHeight: lh(10.5),
    letterSpacing: '0.04em', textTransform: 'uppercase', color: C.bone, whiteSpace: 'nowrap',
  },
  chipStat: { fontSize: '9.5px', color: C.mist, letterSpacing: '0.03em' },
  chipImprove: { color: C.green },
  ipTag: { ...label(C.blood, 8), fontWeight: '700', letterSpacing: '0.08em' },

  // Abilities: names only (rules wording stays in the app / share link)
  abilities: { marginTop: '7px', fontSize: '10px', lineHeight: lh(10, 1.6), letterSpacing: '0.05em', color: C.soft },
  abilitiesLabel: { ...label(C.mist, 8), marginRight: '6px' },
  abilitySep: { color: C.mist, padding: '0 2px' },
  abilitySource: { color: C.mist, textTransform: 'none', letterSpacing: '0.02em' },

  // Footer
  footer: {
    display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
    marginTop: '12px', ...label(C.mist, 8), letterSpacing: '0.08em',
  },
}

// html2canvas measures each font's baseline with a 1x1 <img> it appends to <body>. Tailwind's
// preflight makes every img display:block, which drops that probe below the text, so the
// measured baseline is too deep and all captured text lands ~0.4em low. Keep the probe
// inline (it is the only img with this exact data URI) while the share sheet is open.
const H2C_BASELINE_FIX =
  'body > div > img[src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"] { display: inline !important; }'

// ── Data helpers ──────────────────────────────────────────────────────────────

function weaponStat(w) {
  const parts = []
  if (w?.damage > 0) parts.push(`${w.damage} DMG`)
  if (w?.range && w.range !== '—' && w.range !== 'Base') parts.push(w.range)
  return parts.join(' · ')
}

function gearFor(slot) {
  const spent = slot.ip || []
  const gear = []
  for (const [key, isIP] of [[slot.weapon1, false], [slot.weapon2, spent.includes('weapon2')]]) {
    if (!key) continue
    gear.push({ key: `${key}-${isIP ? 'ip' : 'base'}`, name: key, stat: weaponStat(WEAPONS[key]), isIP })
  }
  if (slot.climbing && slot.climbing !== 'None') {
    const c = CLIMBING_ITEMS[slot.climbing]
    gear.push({ key: 'climb', name: slot.climbing, stat: c ? `HT ${c.height}` : '', isIP: spent.includes('climbing') })
  }
  if (slot.consumable && slot.consumable !== 'None') {
    gear.push({ key: 'consumable', name: slot.consumable, stat: '', isIP: spent.includes('consumable') })
  }
  // Bought stat improvements (standard: one via 'stat'; campaign: several)
  for (const s of STAT_KEYS.filter(k => improvedStats(slot).has(k))) {
    gear.push({ key: `stat-${s}`, name: `+1 ${s}`, stat: '', isIP: true, improve: true })
  }
  return gear
}

function abilitiesFor(slot, wdata) {
  const list = (wdata.abilities || []).map(a => ({ name: a.name, source: null }))
  for (const key of [slot.weapon1, slot.weapon2]) {
    const w = key && WEAPONS[key]
    if (w?.abilityName) {
      list.push({ name: w.abilityName, source: key })
      if (w.ability2Name) list.push({ name: w.ability2Name, source: key })
    }
  }
  // Never list the same ability twice (names are also the React keys)
  const seen = new Set()
  return list.filter(a => (seen.has(a.name) ? false : seen.add(a.name)))
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function StatGrid({ slot }) {
  const eff = getEffectiveStats(slot)
  return (
    <div style={S.stats}>
      {STAT_KEYS.map((s, i) => {
        const st = eff[s]
        const color = st.net > 0 ? C.green : st.net < 0 ? C.blood : C.parchment
        return (
          <div key={s} style={i > 0 ? { ...S.statCell, ...S.statCellSep } : S.statCell}>
            <div style={S.statLabel}>{s}</div>
            <div style={{ ...S.statVal, color }}>{st.display}</div>
          </div>
        )
      })}
    </div>
  )
}

function WarriorCard({ slot, isCaptain }) {
  const wdata = WARRIORS[slot.type]
  const spent = (slot.ip || []).length
  const gear = gearFor(slot)
  const abilities = abilitiesFor(slot, wdata)
  const portrait = WARRIOR_IMAGES[slot.type]

  return (
    <div style={S.card}>
      <div style={S.top}>
        <div style={portrait ? { ...S.portrait, backgroundImage: `url(${portrait})` } : S.portrait} />
        <div style={S.topRight}>
          <div style={S.nameRow}>
            <div style={S.name}>{slot.customName || slot.type}</div>
            {isCaptain && <div style={S.captain}>★ Captain</div>}
          </div>
          <div style={S.subline}>
            {slot.customName && <>{slot.type}<span style={S.metaSep}>·</span></>}
            {spent > 0 ? <span style={S.subIP}>{spent} IP spent</span> : 'No upgrades'}
          </div>
          <StatGrid slot={slot} />
        </div>
      </div>

      {gear.length > 0 && (
        <div style={S.chips}>
          {gear.map(g => (
            <div key={g.key} style={g.improve ? { ...S.chip, ...S.chipImprove } : S.chip}>
              <span>{g.name}</span>
              {g.stat && <span style={S.chipStat}>{g.stat}</span>}
              {g.isIP && <span style={S.ipTag}>IP</span>}
            </div>
          ))}
        </div>
      )}

      {abilities.length > 0 && (
        <div style={S.abilities}>
          <span style={S.abilitiesLabel}>Abilities</span>
          {abilities.map((a, i) => (
            <span key={a.name}>
              {i > 0 && <span style={S.abilitySep}> · </span>}
              <span style={{ whiteSpace: 'nowrap' }}>
                {a.name}
                {a.source && <span style={S.abilitySource}>{` (${a.source})`}</span>}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const DiscordImageRoster = forwardRef(function DiscordImageRoster({ state }, ref) {
  const { companyName, mark, slots = [], companyMode, ipLimit, campaignGame = 0 } = state

  const markName = (mark && typeof mark === 'object') ? mark.name : mark

  const filledSlots = useMemo(() => slots.filter(s => s?.type && WARRIORS[s.type]), [slots])
  const captainIndex = useMemo(() => {
    const idx = filledSlots.findIndex(s => s?.isCaptain)
    return idx >= 0 ? idx : 0
  }, [filledSlots])
  const orderedSlots = useMemo(() => {
    if (!filledSlots.length) return []
    return [filledSlots[captainIndex], ...filledSlots.filter((_, i) => i !== captainIndex)]
  }, [filledSlots, captainIndex])

  // Five or more warriors: two columns, so the image stays readable as a Discord thumbnail
  const twoCol = orderedSlots.length >= 5
  const isCampaign = companyMode === 'campaign'
  const meta = [
    isCampaign ? 'Campaign' : 'Standard',
    isCampaign ? `Game ${campaignGame + 1}` : `${ipLimit ?? 0} IP`,
    `${orderedSlots.length} Warrior${orderedSlots.length !== 1 ? 's' : ''}`,
  ]
  const markImg = markName && MARK_IMAGES[markName]

  return (
    <>
    <style>{H2C_BASELINE_FIX}</style>
    <div ref={ref} style={{ ...S.page, width: twoCol ? '880px' : '480px' }}>

      {/* ── Header ── */}
      <div style={S.header}>
        {markImg && <div style={{ ...S.markImg, backgroundImage: `url(${markImg})` }} />}
        <div style={{ minWidth: 0 }}>
          <div style={S.companyName}>{companyName || 'Unnamed Company'}</div>
          <div style={S.meta}>
            {meta.map((m, i) => (
              <span key={m}>{i > 0 && <span style={S.metaSep}>/</span>}{m}</span>
            ))}
          </div>
        </div>
      </div>
      {markName && (
        <div style={S.markRule}>
          <span style={S.markName}>{markName}</span>
          {MARKS_MAP[markName]}
        </div>
      )}

      {/* ── Warriors ── */}
      <div style={{
        display: 'grid', gap: '8px', marginTop: '12px',
        gridTemplateColumns: twoCol ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', alignItems: 'stretch',
      }}>
        {orderedSlots.map((slot, idx) => (
          <WarriorCard key={idx} slot={slot} isCaptain={idx === 0 && filledSlots[captainIndex] === slot} />
        ))}
      </div>

      <div style={S.footer}>
        <span>
          <span style={{ color: C.green }}>Green</span> improved
          <span style={S.metaSep}>·</span>
          <span style={{ color: C.blood }}>Red</span> penalty
          <span style={S.metaSep}>·</span>
          <span style={{ color: C.blood }}>IP</span> bought with Improvement Points
        </span>
        <span>1490doomcompanybuilder.com</span>
      </div>

    </div>
    </>
  )
})

export default DiscordImageRoster
