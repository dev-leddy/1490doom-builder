import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import ConfirmModal from '../shared/ConfirmModal'

export default function SaveLoadPanel() {
  const { saves, loadCompany, deleteCompany } = useBuilderStore()
  const [deleteIndex, setDeleteIndex] = useState(null)

  function handleDeleteConfirm() {
    if (deleteIndex !== null) {
      deleteCompany(deleteIndex)
      setDeleteIndex(null)
    }
  }

  return (
    <div className="saved-section">
      {!saves.length ? (
        <span className="no-saves">No companies saved yet.</span>
      ) : (
        <div className="saved-list">
          {saves.map((save, i) => (
            <div key={i} className="saved-chip" onClick={() => loadCompany(i)}>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {save.companyName || 'Unnamed Company'}
              </span>
              <span
                className="chip-delete"
                onClick={e => { e.stopPropagation(); setDeleteIndex(i) }}
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      )}

      {deleteIndex !== null && (
        <ConfirmModal
          title="Delete Company"
          subtitle={`Are you sure you want to delete "${saves[deleteIndex]?.companyName || 'Unnamed Company'}"?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteIndex(null)}
        />
      )}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      <div className="section-line" />
    </div>
  )
}
