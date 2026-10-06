import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import ConfirmModal from '../shared/ConfirmModal'

// One line under the name: just enough to tell companies apart at a glance
function describe(save) {
  const warriors = (save.slots || []).filter(s => s?.type).length
  const parts = [`${warriors} ${warriors === 1 ? 'warrior' : 'warriors'}`]
  if (save.mark) parts.push(save.mark)
  return parts.join(' · ')
}

function SavedChip({ save, realIndex, onLoad, onDelete }) {
  const avatarSrc = getAvatarSrc(save.companyAvatar)
  const name = save.companyName || 'Unnamed Company'
  const isCampaign = save.companyMode === 'campaign'

  return (
    <div className={`saved-chip${isCampaign ? ' saved-chip--campaign' : ''}`}>
      <button type="button" className="saved-chip-open" onClick={() => onLoad(realIndex)}>
        <span className={`saved-chip-thumb${avatarSrc ? ' saved-chip-thumb--img' : ''}`} aria-hidden="true">
          {avatarSrc
            ? <img src={avatarSrc} className="saved-avatar-img" alt="" />
            : <span className="saved-chip-initial">{name.trim().charAt(0)}</span>}
        </span>
        <span className="saved-chip-text">
          <span className={`saved-chip-name${save.companyName ? '' : ' saved-chip-name--unnamed'}`}>{name}</span>
          <span className="saved-chip-meta">
            {isCampaign && (
              <span className="saved-chip-mode">Campaign · Game {(save.campaignGame || 0) + 1}</span>
            )}
            <span className="saved-chip-detail">{describe(save)}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        className="chip-delete"
        aria-label={`Delete ${name}`}
        title="Delete company"
        onClick={e => { e.stopPropagation(); onDelete(realIndex) }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
        </svg>
      </button>
    </div>
  )
}

export default function SaveLoadPanel({ onSelect }) {
  const { saves, savesLoaded, loadCompany, deleteCompany } = useBuilderStore()
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

  if (!saves.length) {
    return <span className="no-saves">{savesLoaded ? 'No companies saved yet.' : 'Loading your companies…'}</span>
  }

  // One list, most recently saved first (the order the server returns);
  // campaign companies carry their own tag instead of a separate section
  return (
    <div className="saved-section">
      <div className="saved-list">
        {saves.map((save, i) => (
          <SavedChip
            key={save.companyId || i}
            save={save}
            realIndex={i}
            onLoad={handleLoad}
            onDelete={setDeleteIndex}
          />
        ))}
      </div>

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
