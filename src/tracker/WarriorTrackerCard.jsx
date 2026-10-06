import { useTrackerStore } from '../store/trackerStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WARRIOR_IMAGES } from '../data/images'
import VitalityTrack from './VitalityTrack'
import EquipmentBlock from './EquipmentBlock'
import AbilityBlock from './AbilityBlock'
import StatusBlock from './StatusBlock'
import { getEffectiveStats, improvedStats, statTone, STAT_KEYS } from '../utils/stats'

function IPUpgradeNote({ warrior: w }) {
  const wdata = WARRIORS[w.type]
  const upgrades = w.ip || []
  const tags = []

  // Every stat improvement (campaign companies can have several)
  for (const s of improvedStats(w)) tags.push({ key: 'stat-' + s, label: STAT_IMPROVEMENT[s], free: false })

  // Built-in gear isn't an IP upgrade: Knight / Hedge Knight shield, Reaver's second Light Weapon
  if (w.weapon2) {
    const isBuiltIn = (wdata?.fixedShield && w.weapon2 === 'Shield') ||
                      (wdata?.fixedDualWield && w.weapon2 === 'Light Weapon')
    if (!isBuiltIn && upgrades.includes('weapon2'))
      tags.push({ key: 'weapon2', label: w.weapon2, free: false })
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

export default function WarriorTrackerCard({ warrior: w, wi }) {
  const { openCacheLoot, openStatusModal, toggleActivated } = useTrackerStore()
  const wdata = WARRIORS[w.type]
  const portrait = WARRIOR_IMAGES[w.type]
  const stats = getEffectiveStats(w, { statuses: w.statuses })

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
        </div>
        <div className="tk-warrior-header-text">
          <span className="tk-name-line">
            <span className="tk-name">{w.customName || w.type}</span>
            {(w.dead || w.currentVit <= 0) && <span className="tk-slain-pill">SLAIN</span>}
          </span>
          {/* Class under a custom name (not under the portrait, so the header keeps the portrait's height) */}
          {w.customName && <span className="tk-class-sub">{w.type}</span>}
          {!w.dead && (
            <button
              className={`tk-activated-btn${w.activated ? ' tk-activated-btn-active' : ''}`}
              onClick={() => toggleActivated(wi)}
            >
              <span className="tk-activated-label">{w.activated ? '✓ ACTIVATED' : 'UNACTIVATED'}</span>
              {/* invisible copy of the longer label sets the width, so both states match */}
              <span className="tk-activated-sizer" aria-hidden="true">UNACTIVATED</span>
            </button>
          )}
        </div>
        <div className="tk-hdr-btn-group">
          <button className="tk-hdr-btn tk-hdr-btn-cache" onClick={() => openCacheLoot(wi)}>+ CACHE</button>
          <button className="tk-hdr-btn tk-hdr-btn-status" onClick={() => openStatusModal(wi)}>+ STATUS</button>
        </div>
      </div>

      {/* Statuses up top, between the header and the stats they change */}
      {w.statuses.length > 0 && <StatusBlock wi={wi} warrior={w} />}

      {/* Stat Strip */}
      <div className="tk-stats-strip">
        {STAT_KEYS.map(s => {
          const toneClass = { improved: 'tk-stat-improved', debuffed: 'tk-stat-debuffed' }[statTone(stats[s])] || ''
          return (
            <div key={s} className={`tk-stat ${toneClass}`}>
              <span className="tk-stat-lbl">{s}</span>
              <span className="tk-stat-val">{s === 'VIT' ? w.maxVit : stats[s].display}</span>
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
