import { useState, useRef } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { COMPANY_AVATARS, getAvatarSrc } from '../data/avatars'
import { MARKS } from '../data/warriors'
import { WARRIOR_IMAGES, MARK_IMAGES, ITEM_ICONS } from '../data/images'
import { useTrackerStore } from '../store/trackerStore'
import CompanyHeader from './CompanyHeader'
import WarriorRoster from './WarriorRoster'
import SaveLoadPanel from './SaveLoadPanel'
import ShareModal from './ShareModal'
import ImportModal from './ImportModal'
import ConfirmModal from '../shared/ConfirmModal'
import PrintRoster from './PrintRoster'
import InstallButton from '../shared/InstallButton'
import EndOfGameModal from './EndOfGameModal'
import './builder.css'

export default function BuilderPage() {
  const { validationMsg, dismissValidation, openShare, openImport, clearBuilder, setCompanyMode, companyMode, campaignGame } = useBuilderStore()
  const openTracker = useTrackerStore(s => s.openTracker)
  const builderState = useBuilderStore(s => s)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modeSelectOpen, setModeSelectOpen] = useState(false)
  const [endOfGameOpen, setEndOfGameOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      // Apply the exact pre-built random result, then override name/avatar if provided
      s.applyRandomResult(randomPreview)
      if (name) s.setCompanyName(name)
      if (avatar) s.setCompanyAvatar(avatar)
      return
    }
    if (name) s.setCompanyName(name)
    if (avatar) s.setCompanyAvatar(avatar)
    // Adjust warrior count from default 3
    const diff = warriors - 3
    if (diff > 0) for (let i = 0; i < diff; i++) s.addSlot()
    else if (diff < 0) for (let i = 0; i < -diff; i++) s.removeSlot()
    if (mode === 'campaign') {
      // Campaign: distribute starting IP to every warrior's earnedIP
      if (ip > 0) s.setEarnedIPAll(ip)
    } else {
      // Standard: set the shared pool size (default is 3)
      const ipDiff = ip - 3
      if (ipDiff !== 0) s.changeIPLimit(ipDiff)
    }
  }

  return (
    <div className="builder-page">
      {/* ── TOPBAR ─────────────────────────────────────── */}
      <BuilderTopbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* ── SCROLLABLE AREA ────────────────────────────── */}
      <div className="builder-scroll-area">
        <main className="builder-main">
          <div className="builder-content">
            <CompanyHeader onSettings={() => setSettingsOpen(true)} />
            <WarriorRoster />
          </div>
        </main>

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

      {/* ── PRINT ROSTER (direct child of builder-page so @media print works) ── */}
      <div id="print-roster">
        <PrintRoster />
      </div>

      {/* ── BOTTOM NAVBAR ──────────────────────────────── */}
      <BuilderNavbar onPlay={handlePlay} onEndOfGame={() => setEndOfGameOpen(true)} />

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

/* ── AVATAR PICKER (shared) ────────────────────────────── */
function AvatarPicker({ value, onChange }) {
  const fileRef = useRef(null)

  function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const size = 240
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        // crop to square from center
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        onChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="avatar-picker">
      <div className="avatar-picker-label">Company Avatar</div>
      <div className="avatar-picker-grid">
        {COMPANY_AVATARS.map(a => (
          <button
            key={a.key}
            className={`avatar-option${value === a.key ? ' selected' : ''}`}
            onClick={() => onChange(value === a.key ? null : a.key)}
            title={a.label}
          >
            <img src={a.src} alt={a.label} />
          </button>
        ))}
        {/* Custom upload slot */}
        <button
          className={`avatar-option avatar-upload-btn${value?.startsWith('data:') ? ' selected' : ''}`}
          onClick={() => fileRef.current?.click()}
          title="Upload custom image"
        >
          {value?.startsWith('data:')
            ? <img src={value} alt="Custom" />
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/><path d="M13 9h-2V6H9v3H6v2h3v3h2v-3h3V9z" opacity=".6"/></svg>
          }
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
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
        <div className="co-settings-title">COMPANY SETTINGS</div>

        <div className="co-settings-field">
          <label className="co-settings-label">Company Name</label>
          <input
            className="co-settings-input"
            type="text"
            maxLength={40}
            placeholder="Name your Doom Company…"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="co-settings-field">
          <label className="co-settings-label">Warriors</label>
          <div className="co-settings-stepper">
            <button className="co-settings-step-btn" onClick={removeSlot}>−</button>
            <span className="co-settings-step-val">{slots.length}</span>
            <button className="co-settings-step-btn" onClick={addSlot}>+</button>
          </div>
        </div>

        {companyMode === 'standard' && (
          <div className="co-settings-field">
            <label className="co-settings-label">Company IP</label>
            <div className="co-settings-stepper">
              <button className="co-settings-step-btn" onClick={() => changeIPLimit(-1)}>−</button>
              <span className="co-settings-step-val">{ipLimit}</span>
              <button className="co-settings-step-btn" onClick={() => changeIPLimit(1)}>+</button>
            </div>
          </div>
        )}

        {companyMode === 'campaign' && activeSlots.length > 0 && (
          <div className="co-settings-warrior-ip">
            <div className="co-settings-label" style={{marginBottom:'0.6rem'}}>Warrior IP</div>
            {activeSlots.map(slot => {
              const label = slot.customName || `Warrior ${slot.index + 1}`
              const spent = slot.ip?.length || 0
              return (
                <div key={slot.index} className="co-settings-warrior-row">
                  <div className="co-settings-warrior-info">
                    <span className="co-settings-warrior-name">{label}{slot.isCaptain ? ' ★' : ''}</span>
                    <span className="co-settings-warrior-class">{slot.type}</span>
                  </div>
                  <div className="co-settings-stepper">
                    <button className="co-settings-step-btn" onClick={() => setEarnedIP(slot.index, (slot.earnedIP || 0) - 1)} disabled={(slot.earnedIP || 0) <= spent}>−</button>
                    <span className="co-settings-step-val">{slot.earnedIP || 0}</span>
                    <button className="co-settings-step-btn" onClick={() => setEarnedIP(slot.index, (slot.earnedIP || 0) + 1)}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <AvatarPicker value={avatar} onChange={setAvatar} />

        <button className="btn btn-primary co-settings-done" onClick={handleClose}>Done</button>
      </div>
    </div>
  )
}

/* ── NEW COMPANY WIZARD ────────────────────────────────── */
function ModeSelectModal({ onSelect, onCancel }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [warriors, setWarriors] = useState(3)
  const [ip, setIp] = useState(3)
  const [randomPreview, setRandomPreview] = useState(null)

  function handleModeChosen(m) {
    setMode(m)
  }

  function handleNext() {
    setIp(mode === 'campaign' ? 0 : 3)
    setRandomPreview(null)
    setStep(2)
  }

  function handleBack() {
    setRandomPreview(null)
    setStep(1)
  }

  function handleStart() {
    onSelect(mode, name.trim() || null, avatar, warriors, ip, randomPreview)
  }

  function handleRandomize() {
    const result = useBuilderStore.getState().buildRandomResult({ warriors, ipLimit: ip })
    // Pick a random default avatar and fill the name field — same state the preview reads from,
    // so editing name/avatar after rolling updates the preview live
    const randomAvatar = COMPANY_AVATARS[Math.floor(Math.random() * COMPANY_AVATARS.length)]
    setAvatar(randomAvatar.key)
    setName(result.companyName)
    setRandomPreview(result)
  }

  const isCampaign = mode === 'campaign'

  /* ── STEP 1: Choose mode ── */
  if (step === 1) {
    return (
      <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
        <div className="modal-box mode-select-modal">
          <div className="wizard-step-indicator"><span className="wizard-step active" /><span className="wizard-step" /></div>
          <div className="mode-select-title">START NEW COMPANY</div>
          <div className="mode-select-options">
            <button className={`mode-option-btn${mode === 'standard' ? ' selected' : ''}`} onClick={() => handleModeChosen('standard')}>
              <div className="mode-option-name">STANDARD</div>
              <div className="mode-option-desc">Build your company with a shared IP pool. All warriors start with improvement points ready to spend.</div>
            </button>
            <button className={`mode-option-btn${mode === 'campaign' ? ' selected' : ''}`} onClick={() => handleModeChosen('campaign')}>
              <div className="mode-option-name">CAMPAIGN</div>
              <div className="mode-option-desc">Warriors earn IP individually after surviving each scenario. All companies start with 0 IP.</div>
            </button>
          </div>
          <div className="mode-select-footer">
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!mode}>Next →</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── STEP 2: Configure company ── */
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box co-settings-modal">
        <div className="wizard-step-indicator"><span className="wizard-step" /><span className="wizard-step active" /></div>
        <div className="co-settings-title">
          {isCampaign ? 'NEW CAMPAIGN COMPANY' : 'NEW STANDARD COMPANY'}
        </div>

        {isCampaign && (
          <div className="wizard-campaign-notice">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{flexShrink:0,marginTop:'2px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <div className="wizard-notice-lines">
              <span>Warriors start with <strong>0 IP</strong> by default.</span>
              <span>IP is earned after each scenario by survivors.</span>
            </div>
          </div>
        )}

        <div className="co-settings-field">
          <label className="co-settings-label">Company Name</label>
          <input
            className="co-settings-input"
            type="text"
            maxLength={40}
            placeholder="Name your Doom Company…"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleStart()}
          />
        </div>

        <div className="co-settings-field">
          <label className="co-settings-label">Warriors</label>
          <div className="co-settings-stepper">
            <button className="co-settings-step-btn" onClick={() => setWarriors(w => Math.max(1, w - 1))}>−</button>
            <span className="co-settings-step-val">{warriors}</span>
            <button className="co-settings-step-btn" onClick={() => setWarriors(w => Math.min(8, w + 1))}>+</button>
          </div>
        </div>

        <div className="co-settings-field">
          <div className="co-settings-label-stack">
            <label className="co-settings-label">
              {isCampaign ? 'Starting IP (per warrior)' : 'Starting IP (shared pool)'}
            </label>
            {isCampaign && ip > 0 && (
              <span className="co-settings-sublabel">Each warrior begins with {ip} IP to spend</span>
            )}
          </div>
          <div className="co-settings-stepper">
            <button className="co-settings-step-btn" onClick={() => setIp(v => Math.max(0, v - 1))}>−</button>
            <span className="co-settings-step-val">{ip}</span>
            <button className="co-settings-step-btn" onClick={() => setIp(v => Math.min(12, v + 1))}>+</button>
          </div>
        </div>

        <AvatarPicker value={avatar} onChange={setAvatar} />

        {randomPreview && (
          <div className="random-preview">
            <div className="random-preview-header">
              {avatar
                ? <img src={getAvatarSrc(avatar)} className="random-preview-avatar" alt="" />
                : <div className="random-preview-avatar-empty" />
              }
              <div className="random-preview-company-info">
                <div className="random-preview-company-name">
                  {name.trim() || randomPreview.companyName}
                </div>
                <div className="random-preview-mark-row">
                  {MARK_IMAGES[randomPreview.mark] && (
                    <img src={MARK_IMAGES[randomPreview.mark]} className="random-preview-mark-img" alt="" />
                  )}
                  <span>{MARKS.find(m => m.name === randomPreview.mark)?.label || randomPreview.mark}</span>
                </div>
              </div>
            </div>
            <ul className="random-preview-warriors">
              {randomPreview.slots.map((slot, i) => (
                <li key={i} className={`random-preview-warrior${slot.isCaptain ? ' is-captain' : ''}`}>
                  {WARRIOR_IMAGES[slot.type]
                    ? <img src={WARRIOR_IMAGES[slot.type]} className="random-preview-warrior-img" alt={slot.type} />
                    : <div className="random-preview-warrior-img random-preview-warrior-empty" />
                  }
                  <span className="random-preview-warrior-name">{slot.type}</span>
                  {slot.isCaptain && <span className="random-preview-captain">Cpt</span>}
                  <div className="random-preview-upgrades">
                    {slot.weapon1 && ITEM_ICONS[slot.weapon1] && (
                      <img src={ITEM_ICONS[slot.weapon1]} className="random-preview-item-icon" title={slot.weapon1} alt="" />
                    )}
                    {slot.weapon2 && ITEM_ICONS[slot.weapon2] && (
                      <img src={ITEM_ICONS[slot.weapon2]} className="random-preview-item-icon" title={slot.weapon2} alt="" />
                    )}
                    {slot.climbing && ITEM_ICONS[slot.climbing] && (
                      <img src={ITEM_ICONS[slot.climbing]} className="random-preview-item-icon" title={slot.climbing} alt="" />
                    )}
                    {slot.consumable && ITEM_ICONS[slot.consumable] && (
                      <img src={ITEM_ICONS[slot.consumable]} className="random-preview-item-icon" title={slot.consumable} alt="" />
                    )}
                    {slot.statImprove && (
                      <span className="random-preview-stat">{slot.statImprove}+1</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mode-select-footer">
          <button className="btn btn-ghost btn-sm" onClick={handleBack}>← Back</button>
          {!isCampaign && (
            <button className="btn btn-secondary btn-sm" onClick={handleRandomize}>
              {randomPreview ? 'Roll Again' : 'Randomize'}
            </button>
          )}
          <button className={`btn btn-sm ${isCampaign ? 'btn-campaign-eog' : 'btn-primary'}`} onClick={handleStart}>
            {randomPreview ? 'Accept & Build' : `Begin ${isCampaign ? 'Campaign' : 'Build'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── TOPBAR ────────────────────────────────────────────── */
function BuilderTopbar({ onMenuToggle }) {
  return (
    <div className="builder-topbar">
      <button className="topbar-menu-btn" onClick={onMenuToggle} title="Saved Companies">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>

      <div className="topbar-brand">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="1490 DOOM" className="topbar-brand-logo" />
        <span className="topbar-brand-sub">Company Builder</span>
      </div>

      <div className="topbar-spacer" aria-hidden="true" />
    </div>
  )
}

/* ── BOTTOM NAVBAR ─────────────────────────────────────── */
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
