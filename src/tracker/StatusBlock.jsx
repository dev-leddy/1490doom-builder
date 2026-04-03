import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

const STATUS_SHORT = {
  'BREACHED':    'SKILL OR -1 VIT',
  'STUNNED':     'NO ACTIONS',
  'IMMOBILIZED': 'NO MOVE',
  'HINDERED':    'LOSE 1 ACTION',
  'SUNDERED':    '-1 COM (PERM)',
  'SWARMED':     '-1 COMBAT CHK',
}

function StatusDetailModal({ status, onClose, onClear, dead }) {
  return (
    <BottomSheet
      title={status.name}
      onClose={onClose}
      className="tk-sheet tk-sheet--status"
      footer={
        <>
          <button className="tk-detail-btn tk-detail-btn--ghost" onClick={onClose}>Close</button>
          <button className="tk-detail-btn tk-detail-btn--clear" onClick={onClear} disabled={dead}>
            Clear Status
          </button>
        </>
      }
    >
      <div className="tk-equip-detail-desc">{status.desc}</div>
    </BottomSheet>
  )
}

export default function StatusBlock({ wi, warrior: w }) {
  const [detail, setDetail] = useState(null)
  const removeStatus = useTrackerStore(s => s.removeStatus)

  const handleClear = () => {
    const d = detail
    setDetail(null)
    removeStatus(wi, d.id)
  }

  return (
    <>
      <div className="tk-status-grid">
        {w.statuses.map(status => (
          <button
            key={status.id}
            className="tk-status-card"
            onClick={() => !w.dead && setDetail(status)}
          >
            <span className="tk-status-card-name">{status.name}</span>
            {STATUS_SHORT[status.name] && (
              <div className="tk-status-card-sub">{STATUS_SHORT[status.name]}</div>
            )}
          </button>
        ))}
      </div>

      {detail && (
        <StatusDetailModal
          status={detail}
          onClose={() => setDetail(null)}
          onClear={handleClear}
          dead={w.dead}
        />
      )}
    </>
  )
}
