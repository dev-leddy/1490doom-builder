import { useState } from 'react'
import { useBuilderStore, getAvailableWarriorTypes } from '../store/builderStore'
import { WARRIOR_IMAGES } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

// Recruit a new warrior into an empty campaign slot (a fallen warrior's place).
// Starting IP is 0 by the rules; the field is there for house rules.
export default function RecruitSheet({ slotIndex, onClose }) {
  const slots = useBuilderStore(s => s.slots)
  const needsCaptain = useBuilderStore(s => !!s.campaign?.needsCaptain)
  const hireWarrior = useBuilderStore(s => s.hireWarrior)
  const slot = slots[slotIndex]
  const hasCaptain = slots.some(s => s.type && s.isCaptain)
  const canLead = needsCaptain && !hasCaptain

  const [type, setType] = useState(null)
  const [startIP, setStartIP] = useState(0)
  const [makeCaptain, setMakeCaptain] = useState(canLead && !!slot?.isCaptain)

  const available = getAvailableWarriorTypes(slotIndex, slots)

  function recruit() {
    if (hireWarrior(slotIndex, type, { startIP, makeCaptain: canLead && makeCaptain })) onClose()
  }

  return (
    <BottomSheet
      title={`RECRUIT · SLOT ${slotIndex + 1}`}
      onClose={onClose}
      zIndex={1001}
      className="recruit-sheet"
      footer={
        <>
          <button className="co-sheet-randomize" onClick={onClose}>Cancel</button>
          <button className="co-sheet-done recruit-confirm-btn" disabled={!type} onClick={recruit}>
            {type ? `Recruit ${type}` : 'Choose a class'}
          </button>
        </>
      }
    >
      {slot?.fallen && (
        <p className="eog-help">Replacing {slot.fallen.name}, who fell in game {slot.fallen.game}.</p>
      )}

      {canLead && (
        <div className="ws-section ws-section--row recruit-captain">
          <div>
            <div className="ws-section-label">Captain</div>
            <p className="eog-help eog-help--tight">Your company has no Captain. Choose who leads.</p>
          </div>
          <button
            type="button"
            className={`ws-captain-toggle ${makeCaptain ? 'is-captain' : ''}`}
            aria-pressed={makeCaptain}
            onClick={() => setMakeCaptain(v => !v)}
          >
            ★ {makeCaptain ? 'Captain' : 'Make Captain'}
          </button>
        </div>
      )}

      <div className="ws-section">
        <div className="ws-section-label">Class</div>
        <div className="wcp-grid" role="radiogroup" aria-label="Class">
          {available.map(wt => (
            <button
              key={wt}
              type="button"
              role="radio"
              aria-checked={type === wt}
              className={`wcp-item ${type === wt ? 'selected' : ''}`}
              onClick={() => setType(wt)}
            >
              <div className="wcp-portrait">
                {WARRIOR_IMAGES[wt] && <img src={WARRIOR_IMAGES[wt]} alt="" />}
              </div>
              <div className="wcp-name">{wt}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="ws-section ws-section--row recruit-ip">
        <div>
          <div className="ws-section-label">Starting IP</div>
          <p className="eog-help eog-help--tight">New warriors start with 0 IP. Change it only for house rules.</p>
        </div>
        <div className="co-settings-stepper">
          <button className="co-settings-step-btn" onClick={() => setStartIP(v => Math.max(0, v - 1))} disabled={startIP <= 0} aria-label="Less starting IP">−</button>
          <span className="co-settings-step-val" aria-live="polite">{startIP}</span>
          <button className="co-settings-step-btn" onClick={() => setStartIP(v => Math.min(20, v + 1))} aria-label="More starting IP">+</button>
        </div>
      </div>
    </BottomSheet>
  )
}
