import { useTrackerStore, canRestoreWithReliquary } from '../store/trackerStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WARRIOR_IMAGES, ITEM_ICONS } from '../data/images'
import { CONSUMABLES, WEAPONS } from '../data/weapons'
import VitalityTrack from './VitalityTrack'
import EquipmentBlock from './EquipmentBlock'
import AbilityBlock from './AbilityBlock'
import CacheBlock from './CacheBlock'
import StatusBlock from './StatusBlock'

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) - 1) + '+'
  return parseInt(base) + 1
}

function IPUpgradeNote({ warrior: w }) {
  const wdata = WARRIORS[w.type]
  const upgrades = w.ip || []
  const tags = []

  if (w.statImprove && upgrades.includes('stat'))
    tags.push({ key: 'stat', label: STAT_IMPROVEMENT[w.statImprove], free: false })

  if (w.weapon2) {
    const isFree = wdata?.fixedShield === true && w.weapon2 === 'Shield'
    if (isFree || upgrades.includes('weapon2'))
      tags.push({ key: 'weapon2', label: w.weapon2, free: isFree })
  }

  if (w.climbing && w.climbing !== 'None' && upgrades.includes('climbing'))
    tags.push({ key: 'climbing', label: w.climbing, free: false })

  if (w.consumable && upgrades.includes('consumable'))
    tags.push({ key: 'consumable', label: w.consumable, free: false })

  if (tags.length === 0) return null

  return (
    <>
      <div className="tk-section-label" style={{ marginTop: '0.7rem' }}>IP Upgrades</div>
      <div className="tk-ip-note">
        {tags.map(t => (
          <span key={t.key} className={`tk-ip-tag${t.free ? ' tk-ip-tag-free' : ''}`}>
            {t.label}{t.free ? ' (free)' : ''}
          </span>
        ))}
      </div>
    </>
  )
}

function ConsumableBlock({ wi, warrior: w, wdata }) {
  const { toggleConsumable, useReliquary } = useTrackerStore()
  const hasReliquary = w.consumable === 'Reliquary'
  const desc = CONSUMABLES[w.consumable] || ''
  const ic = ITEM_ICONS[w.consumable] || ''
  const badgeLabel = 'CONSUMABLE · ' + (w.consumableUsed ? 'EXPENDED' : 'AVAILABLE')
  const allAbilities = wdata.abilities || []
  const reliquaryRestore = hasReliquary && !w.reliquaryUsed &&
    allAbilities.some(ab => w.opgUsed[ab.name] && canRestoreWithReliquary(ab.name))

  return (
    <div
      className={`tk-ability${w.consumableUsed ? ' tk-ability-used' : ''}`}
      onClick={!w.dead ? () => toggleConsumable(wi) : undefined}
      style={!w.dead ? { cursor: 'pointer' } : {}}
    >
      <div className="tk-ability-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {ic && (
            <img
              src={ic}
              style={{
                width: '18px', height: '18px', flexShrink: 0,
                ...(w.consumableUsed
                  ? { opacity: 0.2, filter: 'grayscale(1)' }
                  : { filter: 'sepia(0.3) brightness(0.95)', opacity: 0.85 }),
              }}
              alt=""
            />
          )}
          <span className="tk-ability-name">{w.consumable}</span>
        </div>
        <span className={`tk-opg-badge${w.consumableUsed ? ' tk-opg-used' : ''}`}>{badgeLabel}</span>
      </div>
      {desc && <div className="tk-ability-desc">{desc}</div>}
      {reliquaryRestore && (
        <button
          className="tk-reliquary-btn"
          onClick={e => { e.stopPropagation(); useReliquary(wi) }}
        >
          ⟳ Expend Reliquary — Restore Once Per Game Abilities
        </button>
      )}
      {hasReliquary && w.reliquaryUsed && (
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em', marginTop: '0.3rem' }}>
          RELIQUARY EXPENDED
        </div>
      )}
    </div>
  )
}

export default function WarriorTrackerCard({ warrior: w, wi }) {
  const { openCacheLoot, openStatusModal } = useTrackerStore()
  const wdata = WARRIORS[w.type]
  const portrait = WARRIOR_IMAGES[w.type]
  const improvedStat = (w.statImprove && w.ip?.includes('stat')) ? w.statImprove : null

  const statKeys = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']

  return (
    <div className={`tk-card${w.dead ? ' tk-dead' : ''}${w.isCaptain ? ' is-captain' : ''}`}>
      {/* Card Header */}
      <div className="tk-card-header">
        {portrait && (
          <img
            src={portrait}
            style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '1px solid #333', flexShrink: 0 }}
            alt=""
          />
        )}
        <span className="tk-name">{w.type}</span>
        <button className="tk-hdr-btn tk-hdr-btn-cache" onClick={() => openCacheLoot(wi)}>+ CACHE</button>
        <button className="tk-hdr-btn tk-hdr-btn-status" onClick={() => openStatusModal(wi)}>+ STATUS</button>
      </div>

      {/* Stat Strip */}
      <div className="tk-stats-strip">
        {statKeys.map(s => {
          const base = wdata.stats[s]
          let val = base
          if (improvedStat === s) val = improveStatDisplay(base, s)
          const isVit = s === 'VIT'
          return (
            <div key={s} className={`tk-stat${improvedStat === s ? ' tk-stat-improved' : ''}`}>
              <span className="tk-stat-lbl">{s}</span>
              <span className="tk-stat-val">
                {isVit ? w.maxVit : val}
              </span>
            </div>
          )
        })}
      </div>

      {/* Vitality Track */}
      <div className="tk-section-label">Vitality Track</div>
      <VitalityTrack wi={wi} warrior={w} />

      {/* IP Upgrades — self-labelling, renders null when empty */}
      <IPUpgradeNote warrior={w} />

      {/* Equipment */}
      <div className="tk-section-label" style={{ marginTop: '0.7rem' }}>Equipment</div>
      <EquipmentBlock warrior={w} />

      {/* Cache Items */}
      {w.cacheItems.length > 0 && (
        <>
          <div className="tk-section-label" style={{ marginTop: '0.7rem' }}>Cache Items</div>
          <CacheBlock wi={wi} warrior={w} />
        </>
      )}

      {/* Active Statuses */}
      {w.statuses.length > 0 && (
        <>
          <div className="tk-section-label" style={{ marginTop: '0.7rem', color: '#9a9add' }}>Active Statuses</div>
          <StatusBlock wi={wi} warrior={w} />
        </>
      )}

      {/* Abilities */}
      <div className="tk-section-label" style={{ marginTop: '0.7rem' }}>Abilities</div>
      <AbilityBlock wi={wi} warrior={w} wdata={wdata} />

      {/* Consumable */}
      {w.consumable && (
        <>
          <div className="tk-section-label" style={{ marginTop: '0.7rem' }}>Consumable</div>
          <div className="tk-abilities-block">
            <ConsumableBlock wi={wi} warrior={w} wdata={wdata} />
          </div>
        </>
      )}

      {/* Restrictions */}
      {wdata.restrictions && (
        <div className="tk-restrictions">{wdata.restrictions}</div>
      )}
    </div>
  )
}
