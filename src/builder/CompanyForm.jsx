import { useState } from 'react'
import { getAvatarSrc } from '../data/avatars'
import AvatarPicker from './AvatarPicker'

const DOOM_NAMES = [
  'THE BLOOD SCRIBE', 'IRON RECAPTOR', 'VOID STALKERS', 'GRIM COVENANT', 'BONE RIPPERS',
  'ASHEN LEGION', 'DREAD HARVEST', 'WAR-BORN SOULS', 'THE HOLLOW HAND', 'PALE WATCHER',
  'CRIMSON KEEP', 'SILENT REAPERS', 'GRAVE WARDENS', 'THE SUFFERING', 'ETERNAL PYRE'
]

function SvgDice() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 7c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  )
}

export default function CompanyForm({ 
  name, setName, 
  avatar, setAvatar, 
  warriors, setWarriors, 
  ip, setIp, 
  companyMode,
  activeSlots = []
}) {
  const [showPicker, setShowPicker] = useState(false)
  const currentLogoSrc = getAvatarSrc(avatar)

  return (
    <div className="company-form-shared">
      {/* LOGO FIELD */}
      <div className="cf-emblem-row">
        <button className="cf-emblem-trigger" onClick={() => setShowPicker(true)} aria-label="Choose emblem">
          <div className="cf-emblem-ring">
            <div className="cf-emblem-inner">
              {currentLogoSrc
                ? <img src={currentLogoSrc} alt="" className="cf-emblem-img" />
                : <span className="cf-emblem-empty" aria-hidden="true">?</span>
              }
            </div>
          </div>
          <span className="cf-emblem-hint">CHOOSE EMBLEM</span>
        </button>
      </div>

      {showPicker && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowPicker(false)} style={{ zIndex: 800 }}>
          <div className="modal-box" style={{ maxWidth: 480, width: '92vw' }}>
            <div className="co-settings-title" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>SELECT EMBLEM</div>
            <AvatarPicker value={avatar} onChange={(val) => { setAvatar(val); setShowPicker(false); }} />
            <button className="btn btn-secondary co-settings-done" style={{ marginTop: '1rem' }} onClick={() => setShowPicker(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* NAME FIELD */}
      <div className="co-settings-field">
        <label className="co-settings-label" style={{ width: 110, flexShrink: 0 }}>Company Name</label>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            className="co-settings-input"
            type="text"
            maxLength={40}
            placeholder="Name your Doom Company…"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            style={{ flex: 1 }}
          />
          <button 
            className="co-settings-step-btn" 
            title="Random Name"
            onClick={() => setName(DOOM_NAMES[Math.floor(Math.random() * DOOM_NAMES.length)])}
            style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SvgDice />
          </button>
        </div>
      </div>

      {/* WARRIORS FIELD */}
      <div className="co-settings-field">
        <label className="co-settings-label" style={{ width: 110, flexShrink: 0 }}>Warriors</label>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="co-settings-stepper">
            <button className="co-settings-step-btn" onClick={() => setWarriors(Math.max(1, warriors - 1))}>−</button>
            <span className="co-settings-step-val">{warriors}</span>
            <button className="co-settings-step-btn" onClick={() => setWarriors(Math.min(8, warriors + 1))}>+</button>
          </div>
        </div>
      </div>

      {/* IP FIELD */}
      {companyMode === 'standard' && (
        <div className="co-settings-field">
          <label className="co-settings-label" style={{ width: 110, flexShrink: 0 }}>Company IP</label>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div className="co-settings-stepper">
              <button className="co-settings-step-btn" onClick={() => setIp(Math.max(0, ip - 1))}>−</button>
              <span className="co-settings-step-val">{ip}</span>
              <button className="co-settings-step-btn" onClick={() => setIp(Math.min(100, ip + 1))}>+</button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL WARRIOR IP (Campaign only) */}
      {companyMode === 'campaign' && activeSlots.length > 0 && (
        <div className="co-settings-warrior-ip">
          <div className="co-settings-label" style={{ marginBottom: '0.6rem' }}>Warrior IP</div>
          {activeSlots.map(slot => {
            const label = slot.customName || `Warrior ${slot.index + 1}`
            const spent = slot.ip?.length || 0
            const earned = slot.earnedIP || 0
            return (
              <div key={slot.index} className="co-settings-warrior-row">
                <div className="co-settings-warrior-info">
                  <span className="co-settings-warrior-name">{label}{slot.isCaptain ? ' ★' : ''}</span>
                  <span className="co-settings-warrior-class">{slot.type}</span>
                </div>
                <div className="co-settings-stepper">
                  <button className="co-settings-step-btn" onClick={() => slot.onEarnedChange(earned - 1)} disabled={earned <= spent}>−</button>
                  <span className="co-settings-step-val">{earned}</span>
                  <button className="co-settings-step-btn" onClick={() => slot.onEarnedChange(earned + 1)}>+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
