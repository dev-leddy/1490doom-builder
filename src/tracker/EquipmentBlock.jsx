import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

const CACHE_SHORT = {
  'Herbs & Tonic':    'HEAL 3 VIT',
  'Food':             '+1 ACTION',
  'Scholarly Scroll': 'PASS SKILL',
  'Map':              'MOVE ALL',
  'Cloak':            'UNTARGETABLE',
  'Reliquary':        'RESTORE OPG',
}

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

function DetailModal({ title, desc, damage, range, onClose, onExpend, dead }) {
  const hasStats = (damage > 0) || (range && range !== '—')
  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      className="tk-sheet"
      footer={
        onExpend ? (
          <>
            <button className="tk-detail-btn tk-detail-btn--ghost" onClick={onClose}>Close</button>
            <button
              className="tk-detail-btn tk-detail-btn--expend"
              onClick={onExpend}
              disabled={dead}
            >
              Expend
            </button>
          </>
        ) : (
          <button className="tk-detail-btn tk-detail-btn--ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
        )
      }
    >
      {hasStats && (
        <div className="tk-detail-stats">
          {damage > 0 && (
            <div className="tk-detail-stat-wrap">
              <span className="tk-detail-stat-label">Damage</span>
              <span className="tk-detail-stat-val tk-detail-stat-val--dmg">{damage}</span>
            </div>
          )}
          {range && range !== '—' && (
            <div className="tk-detail-stat-wrap">
              <span className="tk-detail-stat-label">Range</span>
              <span className="tk-detail-stat-val">{range}</span>
            </div>
          )}
        </div>
      )}
      {desc ? <div className="tk-equip-detail-desc">{desc}</div> : null}
    </BottomSheet>
  )
}

export default function EquipmentBlock({ wi, warrior: w }) {
  const [detail, setDetail] = useState(null)
  const { toggleConsumable, undoConsumable, spendCacheItem, undoCacheItem, toggleCrossbowLoaded } = useTrackerStore()

  const cards = []

  if (w.weapon1) {
    const wd = WEAPONS[w.weapon1]
    const meta = [
      wd?.damage > 0 && { text: `${wd.damage} DMG`, cls: 'tk-equip-card-stat--dmg' },
      wd?.range && wd.range !== '—' && { text: wd.range },
    ].filter(Boolean)
    const desc = [wd?.note, wd?.special].filter(Boolean).join(' ')
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
      damage: wd?.damage,
      range: wd?.range,
      ...(isCrossbow && { variant: 'crossbow', state: loaded ? 'Loaded' : 'Reload', loaded }),
      mirror: w.weapon1 !== 'Heavy Weapon',
    })
  }

  if (w.weapon2) {
    const wd = WEAPONS[w.weapon2]
    const isShield = w.weapon2 === 'Shield'
    const meta = isShield
      ? [{ text: '+1 DEF' }, { text: 'OPR' }]
      : [
        wd?.damage > 0 && { text: `${wd.damage} DMG`, cls: 'tk-equip-card-stat--dmg' },
        wd?.range && wd.range !== '—' && { text: wd.range },
      ].filter(Boolean)
    const desc = isShield
      ? `${wd.note}${wd.abilityDesc ? `\n\n${wd.abilityDesc}` : ''}${wd.ability2Desc ? `\n\n${wd.ability2Desc}` : ''}`
      : [wd?.offhandNote || wd?.note, wd?.special].filter(Boolean).join(' ')
    cards.push({
      key: 'w2',
      icon: w.type === 'Knight' && w.weapon2 === 'Shield' ? `${import.meta.env.BASE_URL}assets/icons/checked-shield.svg`
          : ITEM_ICONS[w.weapon2],
      name: w.weapon2,
      meta,
      desc,
      damage: isShield ? null : wd?.damage,
      range: isShield ? null : wd?.range,
    })
  }

  if (w.climbing && w.climbing !== 'None') {
    const cdata = CLIMBING_ITEMS[w.climbing]
    const meta = cdata
      ? [cdata.skillCheck === 'YES' && { text: 'SKILL' }, { text: cdata.height }].filter(Boolean)
      : []
    cards.push({ key: 'climb', icon: ITEM_ICONS[w.climbing], name: w.climbing, meta, desc: CLIMBING_DESCS[w.climbing] || '' })
  }

  if (w.consumable) {
    cards.push({
      key: 'cons',
      icon: ITEM_ICONS[w.consumable],
      name: w.consumable,
      meta: [{ text: w.consumableUsed ? 'EXPENDED' : 'AVAILABLE' }],
      desc: CONSUMABLES[w.consumable] || '',
      variant: 'consumable',
      faded: w.consumableUsed,
      spent: w.consumableUsed,
    })
  }

  for (const item of w.cacheItems) {
    cards.push({
      key: `cache-${item.id}`,
      icon: ITEM_ICONS[item.name],
      name: item.name,
      meta: item.used ? [{ text: 'EXPENDED' }] : CACHE_SHORT[item.name] ? [{ text: CACHE_SHORT[item.name] }] : [],
      desc: item.desc,
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
          title={detail.name}
          desc={detail.desc}
          damage={detail.damage}
          range={detail.range}
          onClose={close}
          onExpend={hasExpend ? handleExpend : null}
          dead={w.dead}
        />
      )}
    </>
  )
}
