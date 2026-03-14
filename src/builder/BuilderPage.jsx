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
import InstallButton from '../shared/InstallButton'
import './builder.css'

export default function BuilderPage() {
  const { validationMsg, dismissValidation, companyName, setCompanyName } = useBuilderStore()
  const openTracker = useTrackerStore(s => s.openTracker)
  const builderState = useBuilderStore(s => s)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handlePlay() {
    const result = openTracker(builderState)
    if (!result) useBuilderStore.getState()._toast('Add some warriors first!')
  }

  return (
    <div className="builder-page">
      {/* ── TOPBAR ─────────────────────────────────────── */}
      <BuilderTopbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* ── SCROLLABLE AREA ────────────────────────────── */}
      <div className="builder-scroll-area">
        <main className="builder-main">
          <div className="builder-name-row">
            <label htmlFor="builder-company-name">Company Name</label>
            <input
              id="builder-company-name"
              className="builder-name-input"
              type="text"
              placeholder="Name your Doom Company…"
              maxLength={40}
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>
          <div className="builder-content">
            <CompanyHeader />
            <IPPool />
            <WarriorRoster />
          </div>
        </main>

        <div id="print-roster">
          <PrintRoster />
        </div>

        <footer className="builder-attribution">
          <div className="attribution-logo-placeholder">Compatible with 1490 DOOM</div>
          <p className="attribution-text">
            This is an independent production by{' '}
            <a href="https://www.linkedin.com/in/michaelleddy/" target="_blank" rel="noopener noreferrer">Michael Leddy</a>
            {' '}and is not affiliated with or endorsed by Buer Games. All related IP is © Buer Games.
            Used with permission under the Buer Games Third Party License.
            Warrior and Mark artwork © Buer Games.
          </p>
        </footer>
      </div>

      {/* ── BOTTOM NAVBAR ──────────────────────────────── */}
      <BuilderNavbar onPlay={handlePlay} />

      {/* ── SIDEBAR (Saved Companies) ──────────────────── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-panel" onClick={e => e.stopPropagation()}>
            <div className="sidebar-header">
              <span className="sidebar-title">SAVED COMPANIES</span>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
            </div>
            <div className="sidebar-body">
              <SaveLoadPanel onSelect={() => setSidebarOpen(false)} />
              <div style={{ marginTop: '1.5rem' }}>
                <InstallButton />
              </div>
            </div>
          </div>
        </div>
      )}

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

/* ── TOPBAR ────────────────────────────────────────────── */
function BuilderTopbar({ onMenuToggle }) {
  const { companyName, setCompanyName } = useBuilderStore()

  return (
    <div className="builder-topbar">
      <div className="topbar-brand">
        <img src="/src/assets/1490doom_logo.png" alt="1490 DOOM" className="topbar-brand-logo" />
        <span className="topbar-brand-sub">Company Builder</span>
      </div>

      <button className="topbar-menu-btn" onClick={onMenuToggle} title="Saved Companies">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
    </div>
  )
}

/* ── BOTTOM NAVBAR ─────────────────────────────────────── */
function BuilderNavbar({ onPlay }) {
  const { saveCompany, rollRandom, openShare, openImport, clearBuilder, isDirty } = useBuilderStore()
  const dirty = isDirty()
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function handleSaveConfirm() {
    setConfirmSave(false)
    saveCompany()
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
          <button className={`btn ${dirty ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setConfirmSave(true)}>{dirty ? '● Save' : 'Save'}</button>
          <button className="btn btn-secondary" onClick={() => setConfirmClear(true)}>New</button>
        </div>
        <div className="navbar-group-center">
          <button className="btn btn-secondary" onClick={openShare} title="Share">
            <svg className="btn-icon-only" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
            </svg>
            <span className="btn-text-hide-xs">Share</span>
          </button>
          <button className="btn btn-secondary" onClick={openImport} title="Import">
            <svg className="btn-icon-only" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span className="btn-text-hide-xs">Import</span>
          </button>
          <button className="btn btn-secondary" onClick={handlePrint} title="Print">
            <svg className="btn-icon-only" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
            </svg>
            <span className="btn-text-hide-xs">Print</span>
          </button>
          <button className="btn btn-secondary" onClick={rollRandom}>Random</button>
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
          title="New Company"
          subtitle="Start a new company? Unsaved changes will be lost."
          onConfirm={handleClearConfirm}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </nav>
  )
}
