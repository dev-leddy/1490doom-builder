import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'

function EquipCard({ icon, name, sub, onClick, isCache, faded }) {
  return (
    <button
      className={`tk-equip-card${isCache ? ' tk-equip-card--cache' : ''}${faded ? ' tk-equip-card--faded' : ''}`}
      onClick={onClick}
    >
      {icon && <img src={icon} className="tk-equip-card-icon" alt="" />}
      <span className="tk-equip-card-name">{name}</span>
      {sub && <div className="tk-equip-card-sub">{sub}</div>}
    </button>
  )
}

function DetailModal({ title, desc, onClose, onExpend, expended, dead }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 360, maxHeight: '65dvh', position: 'relative' }}>
        <button className="tracker-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="tracker-modal-title" style={{ paddingRight: '1.5rem' }}>{title}</div>
        <div className="tk-equip-detail-desc">{desc}</div>
        {onExpend && (
          <div className="tk-equip-detail-actions">
            <button className="tk-detail-btn tk-detail-btn--ghost" onClick={onClose}>Close</button>
            <button
              className="tk-detail-btn tk-detail-btn--expend"
              onClick={onExpend}
              disabled={expended || dead}
            >
              {expended ? 'Expended' : 'Expend'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EquipmentBlock({ wi, warrior: w }) {
  const [detail, setDetail] = useState(null)
  const { toggleConsumable, useCacheItem } = useTrackerStore()

  const cards = []

  if (w.weapon1) {
    const wd = WEAPONS[w.weapon1]
    const sub = [
      wd?.damage > 0 ? `DMG ${wd.damage}` : null,
      wd?.range && wd.range !== '—' ? `RNG ${wd.range}` : null,
    ].filter(Boolean).join(' · ')
    const desc = [wd?.note, wd?.special].filter(Boolean).join(' ')
    cards.push({ key: 'w1', icon: ITEM_ICONS[w.weapon1], name: w.weapon1, sub, desc })
  }

  if (w.weapon2) {
    const wd = WEAPONS[w.weapon2]
    const isShield = w.weapon2 === 'Shield'
    const sub = isShield
      ? '+1 DEF · ONCE PER ROUND'
      : [
          wd?.damage > 0 ? `DMG ${wd.damage}` : null,
          wd?.range && wd.range !== '—' ? `RNG ${wd.range}` : null,
        ].filter(Boolean).join(' · ')
    const desc = isShield
      ? `${wd.note}${wd.abilityDesc ? `\n\n${wd.abilityDesc}` : ''}`
      : [wd?.offhandNote || wd?.note, wd?.special].filter(Boolean).join(' ')
    cards.push({ key: 'w2', icon: ITEM_ICONS[w.weapon2], name: w.weapon2, sub, desc })
  }

  if (w.climbing && w.climbing !== 'None') {
    const cdata = CLIMBING_ITEMS[w.climbing]
    const sub = cdata ? `HT ${cdata.height} · SKILL ${cdata.skillCheck}` : null
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
    })
  }

  for (const item of w.cacheItems) {
    cards.push({
      key: `cache-${item.id}`,
      icon: ITEM_ICONS[item.name],
      name: item.name,
      sub: null,
      desc: item.desc,
      variant: 'cache',
      cacheId: item.id,
      isCache: true,
    })
  }

  const open = (card) => { if (!w.dead) setDetail(card) }
  const close = () => setDetail(null)

  const handleExpend = () => {
    const d = detail
    close()
    if (d.variant === 'consumable') toggleConsumable(wi)
    else if (d.variant === 'cache') useCacheItem(wi, d.cacheId)
  }

  const hasExpend = detail?.variant === 'consumable' || detail?.variant === 'cache'
  const isExpended = detail?.variant === 'consumable' && w.consumableUsed

  return (
    <>
      <div className="tk-equip-grid">
        {cards.map(c => (
          <EquipCard
            key={c.key}
            icon={c.icon}
            name={c.name}
            sub={c.sub}
            onClick={() => open(c)}
            isCache={c.isCache}
            faded={c.faded}
          />
        ))}
      </div>

      {detail && (
        <DetailModal
          title={detail.name}
          desc={detail.desc}
          onClose={close}
          onExpend={hasExpend ? handleExpend : null}
          expended={isExpended}
          dead={w.dead}
        />
      )}
    </>
  )
}
