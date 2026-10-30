import { useBuilderStore } from '../store/builderStore'
import SaveLoadPanel from './SaveLoadPanel'

// Your companies: the signed-in player's companies in two sections, Skirmish then Campaign
// (most players only have skirmish ones), most recently saved first in each. Both headings
// always show; an empty section offers to start one.
export default function CompaniesPage({ onLoad, onNew, onBack }) {
  const { saves, savesLoaded } = useBuilderStore()
  const indexed = saves.map((save, i) => [save, i])
  const skirmish = indexed.filter(([s]) => s.companyMode !== 'campaign')
  const campaign = indexed.filter(([s]) => s.companyMode === 'campaign')

  const section = (id, title, items, empty, emptyAction) => (
    <section className="companies-section" aria-labelledby={`companies-${id}`}>
      <h2 id={`companies-${id}`} className="companies-section-head">
        {title}{items.length > 0 && <span className="landing-saves-count">{items.length}</span>}
      </h2>
      {items.length > 0
        ? <SaveLoadPanel items={items} onSelect={onLoad} />
        : savesLoaded && (
          <p className="companies-empty">
            {empty && <>{empty}<br /></>}
            <button type="button" className="companies-empty-btn" onClick={emptyAction.onClick}>{emptyAction.label} →</button>
          </p>
        )}
    </section>
  )

  return (
    <div className="landing-content">
      <div className="companies-page-head">
        <button type="button" className="companies-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          Home
        </button>
        <button type="button" className="landing-new-company-btn" onClick={() => onNew()}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New company
        </button>
      </div>

      <h1 className="companies-title">Your companies</h1>
      {!savesLoaded && <p className="no-saves">Loading your companies…</p>}

      {section('skirmish', 'Skirmish', skirmish, 'No skirmish companies yet.', { label: 'Build one', onClick: () => onNew() })}
      {section('campaign', 'Campaign', campaign, null,{ label: 'Start a campaign', onClick: () => onNew('campaign') })}
    </div>
  )
}
