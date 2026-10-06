import { useTrackerStore } from '../store/trackerStore'
import { STATUS_DEFS } from '../data/items'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

export default function StatusModal({ wi }) {
  const { addStatus, closeStatusModal, warriors } = useTrackerStore()
  const target = warriors[wi]
  const targetName = target?.customName || target?.type
  const active = new Set((target?.statuses || []).map(s => s.name))

  return (
    <BottomSheet
      title="APPLY STATUS"
      onClose={closeStatusModal}
      className="tk-sheet tk-sheet--status"
    >
      <p className="tk-sheet-intro">
        <span className="tk-sheet-intro-label">Target</span>
        {targetName}. Tap a status to apply it.
      </p>
      <div className="tk-sheet-list">
      {STATUS_DEFS.map(([name, desc]) => (
        <button
          key={name}
          className={`status-item-btn${active.has(name) ? ' is-active' : ''}`}
          onClick={() => addStatus(wi, name)}
        >
          <strong className="status-item-name">
            {ITEM_ICONS[name] && (
              <img src={ITEM_ICONS[name]} className="tk-sheet-item-icon" alt="" />
            )}
            <span className="status-item-title">{name}</span>
            {active.has(name) && <span className="tk-sheet-chip">Active</span>}
          </strong>
          <span className="status-item-desc">{desc}</span>
        </button>
      ))}
      </div>
    </BottomSheet>
  )
}
