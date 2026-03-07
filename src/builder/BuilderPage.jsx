import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useTrackerStore } from '../store/trackerStore'
import CompanyHeader from './CompanyHeader'
import IPPool from './IPPool'
import WarriorRoster from './WarriorRoster'
import SaveLoadPanel from './SaveLoadPanel'
import ShareModal from './ShareModal'
import ImportModal from './ImportModal'
import ConfirmModal from '../shared/ConfirmModal'
import PrintRoster from './PrintRoster'
import './builder.css'

export default function BuilderPage() {
  const { validationMsg, dismissValidation } = useBuilderStore()
  const openTracker = useTrackerStore(s => s.openTracker)
  const builderState = useBuilderStore(s => s)

  function handlePlay() {
    const result = openTracker(builderState)
    if (!result) useBuilderStore.getState()._toast('Add some warriors first!')
  }

  return (
    <div className="builder-page">
      <header className="builder-header">
        <div className="builder-title-main">1490 DOOM</div>
        <div className="builder-title-sub">Doom Company Builder</div>
      </header>

      <BuilderNavbar onPlay={handlePlay} />

      <main className="builder-main">
        <SaveLoadPanel />
        <div className="builder-content">
          <CompanyHeader />
          <IPPool />
          <WarriorRoster />
        </div>
      </main>

      <div id="print-roster">
        <PrintRoster />
      </div>

      <ShareModal />
      <ImportModal />

      {validationMsg && (
        <ConfirmModal
          title="Cannot Save"
          subtitle={validationMsg}
          onConfirm={dismissValidation}
          onCancel={dismissValidation}
        />
      )}
    </div>
  )
}

function BuilderNavbar({ onPlay }) {
  const { isDirty, saveCompany, rollRandom, openShare, openImport, clearBuilder } = useBuilderStore()
  const dirty = isDirty()
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function handleSaveClick() {
    setConfirmSave(true)
  }

  function handleSaveConfirm() {
    setConfirmSave(false)
    saveCompany()
  }

  function handleClearClick() {
    setConfirmClear(true)
  }

  function handleClearConfirm() {
    setConfirmClear(false)
    clearBuilder()
  }

  function handlePrint() {
    window.print()
  }

  return (
    <nav className="builder-navbar">
      <div className="navbar-inner">
        <div className="navbar-group-left">
          <button className="btn btn-primary" onClick={handleSaveClick}>Save</button>
          <button className="btn btn-ghost" onClick={handleClearClick}>Clear</button>
          {dirty && <span className="unsaved-indicator">● UNSAVED</span>}
        </div>
        <div className="navbar-group-center">
          <button className="btn btn-gold" onClick={rollRandom}>Random</button>
          <button className="btn btn-secondary" onClick={openImport} title="Import">
            <svg className="btn-icon-only" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span className="btn-text-hide-xs">Import</span>
          </button>
          <button className="btn btn-secondary" onClick={openShare} title="Share">
            <svg className="btn-icon-only" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
            </svg>
            <span className="btn-text-hide-xs">Share</span>
          </button>
          <button className="btn btn-secondary" onClick={handlePrint} title="Print">
            <svg className="btn-icon-only" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
            </svg>
            <span className="btn-text-hide-xs">Print</span>
          </button>
        </div>
        <div className="navbar-group-right">
          <button className="btn btn-gold btn-play" onClick={onPlay}>⚔ Play</button>
        </div>
      </div>

      {confirmSave && (
        <ConfirmModal
          title="Save Company"
          subtitle="Save this company to your browser's local storage?"
          onConfirm={handleSaveConfirm}
          onCancel={() => setConfirmSave(false)}
        />
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear Roster"
          subtitle="Clear the roster? This cannot be undone."
          onConfirm={handleClearConfirm}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </nav>
  )
}
