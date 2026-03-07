import { useBuilderStore } from '../store/builderStore'

export default function SaveLoadPanel() {
  const { saves, loadCompany, deleteCompany } = useBuilderStore()

  return (
    <div className="saved-section">
      <SectionHeader title="Saved Companies" />
      {!saves.length ? (
        <span className="no-saves">No companies saved yet.</span>
      ) : (
        <div className="saved-list">
          {saves.map((save, i) => (
            <div key={i} className="saved-chip" onClick={() => loadCompany(i)}>
              <span>{save.companyName || 'Unnamed Company'}</span>
              <span
                className="chip-delete"
                onClick={e => { e.stopPropagation(); deleteCompany(i) }}
              >
                ✕
              </span>
            </div>
          ))}
        </div>
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
