import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WARRIOR_IMAGES } from '../data/images'
import { WEAPONS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import BottomSheet from '../shared/BottomSheet'
import VitalityTrack from './VitalityTrack'
import EquipmentBlock from './EquipmentBlock'
import AbilityBlock from './AbilityBlock'
import StatusBlock from './StatusBlock'
import { getEffectiveStats, improvedStats, statTone, STAT_KEYS } from '../utils/stats'

// IP upgrades in play: their effects already show (stats, gear), so the header only says how
// many there are (under + CACHE / + STATUS); tapping lists them with what each does.
function ipUpgrades(w) {
  const wdata = WARRIORS[w.type]
  const upgrades = w.ip || []
  const list = []

  // Every stat improvement (campaign companies can have several)
  for (const s of improvedStats(w)) list.push({ key: 'stat-' + s, kind: 'Stat improvement', name: STAT_IMPROVEMENT[s], desc: null })

  // Built-in gear isn't an IP upgrade: Knight / Hedge Knight shield, Reaver's second Light Weapon
  if (w.weapon2) {
    const isBuiltIn = (wdata?.fixedShield && w.weapon2 === 'Shield') ||
                      (wdata?.fixedDualWield && w.weapon2 === 'Light Weapon')
    const wd = WEAPONS[w.weapon2]
    if (!isBuiltIn && upgrades.includes('weapon2'))
      list.push({ key: 'weapon2', kind: 'Second weapon', name: w.weapon2, desc: wd?.offhandNote || wd?.note || null })
  }

  if (w.climbing && w.climbing !== 'None' && upgrades.includes('climbing'))
    list.push({ key: 'climbing', kind: 'Climbing', name: w.climbing, desc: CLIMBING_DESCS[w.climbing] || null })

  if (w.consumable && upgrades.includes('consumable'))
    list.push({ key: 'consumable', kind: 'Consumable', name: w.consumable, desc: CONSUMABLES[w.consumable] || null })

  return list
}

function IPUpgrades({ warrior: w }) {
  const [open, setOpen] = useState(false)
  const list = ipUpgrades(w)
  if (list.length === 0) return null
  return (
    <>
      <button
        type="button"
        className="tk-hdr-btn tk-hdr-btn-ip"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Show ${list.length} IP upgrade${list.length === 1 ? '' : 's'}`}
      >
        <span className="tk-ip-count">{list.length}</span> IP<svg className="tk-ip-info" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" /><rect x="7.25" y="7" width="1.5" height="4.5" fill="currentColor" /><rect x="7.25" y="4.2" width="1.5" height="1.5" fill="currentColor" /></svg>
      </button>
      {open && (
        <BottomSheet
          title="IP UPGRADES"
          onClose={() => setOpen(false)}
          className="tk-sheet"
          footer={<button className="tk-detail-btn tk-detail-btn--ghost" style={{ flex: 1 }} onClick={() => setOpen(false)}>Close</button>}
        >
          <div className="tk-ip-list">
            {list.map(u => (
              <div key={u.key} className="tk-ip-item">
                <span className="tk-ip-kind">{u.kind}</span>
                <span className="tk-ip-name">{u.name}</span>
                {u.desc && <span className="tk-ip-desc">{u.desc}</span>}
              </div>
            ))}
          </div>
        </BottomSheet>
      )}
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
          <IPUpgrades warrior={w} />
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
