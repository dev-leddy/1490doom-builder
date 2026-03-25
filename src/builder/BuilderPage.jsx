import { useState, useEffect } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import { useTrackerStore } from '../store/trackerStore'
import { MARK_ID_MAP } from '../data/quizData'
import CompanyHeader from './CompanyHeader'
import WarriorRoster from './WarriorRoster'
import SaveLoadPanel from './SaveLoadPanel'
import ShareModal from './ShareModal'
import ImportModal from './ImportModal'
import ConfirmModal from '../shared/ConfirmModal'
import PrintRoster from './PrintRoster'
import InstallButton from '../shared/InstallButton'
import EndOfGameModal from './EndOfGameModal'
import CompanyForm from './CompanyForm'
import ModeSelectModal from './ModeSelectModal'
import LandingPage, { RefContent } from './LandingPage'
import './builder.css'

export default function BuilderPage() {
  const { validationMsg, dismissValidation, openShare, openImport, clearBuilder, setCompanyMode, companyMode, campaignGame, isDirty, setMark } = useBuilderStore()
  const openTracker = useTrackerStore(s => s.openTracker)
  const builderState = useBuilderStore(s => s)

  // 'landing' | 'builder'
  const [view, setView] = useState(() =>
    window.location.hash ? 'builder' : 'landing'
  )
  // global quick reference overlay — works from any view
  const [refOpen, setRefOpen] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modeSelectOpen, setModeSelectOpen] = useState(false)
  const [endOfGameOpen, setEndOfGameOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)

  // Auto-import quiz results from standalone quiz via ?quiz= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const quizParam = params.get('quiz')
    if (quizParam) {
      try {
        const payload = JSON.parse(quizParam)
        const mark = MARK_ID_MAP[payload.companyId]
        if (mark) {
          clearBuilder()
          setMark(mark)
          if (useBuilderStore.getState().applyQuizCompany) {
            useBuilderStore.getState().applyQuizCompany({
              mark,
              companyName: payload.companyName,
              warriors: payload.warriors,
            })
          }
          setView('builder')
        }
      } catch (e) { /* ignore malformed param */ }
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line

  function goBuilder() { setView('builder') }

  function handleGoHome() {
    if (isDirty()) {
      setBackConfirmOpen(true)
    } else {
      setRefOpen(false)
      setView('landing')
    }
  }

  function handleLogoClick() {
    if (refOpen) {
      setRefOpen(false)
    } else if (view === 'builder') {
      handleGoHome()
    }
  }

  function handlePlay() {
    const result = openTracker(builderState)
    if (!result) useBuilderStore.getState()._toast('Add some warriors first!')
  }

  function handlePrint() {
    setSidebarOpen(false)
    setTimeout(() => window.print(), 100)
  }

  function handleNew() {
    setSidebarOpen(false)
    setModeSelectOpen(true)
  }

  function handleModeSelect(mode, name, avatar, warriors, ip, randomPreview = null) {
    setModeSelectOpen(false)
    clearBuilder()
    setCompanyMode(mode)
    const s = useBuilderStore.getState()
    if (randomPreview) {
      s.applyRandomResult(randomPreview)
      if (name) s.setCompanyName(name)
      if (avatar) s.setCompanyAvatar(avatar)
    } else {
      if (name) s.setCompanyName(name)
      if (avatar) s.setCompanyAvatar(avatar)
      const diff = warriors - 3
      if (diff > 0) for (let i = 0; i < diff; i++) s.addSlot()
      else if (diff < 0) for (let i = 0; i < -diff; i++) s.removeSlot()
      if (mode === 'campaign') {
        if (ip > 0) s.setEarnedIPAll(ip)
      } else {
        const ipDiff = ip - 3
        if (ipDiff !== 0) s.changeIPLimit(ipDiff)
      }
    }
    setView('builder')
  }

  function handleLoadCompany() {
    setSidebarOpen(false)
    setView('builder')
  }

  return (
    <div className="builder-page">
      {/* ── TOPBAR ─────────────────────────────────────── */}
      <BuilderTopbar
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onHome={handleLogoClick}
        onRef={() => setRefOpen(v => !v)}
        refActive={refOpen}
      />

      {/* ── SCROLLABLE AREA ────────────────────────────── */}
      <div className="builder-scroll-area">
        {refOpen ? (
          <RefContent onBack={() => setRefOpen(false)} />
        ) : view === 'landing' ? (
          <LandingPage onLoad={goBuilder} />
        ) : (
          <main className="builder-main">
            <button className="builder-home-btn" onClick={handleGoHome}>← Home</button>
            <CompanyHeader onSettings={() => setSettingsOpen(true)} />
            <WarriorRoster />
          </main>
        )}

        {view === 'builder' && !refOpen && (
          <footer className="builder-attribution">
            <p className="attribution-text" style={{ textAlign: 'center', lineHeight: '1.4' }}>
              An Official 1490 DOOM Production &nbsp;·&nbsp; Buer Games<br />
              By <a href="https://www.linkedin.com/in/michaelleddy/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Michael Leddy</a>
            </p>
          </footer>
        )}
      </div>

      {/* ── PRINT ROSTER ───────────────────────────────── */}
      <div id="print-roster">
        <PrintRoster />
      </div>

      {/* ── BOTTOM NAVBAR ──────────────────────────────── */}
      {view === 'landing' && !refOpen
        ? <LandingNavbar
            refOpen={refOpen}
            onRef={() => setRefOpen(v => !v)}
            onNew={handleNew}
          />
        : view === 'builder' && !refOpen
          ? <BuilderNavbar onPlay={handlePlay} onEndOfGame={() => setEndOfGameOpen(true)} />
          : null
      }

      {/* ── SIDEBAR (Saved Companies) ──────────────────── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-panel" onClick={e => e.stopPropagation()}>
            <div className="sidebar-actions">
              <button className="btn btn-secondary sidebar-action-btn" onClick={handleNew}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                New
              </button>
              <button className="btn btn-secondary sidebar-action-btn" onClick={() => { setSidebarOpen(false); openShare() }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg>
                Share
              </button>
              <button className="btn btn-secondary sidebar-action-btn" onClick={() => { setSidebarOpen(false); openImport() }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                Import
              </button>
              <button className="btn btn-secondary sidebar-action-btn" onClick={handlePrint}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                Print
              </button>
            </div>
            <div className="sidebar-header">
              <div>
                <span className="sidebar-title">SAVED COMPANIES</span>
                {companyMode === 'campaign' && (
                  <span className="sidebar-mode-badge campaign">CAMPAIGN · Game {campaignGame}</span>
                )}
              </div>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
            </div>
            <div className="sidebar-body">
              <SaveLoadPanel onSelect={handleLoadCompany} />
              <div style={{ marginTop: '1.5rem' }}>
                <InstallButton />
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareModal />
      <ImportModal />

      {modeSelectOpen && (
        <ModeSelectModal
          onSelect={handleModeSelect}
          onCancel={() => setModeSelectOpen(false)}
        />
      )}

      {endOfGameOpen && (
        <EndOfGameModal onClose={() => setEndOfGameOpen(false)} />
      )}

      {settingsOpen && (
        <CompanySettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      {backConfirmOpen && (
        <ConfirmModal
          title="Unsaved Changes"
          subtitle="You have unsaved changes. Return to home? Your work is auto-saved as a draft."
          onConfirm={() => { setBackConfirmOpen(false); setRefOpen(false); setView('landing') }}
          onCancel={() => setBackConfirmOpen(false)}
        />
      )}

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

/* ── COMPANY SETTINGS MODAL ────────────────────────────── */
function CompanySettingsModal({ onClose }) {
  const { companyName, setCompanyName, companyAvatar, setCompanyAvatar, ipLimit, changeIPLimit, slots, addSlot, removeSlot, companyMode, setEarnedIP } = useBuilderStore()
  const [name, setName] = useState(companyName)
  const [avatar, setAvatar] = useState(companyAvatar)
  const activeSlots = slots.map((s, i) => ({ ...s, index: i })).filter(s => s.type)

  function handleClose() {
    setCompanyName(name)
    setCompanyAvatar(avatar)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal-box co-settings-modal">
        <div className="modal-title">COMPANY SETTINGS</div>
        <CompanyForm
          name={name} setName={setName}
          avatar={avatar} setAvatar={setAvatar}
          warriors={slots.length} setWarriors={w => {
            const diff = w - slots.length
            if (diff > 0) for (let i = 0; i < diff; i++) addSlot()
            else if (diff < 0) for (let i = 0; i < -diff; i++) removeSlot()
          }}
          ip={ipLimit} setIp={newVal => changeIPLimit(newVal - ipLimit)}
          companyMode={companyMode}
          activeSlots={activeSlots.map(s => ({
            ...s,
            onEarnedChange: (val) => setEarnedIP(s.index, val)
          }))}
        />
        <button className="modal-primary-btn" style={{ width: '100%', marginTop: '1rem' }} onClick={handleClose}>Done</button>
      </div>
    </div>
  )
}

/* ── TOPBAR ────────────────────────────────────────────── */
function BuilderTopbar({ onMenuToggle, onHome, onRef, refActive }) {
  return (
    <div className="builder-topbar">
      <button className="topbar-menu-btn" onClick={onMenuToggle} title="Saved Companies">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>

      <button className="topbar-brand" onClick={onHome} title="Home">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="1490 DOOM" className="topbar-brand-logo" />
        <span className="topbar-brand-sub">Company Builder</span>
      </button>

      <button
        className={`topbar-ref-btn${refActive ? ' topbar-ref-btn--active' : ''}`}
        onClick={onRef}
        title="Quick Reference"
        aria-pressed={refActive}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z"/>
        </svg>
      </button>
    </div>
  )
}

/* ── LANDING NAVBAR ────────────────────────────────────── */
function LandingNavbar({ refOpen, onRef, onNew }) {
  return (
    <nav className="builder-navbar landing-navbar">
      <div className="landing-navbar-inner">
        {/* Mobile-only: Quick Reference button (hidden on desktop via CSS — topbar icon takes over) */}
        <button
          className={`landing-ref-btn${refOpen ? ' landing-ref-btn--active' : ''}`}
          onClick={onRef}
          aria-pressed={refOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z"/>
          </svg>
          Quick Reference
        </button>
        {/* Primary CTA */}
        <button className="landing-cta-btn" onClick={onNew}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          New Company
        </button>
      </div>
    </nav>
  )
}

/* ── BUILDER NAVBAR ────────────────────────────────────── */
function BuilderNavbar({ onPlay, onEndOfGame }) {
  const { saveCompany, isDirty, companyMode, campaignGame } = useBuilderStore()
  const dirty = isDirty()
  const [confirmSave, setConfirmSave] = useState(false)

  function handleSaveConfirm() {
    setConfirmSave(false)
    saveCompany()
  }

  return (
    <nav className="builder-navbar">
      <div className="navbar-inner">
        <div className="navbar-group-left">
          <button className={`btn ${dirty ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setConfirmSave(true)}>{dirty ? '● Save' : 'Save'}</button>
        </div>
        <div className="navbar-group-center">
          {companyMode === 'campaign' && (
            <button className="btn btn-campaign-eog" onClick={onEndOfGame}>End of Game</button>
          )}
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
    </nav>
  )
}
