import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import ConfirmModal from '../shared/ConfirmModal'

function SavedChip({ save, realIndex, onLoad, onDelete }) {
  const avatarSrc = getAvatarSrc(save.companyAvatar)

  return (
    <div className="saved-chip" onClick={() => onLoad(realIndex)}>
      {avatarSrc
        ? <img src={avatarSrc} className="saved-avatar-img" alt="" />
        : <div className="saved-avatar-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
      }
      <span className="saved-chip-name">
        {save.companyName || 'Unnamed Company'}
      </span>
      <span
        className="chip-delete"
        onClick={e => { e.stopPropagation(); onDelete(realIndex) }}
      >✕</span>
    </div>
  )
}

function SaveSection({ title, items, onLoad, onDelete, isCampaign }) {
  if (!items.length) return null
  return (
    <div className="saved-section-group">
      <div className={`saved-section-header${isCampaign ? ' campaign' : ''}`}>
        <span>{title}</span>
      </div>
      <div className="saved-list">
        {items.map(({ save, realIndex }) => (
          <SavedChip
            key={realIndex}
            save={save}
            realIndex={realIndex}
            onLoad={onLoad}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

export default function SaveLoadPanel({ onSelect }) {
  const { saves, loadCompany, deleteCompany } = useBuilderStore()
  const [deleteIndex, setDeleteIndex] = useState(null)

  function handleLoad(i) {
    loadCompany(i)
    onSelect?.()
  }

  function handleDeleteConfirm() {
    if (deleteIndex !== null) {
      deleteCompany(deleteIndex)
      setDeleteIndex(null)
    }
  }

  const indexed = saves.map((save, i) => ({ save, realIndex: i }))
  const campaign = indexed.filter(({ save }) => save.companyMode === 'campaign')
  const standard = indexed.filter(({ save }) => save.companyMode !== 'campaign')

  if (!saves.length) {
    return <span className="no-saves">No companies saved yet.</span>
  }

  return (
    <div className="saved-section">
      <SaveSection
        title="Campaign"
        items={campaign}
        onLoad={handleLoad}
        onDelete={setDeleteIndex}
        isCampaign={true}
      />
      <SaveSection
        title="Standard"
        items={standard}
        onLoad={handleLoad}
        onDelete={setDeleteIndex}
        isCampaign={false}
      />

      {deleteIndex !== null && (
        <ConfirmModal
          title="Delete Company"
          subtitle={`Delete "${saves[deleteIndex]?.companyName || 'Unnamed Company'}"?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteIndex(null)}
        />
      )}
    </div>
  )
}
