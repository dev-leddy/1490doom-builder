import { useTrackerStore, canRestoreWithReliquary } from '../store/trackerStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WARRIOR_IMAGES, ITEM_ICONS } from '../data/images'
import { CONSUMABLES, WEAPONS } from '../data/weapons'
import VitalityTrack from './VitalityTrack'
import EquipmentBlock from './EquipmentBlock'
import AbilityBlock from './AbilityBlock'
import StatusBlock from './StatusBlock'

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) - 1) + '+'
  return parseInt(base) + 1
}

function debuffStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) + 1) + '+'
  return Math.max(0, parseInt(base) - 1)
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
            {t.label}
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
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em', marginTop: '0.3rem' }}>
          RELIQUARY EXPENDED
        </div>
      )}
    </div>
  )
}

export default function WarriorTrackerCard({ warrior: w, wi }) {
  const { openCacheLoot, openStatusModal, toggleActivated } = useTrackerStore()
  const wdata = WARRIORS[w.type]
  const portrait = WARRIOR_IMAGES[w.type]
  const improvedStat = (w.statImprove && w.ip?.includes('stat')) ? w.statImprove : null

  const statKeys = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']

  return (
    <div className={`tk-card${w.dead ? ' tk-dead' : ''}${w.isCaptain ? ' is-captain' : ''}`}>
      {/* Card Header */}
      <div className="tk-card-header">
        <div className="tk-slot-portrait-col">
          {portrait && (
            <div className="tk-portrait-ring">
              <div className="tk-portrait-inner">
                <img
                  src={portrait}
                  className="tk-portrait-img"
                  alt=""
                />
              </div>
            </div>
          )}
          {w.customName && <div className="tk-slot-class-label">{w.type}</div>}
        </div>
        <div className="tk-warrior-header-text">
          <span className="tk-name">{w.customName || w.type}</span>
          {!w.dead && (
            <button
              className={`tk-activated-btn${w.activated ? ' tk-activated-btn-active' : ''}`}
              onClick={() => toggleActivated(wi)}
            >
              {w.activated ? '✓ ACTIVATED' : 'UNACTIVATED'}
            </button>
          )}
        </div>
        <div className="tk-hdr-btn-group">
          <button className="tk-hdr-btn tk-hdr-btn-cache" onClick={() => openCacheLoot(wi)}>+ CACHE</button>
          <button className="tk-hdr-btn tk-hdr-btn-status" onClick={() => openStatusModal(wi)}>+ STATUS</button>
        </div>
      </div>

      {/* Stat Strip */}
      <div className="tk-stats-strip">
        {statKeys.map(s => {
          let base = wdata.stats[s]
          
          if (s === 'ATK') {
            const isDualWielding = w.weapon1 === 'Light Weapon' && w.weapon2 === 'Light Weapon'
            const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0
            base = parseInt(base) + dualWieldBonus
          }
          
          const isVit = s === 'VIT'
          const polearmDebuff = w.weapon1 === 'Polearm (one-handed)' && s === 'COM'
          const statusDebuffCOM = s === 'COM' && w.statuses.some(st => st.name === 'SWARMED' || st.name === 'SUNDERED')
          const isComDebuffed = (polearmDebuff || statusDebuffCOM) && !isVit

          let val = base
          if (improvedStat === s) val = improveStatDisplay(base, s)
          else if (isComDebuffed) val = debuffStatDisplay(base, s)

          const isDualWieldImproved = s === 'ATK' && w.weapon1 === 'Light Weapon' && w.weapon2 === 'Light Weapon' && !wdata.fixedDualWield
          const isStatImproved = improvedStat === s || isDualWieldImproved

          let statClass = ''
          if (isStatImproved) statClass = 'tk-stat-improved'
          else if (isComDebuffed) statClass = 'tk-stat-debuffed'
          
          return (
            <div key={s} className={`tk-stat ${statClass}`}>
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

      {/* Equipment (weapons, climbing, consumable, cache items) */}
      <div className="tk-section-label" style={{ marginTop: '0.7rem' }}>Equipment</div>
      <EquipmentBlock wi={wi} warrior={w} />

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

      {/* Homebrew Notes */}
      {(w.notes || []).length > 0 && (
        <>
          <div className="tk-section-label" style={{ marginTop: '0.7rem', color: '#be4127' }}>Notes</div>
          <div className="tk-abilities-block">
            {(w.notes || []).map((n, ni) => (
              <div key={ni} className="tk-ability">
                <div className="tk-ability-header">
                  <span className="tk-ability-name">{n.title || 'Note'}</span>
                </div>
                {n.body && <div className="tk-ability-desc">{n.body}</div>}
              </div>
            ))}
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
