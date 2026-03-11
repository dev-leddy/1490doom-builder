import { useTrackerStore } from '../store/trackerStore'
import { STATUS_DEFS } from '../data/items'
import { ITEM_ICONS } from '../data/images'

export default function StatusModal({ wi }) {
  const { addStatus, closeStatusModal } = useTrackerStore()

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeStatusModal()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="tracker-modal-title">APPLY STATUS EFFECT</div>
        {STATUS_DEFS.map(([name, desc]) => (
          <button
            key={name}
            className="status-item-btn"
            onClick={() => addStatus(wi, name)}
          >
            <strong className="status-item-name" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {ITEM_ICONS[name] && (
                <img src={ITEM_ICONS[name]} style={{ width: '1.2rem', height: '1.2rem', filter: 'brightness(0) invert(1)', opacity: 0.9, flexShrink: 0 }} alt="" />
              )}
              {name}
            </strong>
            <div className="status-item-desc">{desc}</div>
          </button>
        ))}
        <button className="btn btn-ghost btn-full" onClick={closeStatusModal}>CANCEL</button>
      </div>
    </div>
  )
}
