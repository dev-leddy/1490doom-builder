import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { COMPANY_AVATARS, getAvatarSrc } from '../data/avatars'
import { MARKS } from '../data/warriors'
import { WARRIOR_IMAGES, MARK_IMAGES, ITEM_ICONS } from '../data/images'
import CompanyForm from './CompanyForm'

function SvgSword() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
      <path d="M6.92 5H5L3 3l1-1 2 2h.92l5.84-2.75A1 1 0 0 1 14 2h4a1 1 0 0 1 1 1v4a1 1 0 0 1-.55.89L13.7 10l-.7.7 1.24 1.24-1.42 1.41-1.24-1.23-5.78 5.78A2 2 0 0 1 4.38 18H3v-1.38a2 2 0 0 1 .59-1.42L9.37 9.42 8.13 8.18l1.42-1.41L10.79 8l.71-.7L6.92 5Z"/>
    </svg>
  )
}

function SvgScroll() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  )
}


export default function ModeSelectModal({ onSelect, onCancel }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [warriors, setWarriors] = useState(3)
  const [ip, setIp] = useState(3)
  const [randomPreview, setRandomPreview] = useState(null)

  function handleModeChosen(m) { setMode(m) }

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
          <button className="wiz-close-btn" onClick={onCancel} aria-label="Close">×</button>

          <div className="mode-select-title" style={{ marginBottom: '1.5rem' }}>FORGE YOUR COMPANY</div>

          <div className="mode-select-options">
            <button
              className={`mode-option-btn${mode === 'standard' ? ' selected' : ''}`}
              onClick={() => handleModeChosen('standard')}
            >
              <div className="mode-option-icon"><SvgSword /></div>
              <div className="mode-option-name">STANDARD</div>
              <div className="mode-option-desc">Shared IP pool. Warriors arrive ready to spend.</div>
            </button>
            <button
              className={`mode-option-btn${mode === 'campaign' ? ' selected' : ''}`}
              onClick={() => handleModeChosen('campaign')}
            >
              <div className="mode-option-icon"><SvgScroll /></div>
              <div className="mode-option-name">CAMPAIGN</div>
              <div className="mode-option-desc">Warriors earn IP after each scenario they survive.</div>
            </button>
          </div>

          <div className="mode-select-footer mode-select-footer--single">
            <button className="btn btn-primary wiz-next-btn" onClick={handleNext} disabled={!mode}>
              Next →
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── STEP 2: Configure company ── */
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box mode-select-modal">
        <button className="wiz-close-btn" onClick={onCancel} aria-label="Close">×</button>

        <div className="mode-select-title">
          {isCampaign ? 'CAMPAIGN COMPANY' : 'STANDARD COMPANY'}
        </div>

        {isCampaign && (
          <div className="wizard-campaign-notice">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <div className="wizard-notice-lines">
              <span>Warriors start with <strong>0 IP</strong> by default.</span>
              <span>IP is earned after each scenario by survivors.</span>
            </div>
          </div>
        )}

        <CompanyForm
          name={name} setName={setName}
          avatar={avatar} setAvatar={setAvatar}
          warriors={warriors} setWarriors={setWarriors}
          ip={ip} setIp={setIp}
          companyMode={mode}
        />

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
            <button className="btn btn-secondary btn-sm wiz-randomize-btn" onClick={handleRandomize}>
              {randomPreview ? 'Roll Again' : 'Randomize'}
            </button>
          )}
          <button
            className={`btn btn-sm wiz-begin-btn ${isCampaign ? 'btn-campaign-eog' : 'btn-primary'}`}
            onClick={handleStart}
          >
            {randomPreview ? 'Accept & Build' : `Begin ${isCampaign ? 'Campaign' : 'Build'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
