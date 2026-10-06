import { useState } from 'react'
import { getAvatarSrc } from '../data/avatars'
import EmblemSheet from './EmblemSheet'

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
    <div className="company-form-shared cs-form">
      {showPicker && (
        <EmblemSheet
          value={avatar}
          onChange={(val) => { setAvatar(val); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* IDENTITY — emblem + name */}
      <section className="cs-section">
        <h3 className="cs-section-label">Identity</h3>
        <div className="cs-identity">
          <button className="cf-emblem-trigger" onClick={() => setShowPicker(true)} aria-label="Choose emblem">
            <span className="cf-emblem-ring">
              <span className="cf-emblem-inner">
                {currentLogoSrc
                  ? <img src={currentLogoSrc} alt="" className="cf-emblem-img" />
                  : <span className="cf-emblem-empty" aria-hidden="true">?</span>
                }
              </span>
            </span>
            <span className="cf-emblem-hint" aria-hidden="true">Change</span>
          </button>

          <div className="cs-name">
            <label className="cs-field-label" htmlFor="cs-company-name">Company name</label>
            <div className="cf-name-input-wrap">
              <input
                id="cs-company-name"
                className="co-settings-input"
                type="text"
                maxLength={40}
                placeholder="Name your company…"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <button
                className="cf-dice-inline"
                title="Random Name"
                aria-label="Random name"
                onClick={() => setName(DOOM_NAMES[Math.floor(Math.random() * DOOM_NAMES.length)])}
              >
                <SvgDice />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ROSTER — warriors + company IP */}
      <section className="cs-section">
        <h3 className="cs-section-label">Roster</h3>
        <div className="cs-steppers">
          <div className="cs-stepper-card">
            <span className="cs-field-label">Warriors</span>
            <div className="co-settings-stepper">
              <button className="co-settings-step-btn" onClick={() => setWarriors(Math.max(1, warriors - 1))} disabled={warriors <= 1} aria-label="Fewer warriors">−</button>
              <span className="co-settings-step-val">{warriors}</span>
              <button className="co-settings-step-btn" onClick={() => setWarriors(Math.min(8, warriors + 1))} disabled={warriors >= 8} aria-label="More warriors">+</button>
            </div>
          </div>

          {companyMode === 'standard' && (
            <div className="cs-stepper-card">
              <span className="cs-field-label">Company IP</span>
              <div className="co-settings-stepper">
                <button className="co-settings-step-btn" onClick={() => setIp(Math.max(0, ip - 1))} disabled={ip <= 0} aria-label="Less IP">−</button>
                <span className="co-settings-step-val">{ip}</span>
                <button className="co-settings-step-btn" onClick={() => setIp(Math.min(100, ip + 1))} disabled={ip >= 100} aria-label="More IP">+</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* INDIVIDUAL WARRIOR IP (Campaign only) */}
      {companyMode === 'campaign' && activeSlots.length > 0 && (
        <section className="cs-section co-settings-warrior-ip">
          <h3 className="cs-section-label">Warrior IP</h3>
          <p className="cs-intro">IP each warrior has earned. It can't go below what they've spent.</p>
          <div className="cs-warrior-list">
            {activeSlots.map(slot => {
              const label = slot.customName || `Warrior ${slot.index + 1}`
              const spent = slot.ip?.length || 0
              const earned = slot.earnedIP || 0
              return (
                <div key={slot.index} className="co-settings-warrior-row">
                  <div className="co-settings-warrior-info">
                    <span className="co-settings-warrior-name">{label}{slot.isCaptain ? ' ★' : ''}</span>
                    <span className="co-settings-warrior-class">{slot.type}{spent > 0 ? ` · ${spent} spent` : ''}</span>
                  </div>
                  <div className="co-settings-stepper">
                    <button className="co-settings-step-btn" onClick={() => slot.onEarnedChange(earned - 1)} disabled={earned <= spent} aria-label={`Less IP for ${label}`}>−</button>
                    <span className="co-settings-step-val">{earned}</span>
                    <button className="co-settings-step-btn" onClick={() => slot.onEarnedChange(earned + 1)} aria-label={`More IP for ${label}`}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
