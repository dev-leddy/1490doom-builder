import { useTrackerStore } from '../store/trackerStore'
import { STATUS_DEFS } from '../data/items'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

export default function StatusModal({ wi, companion = false }) {
  const { addStatus, closeStatusModal, addCompanionStatus, closeCompanionStatus, warriors } = useTrackerStore()
  const pick = companion ? addCompanionStatus : addStatus
  const close = companion ? closeCompanionStatus : closeStatusModal
  const target = companion ? warriors[wi]?.companion : warriors[wi]
  const targetName = companion ? target?.name : (target?.customName || target?.type)
  const active = new Set((target?.statuses || []).map(s => s.name))

  return (
    <BottomSheet
      title="APPLY STATUS"
      onClose={close}
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
          onClick={() => pick(wi, name)}
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
