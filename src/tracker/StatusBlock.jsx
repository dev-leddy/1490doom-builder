import { useTrackerStore } from '../store/trackerStore'
import { ITEM_ICONS } from '../data/images'

export default function StatusBlock({ wi, warrior: w }) {
  const removeStatus = useTrackerStore(s => s.removeStatus)

  return (
    <div className="tk-abilities-block">
      {w.statuses.map(status => (
        <div
          key={status.id}
          className="tk-ability"
          style={{ cursor: 'pointer', borderLeftColor: 'var(--purple)' }}
          onClick={() => removeStatus(wi, status.id)}
        >
          <div className="tk-ability-header">
            <span className="tk-ability-name" style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {ITEM_ICONS[status.name] && (
                <img src={ITEM_ICONS[status.name]} style={{ width: '1.1rem', height: '1.1rem', filter: 'brightness(0) invert(1)', opacity: 0.9 }} alt="" />
              )}
              {status.name}
            </span>
            <span className="tk-opg-badge" style={{ borderColor: 'var(--purple-border)', color: 'var(--purple)', background: 'var(--purple-bg)' }}>
              CLEAR
            </span>
          </div>
          <div className="tk-ability-desc">{status.desc}</div>
        </div>
      ))}
    </div>
  )
}
