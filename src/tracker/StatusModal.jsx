import { useTrackerStore } from '../store/trackerStore'
import { STATUS_DEFS } from '../data/items'

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
            <strong className="status-item-name">{name}</strong>
            <div className="status-item-desc">{desc}</div>
          </button>
        ))}
        <button className="btn btn-ghost btn-full" onClick={closeStatusModal}>CANCEL</button>
      </div>
    </div>
  )
}
