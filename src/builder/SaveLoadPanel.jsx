import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import ConfirmModal from '../shared/ConfirmModal'

function SavedChip({ save, realIndex, onLoad, onDelete }) {
  const avatarSrc = getAvatarSrc(save.companyAvatar)

  return (
    <div className="saved-chip" onClick={() => onLoad(realIndex)}>
      {avatarSrc && <img src={avatarSrc} className="saved-avatar-img" alt="" />}
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
