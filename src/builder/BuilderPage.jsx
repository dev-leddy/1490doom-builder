import { useState, useEffect, useRef } from 'react'
import BottomSheet from '../shared/BottomSheet'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import { useTrackerStore } from '../store/trackerStore'
import { MARK_ID_MAP } from '../data/quizData'
import { hasStoredSession } from '../utils/storage'
import { getTheme, setTheme } from '../utils/theme'
import CompanyHeader from './CompanyHeader'
import WarriorRoster from './WarriorRoster'
import SaveLoadPanel from './SaveLoadPanel'
import ShareModal from './ShareModal'
import ImportModal from './ImportModal'
import ConfirmModal from '../shared/ConfirmModal'
import PrintRoster from './PrintRoster'
import EndOfGameModal from './EndOfGameModal'
import CompanyForm from './CompanyForm'
import ModeSelectModal from './ModeSelectModal'
import NewCompanyPage from './NewCompanyPage'
import LandingPage, { RefContent } from './LandingPage'
import AuthSheet from './AuthSheet'
import AvatarPicker from './AvatarPicker'
import { useAuthStore } from '../store/authStore'
import { mergeCloudSaves, pushLocalSavesToCloud } from '../store/builderPersistence'
import './styles/builder-layout.css'
import './styles/builder-print.css'
import './styles/builder-ui.css'
import './styles/builder-modals.css'

export default function BuilderPage({ initialView = null }) {
  const { validationMsg, dismissValidation, openShare, openImport, clearBuilder, setCompanyMode, companyMode, setMark } = useBuilderStore()
  const openTracker = useTrackerStore(s => s.openTracker)
  const builderState = useBuilderStore(s => s)

  // Clear the returnToBuilder flag as soon as we mount with it
  useEffect(() => {
    if (initialView === 'builder') {
      useTrackerStore.setState({ returnToBuilder: false })
    }
  }, []) // eslint-disable-line

  // 'landing' | 'builder' - use initialView if provided, or check _fromShare (set by loadInitial
  // before clearing the hash), or fall back to checking the raw hash
  const [view, setView] = useState(() => {
    if (initialView) return initialView
    if (useBuilderStore.getState()._fromShare) return 'builder'
    return window.location.hash ? 'builder' : 'landing'
  })
  // Auth
  const { user, status: authStatus, fetchMe, logout } = useAuthStore()
  const [authSheetOpen, setAuthSheetOpen] = useState(false)
  const [authSheetState, setAuthSheetState] = useState('providers')
  const [resetToken, setResetToken] = useState(null)
  const [syncPromptCount, setSyncPromptCount] = useState(0)
  useEffect(() => {
    fetchMe().then(async () => {
      const { user } = useAuthStore.getState()
      if (!user) return
      // Snapshot local saves before merging so we know what's local-only
      const { getSaves: getLocalSaves, listCompanies: listCloud } = await Promise.all([
        import('../store/builderPersistence.js'),
        import('../api/companies.js'),
      ]).then(([p, c]) => ({ getSaves: p.getSaves, listCompanies: c.listCompanies }))
      const localSaves = getLocalSaves()
      let cloudIds = new Set()
      try {
        const cloud = await listCloud()
        cloudIds = new Set(cloud.map(c => c.id))
      } catch { /* ignore */ }
      const localOnly = localSaves.filter(s => s.companyId && !cloudIds.has(s.companyId))
      if (localOnly.length > 0) setSyncPromptCount(localOnly.length)
      // Merge cloud into local
      const merged = await mergeCloudSaves(() => user)
      if (merged.length) useBuilderStore.setState({ saves: merged })
    })
  }, []) // eslint-disable-line

  // Sync current company to cloud when the user leaves the page
  useEffect(() => {
    function handleUnload() {
      const { mark, companyName, companyAvatar, ipLimit, slots, companyId, companyMode, campaignGame } = useBuilderStore.getState()
      const { user } = useAuthStore.getState()
      if (!user || !mark) return
      const saveData = { mark, companyName, companyAvatar, ipLimit, slots, companyId, companyMode, campaignGame, savedAt: Date.now() }
      // Use sendBeacon so the request survives page unload
      const payload = JSON.stringify({ id: companyId, name: companyName, mode: companyMode, data: saveData })
      navigator.sendBeacon?.('/api/companies', new Blob([payload], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, []) // eslint-disable-line

  // global quick reference overlay — works from any view
  const [refOpen, setRefOpen] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modeSelectOpen, setModeSelectOpen] = useState(false)
  const [endOfGameOpen, setEndOfGameOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setThemeState] = useState(getTheme)

  function handleToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  // Sync company header width to match warrior card width when only 1 card per row
  const builderMainRef = useRef(null)
  useEffect(() => {
    if (view !== 'builder') return
    const main = builderMainRef.current
    if (!main) return
    const sync = () => {
      const grid = main.querySelector('.warriors-grid')
      if (!grid) return
      const cols = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length
      if (cols <= 1) {
        const card = main.querySelector('.warrior-slot')
        main.style.setProperty('--header-max-width', card ? card.offsetWidth + 'px' : '500px')
      } else {
        main.style.setProperty('--header-max-width', '100%')
      }
    }
    sync()
    const ro = new ResizeObserver(sync)
    const grid = main.querySelector('.warriors-grid')
    if (grid) ro.observe(grid)
    return () => ro.disconnect()
  }, [view])

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
      // Clean up URL (remove ?quiz= param but keep hash for shared URLs)
      const hash = window.location.hash
      const newUrl = hash ? `${window.location.pathname}${hash}` : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, []) // eslint-disable-line

  // Detect ?reset=TOKEN on mount — open password reset form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('reset')
    if (token) {
      setResetToken(token)
      setAuthSheetState('reset')
      setAuthSheetOpen(true)
      // Clean URL
      const hash = window.location.hash
      const newUrl = hash ? `${window.location.pathname}${hash}` : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, []) // eslint-disable-line

  function goBuilder() { setView('builder') }

  function handleGoHome() {
    setRefOpen(false)
    setView('landing')
  }

  function handleLogoClick() {
    if (refOpen) {
      setRefOpen(false)
    } else if (view === 'builder') {
      handleGoHome()
    }
  }

  function handlePlay() {
    const hasSlots = builderState.slots?.some(s => s.type)
    if (!hasSlots) {
      useBuilderStore.getState()._toast('Add some warriors first!')
      return
    }
    const companyName = builderState.companyName
    if (companyName && hasStoredSession(companyName)) {
      useTrackerStore.getState().setShowRestorePrompt(true)
    } else {
      openTracker(builderState)
    }
  }

  function handlePrint() {
    setSidebarOpen(false)
    setTimeout(() => window.print(), 100)
  }


  function handleNew() {
    setSidebarOpen(false)
    setView('new-company')
  }

  function handleModeSelect(mode, name, avatar, warriors, ip, randomPreview = null, mark = null, pickedSlots = null) {
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
      // Adjust slot count to match chosen warrior count
      const diff = warriors - 3
      if (diff > 0) for (let i = 0; i < diff; i++) s.addSlot()
      else if (diff < 0) for (let i = 0; i < -diff; i++) s.removeSlot()
      // Apply pre-selected warrior classes
      if (pickedSlots) {
        const state = useBuilderStore.getState()
        pickedSlots.forEach((type, idx) => {
          if (type && state.slots[idx] !== undefined) {
            s.selectWarrior(idx, type)
          }
        })
      }
      if (mode === 'campaign') {
        if (ip > 0) s.setEarnedIPAll(ip)
      } else {
        const ipDiff = ip - 3
        if (ipDiff !== 0) s.changeIPLimit(ipDiff)
      }
    }
    if (mark) s.setMark(mark)
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
        user={user}
        authStatus={authStatus}
        onAuthClick={() => { setAuthSheetState('providers'); setAuthSheetOpen(true) }}
        onLogout={logout}
        syncCount={syncPromptCount}
        onSyncLocal={async () => {
          setSyncPromptCount(0)
          await pushLocalSavesToCloud(() => user)
          const merged = await mergeCloudSaves(() => user)
          if (merged.length) useBuilderStore.setState({ saves: merged })
        }}
      />

      {/* ── SCROLLABLE AREA ────────────────────────────── */}
      <div className="builder-scroll-area">
        {refOpen ? (
          <RefContent onBack={() => setRefOpen(false)} />
        ) : view === 'landing' ? (
          <LandingPage onLoad={goBuilder} onNew={handleNew} />
        ) : view === 'new-company' ? (
          <NewCompanyPage
            onStart={handleModeSelect}
            onBack={() => setView('landing')}
          />
        ) : (
          <main className="builder-main" ref={builderMainRef}>
            <CompanyHeader onSettings={() => setSettingsOpen(true)} onEndOfGame={() => setEndOfGameOpen(true)} />
            <WarriorRoster />
          </main>
        )}

        {view === 'builder' && !refOpen && (
          <button className="builder-play-pill" onClick={handlePlay}>
            ⚔ PLAY
          </button>
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


      {/* ── SAVED COMPANIES SHEET ──────────────────────── */}
      {sidebarOpen && (
        <BottomSheet
          title="SAVED COMPANIES"
          onClose={() => setSidebarOpen(false)}
          footer={
            <div className="sb-action-strip">
              {companyMode === 'campaign' ? (
                <>
                  {/* Campaign: Share + Print / Quick Ref + End Game */}
                  <div className="sb-action-row">
                    <button className="sb-action-btn" onClick={() => { setSidebarOpen(false); openShare() }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg>
                      <span>Share</span>
                    </button>
                    <button className="sb-action-btn" onClick={handlePrint}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                      <span>Print</span>
                    </button>
                  </div>
                  <div className="sb-action-row sb-action-row--large">
                    <button className="sb-action-btn sb-action-btn--lg" onClick={() => { setSidebarOpen(false); setRefOpen(v => !v) }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z"/></svg>
                      <span>Quick Ref</span>
                    </button>
                    <button className="sb-action-btn sb-action-btn--lg" onClick={() => { setSidebarOpen(false); setEndOfGameOpen(true) }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                      <span>End Game</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Standard: Home + Quick Ref / Share + Print */}
                  <div className="sb-action-row">
                    <button className="sb-action-btn" onClick={() => { setSidebarOpen(false); handleGoHome() }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                      <span>Home</span>
                    </button>
                    <button className="sb-action-btn" onClick={() => { setSidebarOpen(false); setRefOpen(v => !v) }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z"/></svg>
                      <span>Quick Ref</span>
                    </button>
                  </div>
                  <div className="sb-action-row">
                    <button className="sb-action-btn" onClick={() => { setSidebarOpen(false); openShare() }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg>
                      <span>Share</span>
                    </button>
                    <button className="sb-action-btn" onClick={handlePrint}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                      <span>Print</span>
                    </button>
                  </div>
                </>
              )}
              <div className="sb-action-row sb-action-row--large">
                <a
                  className="sb-action-btn sb-action-btn--discord sb-action-btn--lg"
                  href="https://discord.gg/hqTdqGBJyg"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg width="28" height="21" viewBox="0 0 59 44" fill="currentColor" aria-hidden="true">
                    <path d="M37.1937 0C36.6265 1.0071 36.1172 2.04893 35.6541 3.11392C31.2553 2.45409 26.7754 2.45409 22.365 3.11392C21.9136 2.04893 21.3926 1.0071 20.8254 0C16.6928 0.70613 12.6644 1.94475 8.84436 3.69271C1.27372 14.9098 -0.775214 25.8374 0.243466 36.6146C4.67704 39.8906 9.6431 42.391 14.9333 43.9884C16.1256 42.391 17.179 40.6893 18.0819 38.9182C16.3687 38.2815 14.7133 37.4828 13.1274 36.5567C13.5442 36.2557 13.9493 35.9432 14.3429 35.6422C23.6384 40.0179 34.4039 40.0179 43.711 35.6422C44.1046 35.9663 44.5097 36.2789 44.9264 36.5567C43.3405 37.4943 41.6852 38.2815 39.9604 38.9298C40.8633 40.7009 41.9167 42.4025 43.109 44C48.3992 42.4025 53.3653 39.9137 57.7988 36.6377C59.0027 24.1358 55.7383 13.3007 49.1748 3.70429C45.3663 1.95633 41.3379 0.717706 37.2053 0.0231518L37.1937 0ZM19.3784 29.9816C16.5192 29.9816 14.1461 27.3886 14.1461 24.1821C14.1461 20.9755 16.4266 18.371 19.3669 18.371C22.3071 18.371 24.6455 20.9871 24.5992 24.1821C24.5529 27.377 22.2956 29.9816 19.3784 29.9816ZM38.6639 29.9816C35.7931 29.9816 33.4431 27.3886 33.4431 24.1821C33.4431 20.9755 35.7236 18.371 38.6639 18.371C41.6042 18.371 43.9309 20.9871 43.8846 24.1821C43.8383 27.377 41.581 29.9816 38.6639 29.9816Z" />
                  </svg>
                  <span>Discord</span>
                </a>
                <a
                  className="sb-action-btn sb-action-btn--website sb-action-btn--lg"
                  href="https://1490doom.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSidebarOpen(false)}
                >
                  <img src={`${import.meta.env.BASE_URL}logo.png`} alt="1490 DOOM" className="sb-shop-logo" />
                  <span>Shop</span>
                </a>
              </div>
            </div>
          }
        >
          <>
            <SaveLoadPanel onSelect={handleLoadCompany} />
            <div style={{ padding: '0 0 0.5rem' }}>
              <button
                className="landing-new-company-btn"
                style={{ marginTop: '0.75rem' }}
                onClick={() => { setSidebarOpen(false); handleNew() }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                New Company
              </button>
            </div>
          </>
        </BottomSheet>
      )}

      <ShareModal />
      <ImportModal />
      {authSheetOpen && (
        <AuthSheet
          onClose={() => { setAuthSheetOpen(false); setAuthSheetState('providers'); setResetToken(null) }}
          initialState={authSheetState}
          resetToken={resetToken}
        />
      )}
      {syncPromptCount > 0 && user && (
        <ConfirmModal
          title="Upload Local Companies?"
          subtitle={`You have ${syncPromptCount} local ${syncPromptCount === 1 ? 'company' : 'companies'} not yet in the cloud. Upload ${syncPromptCount === 1 ? 'it' : 'them'} now?`}
          onConfirm={async () => {
            setSyncPromptCount(0)
            await pushLocalSavesToCloud(() => user)
            const merged = await mergeCloudSaves(() => user)
            if (merged.length) useBuilderStore.setState({ saves: merged })
          }}
          onCancel={() => setSyncPromptCount(0)}
        />
      )}

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
  const { companyName, setCompanyName, companyAvatar, setCompanyAvatar, ipLimit, changeIPLimit, slots, addSlot, removeSlot, companyMode, setEarnedIP, randomizeWarriors } = useBuilderStore()
  const [name, setName] = useState(companyName)
  const [avatar, setAvatar] = useState(companyAvatar)
  const activeSlots = slots.map((s, i) => ({ ...s, index: i })).filter(s => s.type)

  function handleClose() {
    setCompanyName(name)
    setCompanyAvatar(avatar)
    onClose()
  }

  return (
    <BottomSheet
      title="COMPANY SETTINGS"
      onClose={handleClose}
      footer={
        <>
          {companyMode !== 'campaign' && (
            <button className="co-sheet-randomize" onClick={() => { randomizeWarriors(); onClose() }}>
              Randomize<br />Company
            </button>
          )}
          <button className="co-sheet-done" onClick={handleClose}>DONE</button>
        </>
      }
    >
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
    </BottomSheet>
  )
}

/* ── TOPBAR ────────────────────────────────────────────── */
function BuilderTopbar({ onMenuToggle, onHome, user, authStatus, onAuthClick, onLogout, syncCount, onSyncLocal }) {
  const [accountOpen, setAccountOpen] = useState(false)

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

      <div className="topbar-actions">
        {authStatus === 'guest' && (
          <button className="auth-sign-in-btn" onClick={onAuthClick} title="Sign in to sync companies">
            Sign In
          </button>
        )}
        {authStatus === 'authed' && user && (
          <>
            <button className="auth-avatar-btn" onClick={() => setAccountOpen(true)} title={user.username}>
              {(() => {
                const src = getAvatarSrc(user.avatar_url)
                return src
                  ? <img className="auth-avatar-img" src={src} alt={user.username} />
                  : <span className="auth-avatar-fallback">{(user.username || '?')[0]}</span>
              })()}
            </button>
            {accountOpen && (
              <AuthAccountSheet
                user={user}
                onClose={() => setAccountOpen(false)}
                onLogout={() => { setAccountOpen(false); onLogout() }}
                syncCount={syncCount}
                onSyncLocal={() => { setAccountOpen(false); onSyncLocal() }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DiscordIconColored() {
  return (
    <svg width="28" height="28" viewBox="0 0 127.14 96.36" fill="#5865F2" aria-hidden="true">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
    </svg>
  )
}

function GoogleIconColored() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

/* ── ACCOUNT SHEET (shown when avatar is tapped) ───────── */
function AuthAccountSheet({ user, onClose, onLogout, syncCount, onSyncLocal }) {
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const { updateAvatar } = useAuthStore()
  const avatarSrc = getAvatarSrc(user.avatar_url)

  async function handleAvatarChange(val) {
    await updateAvatar(val)
    setPickingAvatar(false)
  }

  return (
    <BottomSheet title="Account" onClose={onClose}>
      <div className="auth-account-sheet">
        <div className="auth-account-info">
          {user.provider === 'email' ? (
            <button
              className="auth-account-avatar-edit-btn"
              onClick={() => setPickingAvatar(v => !v)}
              title="Change avatar"
            >
              <div className="auth-account-avatar-edit-wrap">
                {avatarSrc
                  ? <img className="auth-account-avatar-edit-img" src={avatarSrc} alt="" />
                  : <span className="auth-account-avatar-edit-initial">{(user.username || '?')[0].toUpperCase()}</span>
                }
                <div className="auth-account-avatar-edit-overlay">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </div>
              </div>
            </button>
          ) : (
            <span className="auth-account-provider-icon">
              {user.provider === 'discord' && <DiscordIconColored />}
              {user.provider === 'google'  && <GoogleIconColored />}
            </span>
          )}
          <div className="auth-account-name">{user.username}</div>
        </div>

        {pickingAvatar && user.provider === 'email' && (
          <div className="auth-account-avatar-picker">
            <p className="auth-account-avatar-picker-label">Choose your avatar</p>
            <AvatarPicker value={user.avatar_url} onChange={handleAvatarChange} />
          </div>
        )}

        {syncCount > 0 && (
          <button className="auth-sync-btn" onClick={onSyncLocal}>
            Upload {syncCount} local {syncCount === 1 ? 'company' : 'companies'} to cloud
          </button>
        )}
        <button className="auth-logout-btn" onClick={onLogout}>Sign Out</button>
      </div>
    </BottomSheet>
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
function BuilderNavbar({ onPlay }) {
  const { saveCompany, isDirty } = useBuilderStore()
  const dirty = isDirty()
  const [confirmSave, setConfirmSave] = useState(false)

  function handleSaveConfirm() {
    setConfirmSave(false)
    saveCompany()
  }

  return (
    <nav className="builder-navbar">
      <div className="navbar-inner">
        <button
          className={`navbar-btn-save${dirty ? ' navbar-btn-save--dirty' : ''}`}
          onClick={() => setConfirmSave(true)}
        >
          {dirty && <span className="navbar-save-dot" />}
          SAVE
        </button>
        <button className="navbar-btn-play" onClick={onPlay}>
          ⚔ PLAY
        </button>
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
