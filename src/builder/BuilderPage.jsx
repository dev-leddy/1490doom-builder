import { useState, useEffect, useRef } from 'react'
import BottomSheet from '../shared/BottomSheet'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import { useTrackerStore } from '../store/trackerStore'
import { MARK_ID_MAP } from '../data/quizData'
import CompanyHeader from './CompanyHeader'
import WarriorRoster from './WarriorRoster'
import AppMenu from './AppMenu'
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
import { encodeCompany } from '../store/builderEncoding'
import { loadGame } from '../api/games'
import './styles/builder-layout.css'
import './styles/builder-print.css'
import './styles/builder-ui.css'
import './styles/builder-modals.css'

// sessionStorage key for an action a guest started before being asked to sign in.
// Survives the Google/Discord redirect so it can be finished after login.
const PENDING_KEY = '__pendingAfterLogin'

export default function BuilderPage({ initialView = null }) {
  const { validationMsg, dismissValidation, openShare, clearBuilder, setCompanyMode, companyMode, setMark, viewingShare, saveSharedCopy, resetForSignOut, saveStatus } = useBuilderStore()
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
  const [authReason, setAuthReason] = useState(null)
  const [resetToken, setResetToken] = useState(null)
  useEffect(() => { fetchMe() }, []) // eslint-disable-line

  // Building, saving and playing need an account. Asks a guest to sign in and
  // remembers `pending` so it can be finished afterwards. Returns true if signed in.
  function requireLogin(reason, pending = null) {
    if (useAuthStore.getState().user) return true
    try {
      if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
      else sessionStorage.removeItem(PENDING_KEY)
    } catch { /* storage unavailable */ }
    setAuthReason(reason)
    setAuthSheetState('providers')
    setAuthSheetOpen(true)
    return false
  }

  function takePending() {
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY))
      sessionStorage.removeItem(PENDING_KEY)
      sessionStorage.removeItem('__pendingShare')
      return pending
    } catch { return null }
  }

  // Signed in: load the account's companies (moving any old browser saves over),
  // then finish what the guest was doing when asked to sign in.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    useBuilderStore.getState().loadSaves()
    const pending = takePending()
    if (pending?.type === 'quiz') applyQuizPayload(pending.payload)
    else if (pending?.type === 'share' && useBuilderStore.getState().viewingShare) saveSharedCopy()
    else if (pending?.type === 'new') setView('new-company')
  }, [userId]) // eslint-disable-line

  // Quiz finished in the standalone /quiz page while signed out: ask to sign in
  const quizFromUrl = useRef(false)
  useEffect(() => {
    if (authStatus === 'guest' && quizFromUrl.current) {
      quizFromUrl.current = false
      setAuthReason('Sign in to build and save your company.')
      setAuthSheetState('providers')
      setAuthSheetOpen(true)
    }
  }, [authStatus])

  async function handleLogout() {
    await logout()
    resetForSignOut()
    useTrackerStore.setState({ active: false, sessionId: null, savedBuilderSlots: null })
    setSidebarOpen(false)
    setView('landing')
  }

  // global quick reference overlay — works from any view
  const [refOpen, setRefOpen] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modeSelectOpen, setModeSelectOpen] = useState(false)
  const [endOfGameOpen, setEndOfGameOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  // Quiz result from the standalone /quiz page arrives as ?quiz=<payload>. It's
  // stashed as a pending action: applied right away once signed in, or after login.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const quizParam = params.get('quiz')
    if (quizParam) {
      try {
        const payload = JSON.parse(quizParam)
        if (MARK_ID_MAP[payload.companyId]) {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify({ type: 'quiz', payload }))
          quizFromUrl.current = true
          if (useAuthStore.getState().user) applyQuizPayload(takePending().payload)
        }
      } catch (e) { /* ignore malformed param */ }
      // Clean up URL (remove ?quiz= param but keep hash for shared URLs)
      const hash = window.location.hash
      const newUrl = hash ? `${window.location.pathname}${hash}` : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, []) // eslint-disable-line

  function applyQuizPayload(payload) {
    const mark = MARK_ID_MAP[payload?.companyId]
    if (!mark) return
    quizFromUrl.current = false
    clearBuilder()
    setMark(mark)
    useBuilderStore.getState().applyQuizCompany({ mark, companyName: payload.companyName, warriors: payload.warriors })
    setView('builder')
  }

  function handleQuizComplete(payload) {
    if (requireLogin('Sign in to build and save your company.', { type: 'quiz', payload })) applyQuizPayload(payload)
  }

  function handleSaveShared() {
    if (useAuthStore.getState().user) { saveSharedCopy(); return }
    // Keep the shared company on screen across the Google/Discord redirect
    const { mark, companyName, ipLimit, slots } = useBuilderStore.getState()
    try { sessionStorage.setItem('__pendingShare', encodeCompany({ mark, companyName, ipLimit, slots })) } catch { /* storage unavailable */ }
    requireLogin('Sign in to save this company to your account.', { type: 'share' })
  }

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
  }, [])

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

  async function handlePlay() {
    const hasSlots = builderState.slots?.some(s => s.type)
    if (!hasSlots) {
      useBuilderStore.getState()._toast('Add some warriors first!')
      return
    }
    if (!requireLogin('Sign in to play. Your game is saved so you can pick it up on any device.')) return
    try {
      const saved = await loadGame(builderState.companyId)
      if (saved?.data?.active) useTrackerStore.getState().promptRestore(saved)
      else openTracker(builderState)
    } catch {
      useBuilderStore.getState()._toast("Couldn't reach the server. Check your connection.")
    }
  }

  function handlePrint() {
    setSidebarOpen(false)
    useBuilderStore.setState({ toast: null })
    setTimeout(() => window.print(), 100)
  }


  function handleNew() {
    setSidebarOpen(false)
    if (!requireLogin('Sign in to create and save companies.', { type: 'new' })) return
    setView('new-company')
  }

  function handleModeSelect(mode, name, avatar, warriors, ip, randomPreview = null, mark = null, pickedSlots = null, slotIps = null) {
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
        // Apply per-warrior starting IP if provided, else fall back to shared ip value
        if (slotIps) {
          slotIps.forEach((slotIp, idx) => {
            if (slotIp > 0) s.setEarnedIP(idx, slotIp)
          })
        } else if (ip > 0) {
          s.setEarnedIPAll(ip)
        }
      } else {
        const ipDiff = ip - 3
        if (ipDiff !== 0) s.changeIPLimit(ipDiff)
      }
    }
    // The wizard's mark choice wins, including "no mark" (the store defaults to the first mark)
    if (mark || !randomPreview) s.setMark(mark || '')
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
        onAuthClick={() => requireLogin(null)}
        onLogout={handleLogout}
        saveStatus={saveStatus}
      />

      {/* New company page — sibling of scroll area, fills remaining height */}
      {!refOpen && view === 'new-company' && (
        <NewCompanyPage
          onStart={handleModeSelect}
          onBack={() => setView('landing')}
        />
      )}

      {/* ── SCROLLABLE AREA ────────────────────────────── */}
      {(refOpen || view !== 'new-company') && (
      <div className="builder-scroll-area">
        {refOpen ? (
          <RefContent onBack={() => setRefOpen(false)} />
        ) : view === 'landing' ? (
          <LandingPage onLoad={goBuilder} onNew={handleNew} onQuizComplete={handleQuizComplete} />
        ) : (
          <main className="builder-main" ref={builderMainRef}>
            {viewingShare && (
              <div className="share-view-banner">
                <span className="share-view-banner-text">Shared company · view only</span>
                <button className="share-view-banner-btn" onClick={handleSaveShared}>
                  {user ? 'Save to my companies' : 'Sign in to save a copy'}
                </button>
              </div>
            )}
            <div className={viewingShare ? 'builder-readonly' : undefined}>
            <CompanyHeader
              onSettings={() => setSettingsOpen(true)}
              onEndOfGame={() => setEndOfGameOpen(true)}
              onShare={openShare}
              onPrint={() => setTimeout(() => window.print(), 100)}
            />
            <WarriorRoster />
            </div>
          </main>
        )}

        {view === 'builder' && !refOpen && !viewingShare && (
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
      )}

      {/* ── PRINT ROSTER ───────────────────────────────── */}
      <div id="print-roster">
        <PrintRoster />
      </div>


      {/* ── APP MENU (hamburger) ──────────────────────── */}
      {sidebarOpen && (
        <AppMenu
          user={user}
          companyOpen={view === 'builder' && !refOpen}
          isCampaign={companyMode === 'campaign'}
          saveCount={builderState.saves.length}
          onClose={() => setSidebarOpen(false)}
          onSignIn={() => requireLogin(null)}
          onMyCompanies={handleGoHome}
          onNewCompany={handleNew}
          onQuickRef={() => setRefOpen(true)}
          onShare={openShare}
          onPrint={handlePrint}
          onEndCampaign={() => setEndOfGameOpen(true)}
        />
      )}

      <ShareModal />
      <ImportModal />
      {authSheetOpen && (
        <AuthSheet
          onClose={() => {
            // Dismissed without signing in: forget the action they were trying to do
            if (!useAuthStore.getState().user) takePending()
            setAuthSheetOpen(false); setAuthSheetState('providers'); setResetToken(null); setAuthReason(null)
          }}
          initialState={authSheetState}
          resetToken={resetToken}
          reason={authReason}
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
const SAVE_STATUS_LABEL = { saving: 'Saving…', saved: 'Saved', offline: 'Offline · retrying' }

function BuilderTopbar({ onMenuToggle, onHome, user, authStatus, onAuthClick, onLogout, saveStatus }) {
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
        {authStatus === 'authed' && SAVE_STATUS_LABEL[saveStatus] && (
          <span className={`save-status save-status--${saveStatus}`} aria-live="polite">{SAVE_STATUS_LABEL[saveStatus]}</span>
        )}
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
function AuthAccountSheet({ user, onClose, onLogout }) {
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

        <button className="auth-logout-btn" onClick={onLogout}>Sign Out</button>
      </div>
    </BottomSheet>
  )
}
