// ── New Company Page ───────────────────────────────────────────────────────────

import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { COMPANY_AVATARS, getAvatarSrc } from '../data/avatars'
import { MARKS, WARRIORS } from '../data/warriors'
import { WARRIOR_IMAGES, MARK_IMAGES, ITEM_ICONS } from '../data/images'
import AvatarPicker from './AvatarPicker'
import BottomSheet from '../shared/BottomSheet.jsx'
import MarkPicker from './MarkPicker.jsx'

const DOOM_NAMES = [
  'THE BLOOD SCRIBE', 'IRON RECAPTOR', 'VOID STALKERS', 'GRIM COVENANT', 'BONE RIPPERS',
  'ASHEN LEGION', 'DREAD HARVEST', 'WAR-BORN SOULS', 'THE HOLLOW HAND', 'PALE WATCHER',
  'CRIMSON KEEP', 'SILENT REAPERS', 'GRAVE WARDENS', 'THE SUFFERING', 'ETERNAL PYRE'
]

function randomAvatarKey() {
  return COMPANY_AVATARS[Math.floor(Math.random() * COMPANY_AVATARS.length)].key
}

function SectionLabel({ num, children }) {
  return (
    <div className="ncp-section-label">
      <span className="ncp-section-num">{num}</span>
      <span>{children}</span>
    </div>
  )
}

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="ncp-stepper-group">
      <div className="ncp-stepper-label">{label}</div>
      <div className="ncp-stepper">
        <button className="ncp-stepper-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <span className="ncp-stepper-val">{value}</span>
        <button className="ncp-stepper-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  )
}

export default function NewCompanyPage({ onStart, onBack }) {
  const WARRIOR_NAMES = Object.keys(WARRIORS).sort()
  const MAX_SLOTS = 8

  const [mode, setMode] = useState('standard')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(() => randomAvatarKey())
  const [slots, setSlots] = useState([null, null, null])
  const [ip, setIp] = useState(3)
  const [mark, setMark] = useState('')
  const [tempMark, setTempMark] = useState('')
  const [showMarkPicker, setShowMarkPicker] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null) // index of slot being picked
  const [tempSlotType, setTempSlotType] = useState(null)
  const [randomPreview, setRandomPreview] = useState(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const isCampaign = mode === 'campaign'
  const avatarSrc = getAvatarSrc(avatar)
  const selectedMark = MARKS.find(m => m.name === mark)
  const warriorCount = slots.length

  function handleModeChange(m) {
    setMode(m)
    setIp(m === 'campaign' ? 0 : 3)
    setRandomPreview(null)
  }

  function setSlotType(idx, type) {
    setSlots(s => s.map((v, i) => i === idx ? (type || null) : v))
  }

  function handleRandomize() {
    const result = useBuilderStore.getState().buildRandomResult({ warriors: warriorCount, ipLimit: ip })
    setAvatar(randomAvatarKey())
    setName(result.companyName)
    if (result.mark) setMark(result.mark)
    setSlots(result.slots.map(s => s.type || null))
    setRandomPreview(result)
  }

  function handleStart() {
    onStart(mode, name.trim() || null, avatar, warriorCount, ip, randomPreview, mark || null, slots)
  }

  return (
    <div className="ncp-page">

      {/* Avatar picker overlay */}
      {showAvatarPicker && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowAvatarPicker(false)} style={{ zIndex: 800 }}>
          <div className="modal-box" style={{ maxWidth: 480, width: '92vw' }}>
            <div className="co-settings-title" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>SELECT EMBLEM</div>
            <AvatarPicker value={avatar} onChange={val => { setAvatar(val); setShowAvatarPicker(false) }} />
            <button className="btn btn-secondary co-settings-done" style={{ marginTop: '1rem' }} onClick={() => setShowAvatarPicker(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="ncp-topbar">
        <button className="ncp-back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back
        </button>
        <span className="ncp-topbar-title">New Company</span>
      </div>

      {/* Scrollable form */}
      <div className="ncp-scroll">
        <div className="ncp-inner">

          {/* 01 IDENTITY + MODE — combined */}
          <section className="ncp-section">
            <SectionLabel num="01">Identity</SectionLabel>

            {/* Emblem + name row */}
            <div className="ncp-identity-row">
              <button className="ncp-emblem-btn" onClick={() => setShowAvatarPicker(true)} title="Choose emblem">
                {avatarSrc
                  ? <img src={avatarSrc} className="ncp-emblem-img" alt="Company emblem" />
                  : <span className="ncp-emblem-empty">?</span>
                }
                <span className="ncp-emblem-hint">Emblem</span>
              </button>
              <div className="ncp-name-block">
                <label className="ncp-input-label">Company Name</label>
                <div className="ncp-name-wrap">
                  <input
                    className="ncp-name-input"
                    type="text"
                    maxLength={40}
                    placeholder="Name your company…"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <button
                    className="ncp-dice-btn"
                    title="Random name"
                    onClick={() => setName(DOOM_NAMES[Math.floor(Math.random() * DOOM_NAMES.length)])}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 7c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                    </svg>
                  </button>
                </div>

                {/* Mode toggle — inline, compact */}
                <div className="ncp-mode-toggle">
                  <button
                    className={`ncp-mode-pill${mode === 'standard' ? ' active' : ''}`}
                    onClick={() => handleModeChange('standard')}
                  >Standard</button>
                  <button
                    className={`ncp-mode-pill${mode === 'campaign' ? ' active' : ''}`}
                    onClick={() => handleModeChange('campaign')}
                  >Campaign</button>
                </div>
              </div>
            </div>

            {isCampaign && (
              <div className="ncp-campaign-notice" style={{ marginTop: '0.6rem' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                Warriors start with <strong>0 IP</strong>. IP is earned after each scenario by survivors.
              </div>
            )}
          </section>

          {/* 02 COMPANY MARK */}
          <section className="ncp-section">
            <SectionLabel num="02">Company Mark</SectionLabel>
            <button
              className="ncp-mark-select-row ncp-mark-select-row--btn"
              onClick={() => { setTempMark(mark); setShowMarkPicker(true) }}
            >
              <div className="ncp-mark-select-icon">
                {mark && MARK_IMAGES[mark]
                  ? <img src={MARK_IMAGES[mark]} alt="" />
                  : <span className="ncp-mark-select-none">×</span>
                }
              </div>
              <span className="ncp-mark-select-label">
                {selectedMark ? selectedMark.label || selectedMark.name : 'No Mark'}
              </span>
              <svg className="ncp-mark-select-chevron" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
              </svg>
            </button>
            {selectedMark && (
              <p className="ncp-mark-rule">{selectedMark.desc}</p>
            )}
          </section>

          {/* 03 WARRIORS */}
          <section className="ncp-section">
            <SectionLabel num="03">Warriors</SectionLabel>
            <div className="ncp-slot-list">
              {slots.map((type, idx) => (
                <div key={idx} className="ncp-slot-row">
                  <button
                    className="ncp-slot-btn"
                    onClick={() => { setTempSlotType(type); setEditingSlot(idx) }}
                  >
                    <div className="ncp-slot-portrait">
                      {type && WARRIOR_IMAGES[type]
                        ? <img src={WARRIOR_IMAGES[type]} alt={type} className="ncp-slot-portrait-img" />
                        : <span className="ncp-slot-portrait-empty">{idx + 1}</span>
                      }
                    </div>
                    <span className="ncp-slot-label">
                      {type || <span className="ncp-slot-placeholder">Choose class…</span>}
                    </span>
                    <svg className="ncp-slot-chevron" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                    </svg>
                  </button>
                  {slots.length > 1 && (
                    <button
                      className="ncp-slot-remove"
                      onClick={() => setSlots(s => s.filter((_, i) => i !== idx))}
                      title="Remove warrior"
                    >×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="ncp-roster-controls">
              {slots.length < MAX_SLOTS && (
                <button className="ncp-add-slot-btn" onClick={() => setSlots(s => [...s, null])}>+ Add Warrior</button>
              )}
              <div style={{ flex: 1 }} />
              {!isCampaign && (
                <Stepper label="Company IP" value={ip} min={0} max={100} onChange={setIp} />
              )}
            </div>
          </section>

          {/* Random preview */}
          {randomPreview && (
            <section className="ncp-section">
              <SectionLabel num="—">Preview</SectionLabel>
              <div className="random-preview">
                <div className="random-preview-header">
                  {avatar
                    ? <img src={getAvatarSrc(avatar)} className="random-preview-avatar" alt="" />
                    : <div className="random-preview-avatar-empty" />
                  }
                  <div className="random-preview-company-info">
                    <div className="random-preview-company-name">{name.trim() || randomPreview.companyName}</div>
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
                        {[slot.weapon1, slot.weapon2, slot.climbing, slot.consumable].map((item, j) =>
                          item && ITEM_ICONS[item]
                            ? <img key={j} src={ITEM_ICONS[item]} className="random-preview-item-icon" title={item} alt="" />
                            : null
                        )}
                        {slot.statImprove && <span className="random-preview-stat">{slot.statImprove}+1</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Warrior class picker sheet */}
      {editingSlot !== null && (
        <BottomSheet
          title={`WARRIOR ${editingSlot + 1} — CLASS`}
          onClose={() => setEditingSlot(null)}
          zIndex={900}
          footer={
            <>
              <button className="co-sheet-randomize" onClick={() => setEditingSlot(null)}>Cancel</button>
              <button className="co-sheet-done" onClick={() => { setSlotType(editingSlot, tempSlotType); setEditingSlot(null) }}>Done</button>
            </>
          }
        >
          <div className="wcp-grid">
            {WARRIOR_NAMES.map(wt => (
              <button
                key={wt}
                className={`wcp-item${tempSlotType === wt ? ' selected' : ''}`}
                onClick={() => setTempSlotType(wt)}
              >
                <div className="wcp-portrait">
                  {WARRIOR_IMAGES[wt] && <img src={WARRIOR_IMAGES[wt]} alt={wt} />}
                </div>
                <div className="wcp-name">{wt}</div>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* Mark picker sheet */}
      {showMarkPicker && (
        <BottomSheet
          title="COMPANY MARK"
          onClose={() => setShowMarkPicker(false)}
          zIndex={900}
          bodyClass="co-sheet-body--mark"
          footer={
            <>
              <button className="co-sheet-randomize" onClick={() => setShowMarkPicker(false)}>Cancel</button>
              <button className="co-sheet-done" onClick={() => { setMark(tempMark); setShowMarkPicker(false) }}>Done</button>
            </>
          }
        >
          <div className="mark-sheet-desc">
            {(() => {
              const preview = MARKS.find(m => m.name === tempMark)
              return preview ? (
                <>
                  <div className="mark-sheet-desc-name">{preview.label}</div>
                  <div className="mark-sheet-desc-text">{preview.desc}</div>
                </>
              ) : (
                <div className="mark-sheet-desc-placeholder">Select a mark to see its battlefield ability.</div>
              )
            })()}
          </div>
          <div className="mark-grid-scroll">
            <MarkPicker value={tempMark} onChange={setTempMark} />
          </div>
        </BottomSheet>
      )}

      {/* Sticky footer */}
      <div className="ncp-footer">
        {!isCampaign && (
          <button className="ncp-btn ncp-btn--ghost" onClick={handleRandomize}>
            {randomPreview ? '↺ Roll Again' : '⚄ Randomize'}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="ncp-btn ncp-btn--primary" onClick={handleStart}>
          {randomPreview ? 'Accept & Build →' : `Begin ${isCampaign ? 'Campaign' : 'Build'} →`}
        </button>
      </div>

    </div>
  )
}
