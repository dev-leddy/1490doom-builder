import { useTrackerStore } from '../store/trackerStore'
import { STATUS_DEFS } from '../data/items'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

export default function StatusModal({ wi }) {
  const { addStatus, closeStatusModal } = useTrackerStore()

  return (
    <BottomSheet
      title="APPLY STATUS EFFECT"
      onClose={closeStatusModal}
      className="tk-sheet tk-sheet--status"
    >
      {STATUS_DEFS.map(([name, desc]) => (
        <button
          key={name}
          className="status-item-btn"
          onClick={() => addStatus(wi, name)}
        >
          <strong className="status-item-name">
            {ITEM_ICONS[name] && (
              <img src={ITEM_ICONS[name]} style={{ width: '1.2rem', height: '1.2rem', filter: 'brightness(0) invert(1)', opacity: 0.9, flexShrink: 0 }} alt="" />
            )}
            {name}
          </strong>
          <div className="status-item-desc">{desc}</div>
        </button>
      ))}
    </BottomSheet>
  )
}
