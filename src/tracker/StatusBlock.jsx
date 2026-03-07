import { useTrackerStore } from '../store/trackerStore'

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
            <span className="tk-ability-name" style={{ color: 'var(--purple)' }}>
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
