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

function EquipCard({ icon, name, sub, damage, range, badge, onClick, isCache, faded, extraClass, mirror }) {
  const hasWeaponStats = damage > 0 || (range && range !== '—')
  return (
    <button
      className={`tk-equip-card${isCache ? ' tk-equip-card--cache' : ''}${faded ? ' tk-equip-card--faded' : ''}${extraClass ? ` ${extraClass}` : ''}`}
      onClick={onClick}
    >
      {icon && <img src={icon} className="tk-equip-card-icon" alt="" style={mirror ? { transform: 'scaleX(-1)' } : undefined} />}
      <span className="tk-equip-card-name">{name}</span>
      {hasWeaponStats ? (
        <div className="tk-equip-card-stats">
          {damage > 0 && <span className="tk-equip-card-stat--dmg">{damage} DMG</span>}
          {range && range !== '—' && <span className="tk-equip-card-stat--range">{range}</span>}
        </div>
      ) : (
        sub && <div className="tk-equip-card-sub">{sub}</div>
      )}
      {badge && <div className="tk-equip-card-badge">{badge}</div>}
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
    const sub = [
      wd?.damage > 0 ? `${wd.damage} DMG` : null,
      wd?.range && wd.range !== '—' ? wd.range : null,
    ].filter(Boolean).join(' | ')
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
      sub,
      desc,
      damage: wd?.damage,
      range: wd?.range,
      ...(isCrossbow && { variant: 'crossbow', badge: loaded ? '● LOADED' : '○ RELOAD', loaded }),
      mirror: w.weapon1 !== 'Heavy Weapon',
    })
  }

  if (w.weapon2) {
    const wd = WEAPONS[w.weapon2]
    const isShield = w.weapon2 === 'Shield'
    const sub = isShield
      ? '+1 DEF | OPR'
      : [
          wd?.damage > 0 ? `${wd.damage} DMG` : null,
          wd?.range && wd.range !== '—' ? wd.range : null,
        ].filter(Boolean).join(' | ')
    const desc = isShield
      ? `${wd.note}${wd.abilityDesc ? `\n\n${wd.abilityDesc}` : ''}${wd.ability2Desc ? `\n\n${wd.ability2Desc}` : ''}`
      : [wd?.offhandNote || wd?.note, wd?.special].filter(Boolean).join(' ')
    cards.push({
      key: 'w2',
      icon: w.type === 'Knight' && w.weapon2 === 'Shield' ? `${import.meta.env.BASE_URL}assets/icons/checked-shield.svg`
          : ITEM_ICONS[w.weapon2],
      name: w.weapon2,
      sub,
      desc,
      damage: isShield ? null : wd?.damage,
      range: isShield ? null : wd?.range,
    })
  }

  if (w.climbing && w.climbing !== 'None') {
    const cdata = CLIMBING_ITEMS[w.climbing]
    const sub = cdata
      ? cdata.skillCheck === 'YES'
        ? `SKILL | ${cdata.height}`
        : cdata.height
      : null
    cards.push({ key: 'climb', icon: ITEM_ICONS[w.climbing], name: w.climbing, sub, desc: CLIMBING_DESCS[w.climbing] || '' })
  }

  if (w.consumable) {
    cards.push({
      key: 'cons',
      icon: ITEM_ICONS[w.consumable],
      name: w.consumable,
      sub: w.consumableUsed ? 'EXPENDED' : 'AVAILABLE',
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
      sub: item.used ? 'EXPENDED' : CACHE_SHORT[item.name] || null,
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
      <div className="tk-equip-grid">
        {cards.map(c => (
          <EquipCard
            key={c.key}
            icon={c.icon}
            name={c.name}
            sub={c.sub}
            damage={c.damage}
            range={c.range}
            badge={c.badge}
            onClick={() => handleCardClick(c)}
            isCache={c.isCache}
            faded={c.faded}
            extraClass={c.variant === 'crossbow' ? (c.loaded ? 'tk-equip-card--loaded' : 'tk-equip-card--unloaded') : undefined}
            mirror={c.mirror}
          />
        ))}
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
