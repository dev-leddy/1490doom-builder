import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import { ITEM_SHEETS } from '../data/itemSheets'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

// Weapon key cells: damage and range from the weapon data, then the sheet's own (hands)
const weaponKeys = (wd, sheet) => [
  wd?.damage > 0 && { label: 'DMG', value: wd.damage, dmg: true },
  wd?.range && wd.range !== '—' && { label: 'RANGE', value: wd.range },
  ...(sheet?.keys || []),
].filter(Boolean)

const LONG_NAME = 18 // longer names get a smaller font so they still fit the fixed-size tile

// One equipment tile: icon left, full name (wraps, never truncated), stat cells split by thin rules.
// Every tile is the same size, so loading a crossbow or expending an item never moves anything.
function EquipCard({ icon, name, meta = [], state, onClick, isCache, faded, extraClass, mirror, title }) {
  return (
    <button
      type="button"
      className={`tk-equip-card${isCache ? ' tk-equip-card--cache' : ''}${faded ? ' tk-equip-card--faded' : ''}${name.length > LONG_NAME ? ' tk-equip-card--long' : ''}${extraClass ? ` ${extraClass}` : ''}`}
      onClick={onClick}
      title={title}
    >
      <span className="tk-equip-card-icon-box" aria-hidden="true">
        {icon && <img src={icon} className="tk-equip-card-icon" alt="" style={mirror ? { transform: 'scaleX(-1)' } : undefined} />}
      </span>
      <span className="tk-equip-card-text">
        <span className="tk-equip-card-name">{name}</span>
        {meta.length > 0 && (
          <span className="tk-equip-card-meta">
            {meta.map((m, i) => <span key={i} className={m.cls}>{m.text}</span>)}
          </span>
        )}
      </span>
      {/* Crossbow: loaded / reload indicator in the tile's free right-hand space */}
      {state && (
        <span className={`tk-equip-card-state tk-equip-card-state--${state.toLowerCase()}`} aria-label={state}>
          {state === 'Loaded'
            ? <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M15 8l-4-3v6z" fill="currentColor" /><path d="M1 5.5L3.5 8 1 10.5M3 5.5L5.5 8 3 10.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M12.5 1.5v3.5H9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          <span className="tk-equip-card-state-label">{state}</span>
        </span>
      )}
    </button>
  )
}

// Shield: its two once-per-round abilities, usable from the tile (same state as the Abilities list)
const SHIELD_OPR = [
  { key: 'GUARDED', short: 'Guard' },
  { key: 'SHIELD DEFENSE BONUS', short: '+1 DEF' },
]

// Item sheet: header (icon, type, state) > key numbers > labelled rule rows > ability toggles
function DetailModal({ card, onClose, onExpend, dead, oprUsed, onToggleOpr }) {
  const { name: title, desc, sheet, keys = [], opr, chip } = card
  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      className={`tk-sheet${card.isCache ? ' tk-sheet--cache' : ''}`}
      footer={
        onExpend ? (
          <>
            <button className="tk-detail-btn tk-detail-btn--ghost" onClick={onClose}>Close</button>
            <button
              className="tk-detail-btn tk-detail-btn--expend"
              onClick={onExpend}
              disabled={dead}
            >
              {sheet?.action || 'Expend'}
            </button>
          </>
        ) : (
          <button className="tk-detail-btn tk-detail-btn--ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
        )
      }
    >
      <div className={`tk-item-hero${card.isCache ? ' tk-item-hero--cache' : ''}`}>
        <span className="tk-item-hero-icon" aria-hidden="true">
          {card.icon && <img src={card.icon} alt="" style={card.mirror ? { transform: 'scaleX(-1)' } : undefined} />}
        </span>
        {sheet?.tag && <span className="tk-item-hero-tag">{sheet.tag}</span>}
        {chip && <span className={`tk-item-chip${chip.tone ? ` tk-item-chip--${chip.tone}` : ''}`}>{chip.text}</span>}
      </div>
      {keys.length > 0 && (
        <div className="tk-item-keys">
          {keys.map(k => (
            <div key={k.label} className={`tk-item-key${k.now ? ' is-now' : ''}`}>
              <span className="tk-item-key-lbl">{k.label}</span>
              <span className={`tk-item-key-val${k.dmg ? ' tk-item-key-val--dmg' : ''}`}>{k.value}</span>
            </div>
          ))}
        </div>
      )}
      {sheet?.rules?.length ? (
        <dl className="tk-rule-list">
          {sheet.rules.map(r => (
            <div key={r.label} className={`tk-rule-row${r.limit ? ' tk-rule-row--limit' : ''}`}>
              <dt className="tk-rule-lbl">{r.label}</dt>
              <dd className="tk-rule-text">
                {r.text}
                {r.note && <span className="tk-rule-note">{r.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      ) : !sheet && desc ? <div className="tk-equip-detail-desc">{desc}</div> : null}
      {opr && (
        <div className="tk-opr-list">
          {opr.map(a => {
            const used = !!oprUsed[a.key]
            return (
              <button key={a.key} type="button" className={`tk-opr-row${used ? ' is-used' : ''}`} onClick={() => onToggleOpr(a.key)} disabled={dead} aria-pressed={used}>
                <span className="tk-opr-row-head">
                  <span className="tk-opr-row-name">{a.name}</span>
                  <span className="tk-opr-row-state">{used ? '✓ Used this round' : 'Once per round'}</span>
                </span>
                <span className="tk-opr-row-desc">{a.desc}</span>
              </button>
            )
          })}
        </div>
      )}
    </BottomSheet>
  )
}

export default function EquipmentBlock({ wi, warrior: w }) {
  const [detail, setDetail] = useState(null)
  const { toggleConsumable, undoConsumable, spendCacheItem, undoCacheItem, toggleCrossbowLoaded, toggleOPR } = useTrackerStore()
  const aliveCount = useTrackerStore(s => s.warriors.filter(x => !x.dead).length)

  const cards = []

  if (w.weapon1) {
    const wd = WEAPONS[w.weapon1]
    const meta = [
      wd?.damage > 0 && { text: `${wd.damage} DMG`, cls: 'tk-equip-card-stat--dmg' },
      wd?.range && wd.range !== '—' && { text: wd.range },
    ].filter(Boolean)
    const desc = [wd?.note, wd?.special].filter(Boolean).join(' ')
    const sheet = ITEM_SHEETS[w.weapon1]
    const isCrossbow = w.weapon1 === 'Crossbow'
    const loaded = isCrossbow ? w.crossbowLoaded !== false : undefined
    cards.push({
      key: 'w1',
      icon: w.type === 'Beekeeper' ? `${import.meta.env.BASE_URL}assets/icons/scythe.svg`
          : w.type === 'Brute' && w.weapon1 === 'Heavy Weapon' ? `${import.meta.env.BASE_URL}assets/icons/wood-club.svg`
          : (w.type === 'Saboteur' || w.type === 'Warrior Priest' || w.type === 'Knight') && w.weapon1 === 'Light Weapon' ? `${import.meta.env.BASE_URL}assets/icons/flanged-mace.svg`
          : ITEM_ICONS[w.weapon1],
      name: w.weapon1,
      meta,
      desc,
      sheet,
      keys: weaponKeys(wd, sheet),
      // Bow: OVERDRAW toggles from its sheet (same state as the Abilities list)
      ...(w.weapon1 === 'Bow' && { opr: [{ key: 'OVERDRAW', name: wd.abilityName, desc: wd.abilityDesc }] }),
      ...(isCrossbow && { variant: 'crossbow', state: loaded ? 'Loaded' : 'Reload', loaded }),
      mirror: w.weapon1 !== 'Heavy Weapon',
    })
  }

  if (w.weapon2) {
    const wd = WEAPONS[w.weapon2]
    const isShield = w.weapon2 === 'Shield'
    // Shield: one cell per once-per-round ability, dimmed and struck once used this round
    const meta = isShield
      ? SHIELD_OPR.map(a => ({ text: a.short, cls: `tk-opr-cell${w.oprUsed?.[a.key] ? ' tk-opr-cell--used' : ''}` }))
      : [
        wd?.damage > 0 && { text: `${wd.damage} DMG`, cls: 'tk-equip-card-stat--dmg' },
        wd?.range && wd.range !== '—' && { text: wd.range },
      ].filter(Boolean)
    // Shield: its sheet is just the ability toggles (the rules text is in the Abilities list)
    const desc = isShield ? '' : [wd?.offhandNote || wd?.note, wd?.special].filter(Boolean).join(' ')
    const base = ITEM_SHEETS[w.weapon2]
    const sheet = base && { ...base, ...base.offhand }
    cards.push({
      key: 'w2',
      icon: w.type === 'Knight' && w.weapon2 === 'Shield' ? `${import.meta.env.BASE_URL}assets/icons/checked-shield.svg`
          : ITEM_ICONS[w.weapon2],
      name: w.weapon2,
      meta,
      desc,
      sheet,
      // Shield: no key strip; its sheet is the two ability toggles
      keys: isShield ? [] : weaponKeys(wd, sheet),
      ...(isShield && { opr: [
        { key: 'GUARDED', name: wd.abilityName, desc: wd.abilityDesc },
        { key: 'SHIELD DEFENSE BONUS', name: wd.ability2Name, desc: wd.ability2Desc },
      ] }),
    })
  }

  if (w.climbing && w.climbing !== 'None') {
    const cdata = CLIMBING_ITEMS[w.climbing]
    const meta = cdata
      // Spelled out: how high it climbs, and whether it needs a Skill Check
      ? [{ text: `${cdata.height} height, ${cdata.skillCheck === 'YES' ? 'skill check' : 'no check'}` }]
      : []
    const keys = cdata
      ? [{ label: 'HEIGHT', value: cdata.height }, { label: 'CHECK', value: cdata.skillCheck === 'YES' ? 'Skill' : 'None' }]
      : []
    cards.push({ key: 'climb', icon: ITEM_ICONS[w.climbing], name: w.climbing, meta, desc: CLIMBING_DESCS[w.climbing] || '', sheet: ITEM_SHEETS[w.climbing], keys })
  }

  if (w.consumable) {
    cards.push({
      key: 'cons',
      icon: ITEM_ICONS[w.consumable],
      name: w.consumable,
      meta: [{ text: w.consumableUsed ? 'EXPENDED' : 'AVAILABLE' }],
      desc: CONSUMABLES[w.consumable] || '',
      sheet: ITEM_SHEETS[w.consumable],
      keys: ITEM_SHEETS[w.consumable]?.keys,
      chip: { text: 'Available' },
      variant: 'consumable',
      faded: w.consumableUsed,
      spent: w.consumableUsed,
    })
  }

  for (const item of w.cacheItems) {
    const sheet = ITEM_SHEETS[item.name]
    const isHerbs = item.name === 'Herbs & Tonic'
    const fullVit = isHerbs && w.currentVit >= w.maxVit
    const keys = [
      // Map: the cell for the current number alive (the rule only covers 1 to 3)
      ...(sheet?.keys || []).map(k => (k.alive ? { ...k, now: k.alive === aliveCount } : k)),
      ...(isHerbs ? [{ label: 'NOW', value: `${w.currentVit}/${w.maxVit}` }] : []),
    ]
    cards.push({
      key: `cache-${item.id}`,
      icon: ITEM_ICONS[item.name],
      name: item.name,
      meta: item.used ? [{ text: 'EXPENDED' }] : sheet?.short ? [{ text: sheet.short }] : [],
      desc: item.desc,
      sheet,
      keys,
      chip: fullVit ? { text: 'Full VIT', tone: 'warn' } : { text: 'Available' },
      variant: 'cache',
      cacheId: item.id,
      isCache: true,
      faded: item.used,
      spent: item.used,
    })
  }

  const open = (card) => { if (!w.dead) setDetail(card) }
  const close = () => setDetail(null)

  const handleExpend = () => {
    const d = detail
    close()
    if (d.variant === 'consumable') toggleConsumable(wi)
    else if (d.variant === 'cache') spendCacheItem(wi, d.cacheId)
  }

  const handleCardClick = (c) => {
    if (w.dead) return
    if (c.variant === 'crossbow') toggleCrossbowLoaded(wi)
    // An expended item: tapping it offers to undo (for an accidental use)
    else if (c.spent && c.variant === 'consumable') undoConsumable(wi)
    else if (c.spent && c.variant === 'cache') undoCacheItem(wi, c.cacheId)
    else open(c)
  }

  const hasExpend = detail?.variant === 'consumable' || detail?.variant === 'cache'

  return (
    <>
      <div className="tk-equip">
        <div className="tk-equip-grid">
          {cards.map(c => (
            <EquipCard
              key={c.key}
              icon={c.icon}
              name={c.name}
              meta={c.meta}
              state={c.state}
              title={c.variant === 'crossbow' ? 'Tap to mark the crossbow loaded or fired' : c.spent ? 'Expended. Tap to undo' : undefined}
              onClick={() => handleCardClick(c)}
              isCache={c.isCache}
              faded={c.faded}
              extraClass={c.variant === 'crossbow' ? (c.loaded ? 'tk-equip-card--loaded' : 'tk-equip-card--unloaded') : undefined}
              mirror={c.mirror}
            />
          ))}
        </div>
      </div>

      {detail && (
        <DetailModal
          card={cards.find(c => c.key === detail.key) || detail}
          onClose={close}
          onExpend={hasExpend ? handleExpend : null}
          dead={w.dead}
          oprUsed={w.oprUsed || {}}
          onToggleOpr={key => toggleOPR(wi, key)}
        />
      )}
    </>
  )
}
