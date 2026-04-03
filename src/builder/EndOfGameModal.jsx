import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import BottomSheet from '../shared/BottomSheet'

export default function EndOfGameModal({ onClose }) {
  const { slots, campaignGame, awardEndOfGame } = useBuilderStore()
  const activeSlots = slots.map((s, i) => ({ ...s, index: i })).filter(s => s.type)

  const [step, setStep] = useState(1)
  const [survivors, setSurvivors] = useState(() => new Set(activeSlots.map(s => s.index)))
  const [newCaptainIndex, setNewCaptainIndex] = useState(null)
  const [won, setWon] = useState(null)

  const captain = activeSlots.find(s => s.isCaptain)
  const captainFell = captain && !survivors.has(captain.index)
  const survivingWarriors = activeSlots.filter(s => survivors.has(s.index) && !s.isCaptain)
  const captainInSurvivors = captain && survivors.has(captain.index)
  const needsCaptainPromo = captainFell && survivingWarriors.length > 0

  function toggleSurvivor(idx) {
    setSurvivors(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
    setNewCaptainIndex(null)
  }

  function goToStep2() {
    if (needsCaptainPromo) setStep(2)
    else setStep(3)
  }

  function handleAward() {
    awardEndOfGame({
      survivorIndices: [...survivors],
      captainWon: won === true && captainInSurvivors,
      newCaptainIndex: needsCaptainPromo ? newCaptainIndex : null,
    })
    onClose()
  }

  const stepTitle = step === 1 ? `END OF GAME ${campaignGame + 1}`
    : step === 2 ? 'CHOOSE CAPTAIN'
    : 'VICTORY OR DEFEAT'

  const footer = step === 1 ? (
    <>
      <button className="co-sheet-randomize" onClick={onClose}>Cancel</button>
      <button className="co-sheet-done" onClick={goToStep2}>Next</button>
    </>
  ) : step === 2 ? (
    <>
      <button className="co-sheet-randomize" onClick={() => setStep(1)}>Back</button>
      <button className="co-sheet-done" disabled={newCaptainIndex === null} onClick={() => setStep(3)}>Next</button>
    </>
  ) : (
    <>
      <button className="co-sheet-randomize" onClick={() => setStep(needsCaptainPromo ? 2 : 1)}>Back</button>
      <button className="co-sheet-done" disabled={won === null} onClick={handleAward}>Award IP</button>
    </>
  )

  return (
    <BottomSheet title={stepTitle} onClose={onClose} footer={footer}>

      {/* ── STEP 1: Who survived? ───────────────────────────── */}
      {step === 1 && (
        <>
          <div className="eog-subtitle">Which warriors survived?</div>
          <div className="eog-warrior-list">
            {activeSlots.map(s => (
              <label key={s.index} className={`eog-warrior-row ${survivors.has(s.index) ? 'survived' : 'fallen'}`}>
                <input
                  type="checkbox"
                  checked={survivors.has(s.index)}
                  onChange={() => toggleSurvivor(s.index)}
                />
                <span className="eog-warrior-name">
                  {s.isCaptain && <span className="eog-captain-star">★ </span>}
                  {s.customName || s.type}
                </span>
                <span className="eog-warrior-ip">{s.earnedIP || 0} IP</span>
              </label>
            ))}
          </div>
          {captainFell && survivingWarriors.length > 0 && (
            <div className="eog-captain-fell-note">
              ★ The Captain fell — you'll choose a replacement next.
            </div>
          )}
          {captainFell && survivingWarriors.length === 0 && (
            <div className="eog-captain-fell-note">
              ★ The Captain fell with no surviving warriors. A new Captain will be added.
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: Captain promotion ───────────────────────── */}
      {step === 2 && (
        <>
          <div className="eog-subtitle">Choose a new Captain</div>
          <div className="eog-captain-promo-note">
            The Captain fell in battle. An existing warrior must rise to lead the company.
          </div>
          <div className="eog-warrior-list">
            {survivingWarriors.map(s => (
              <label key={s.index} className={`eog-warrior-row survived ${newCaptainIndex === s.index ? 'new-captain' : ''}`}>
                <input
                  type="radio"
                  name="new-captain"
                  checked={newCaptainIndex === s.index}
                  onChange={() => setNewCaptainIndex(s.index)}
                />
                <span className="eog-warrior-name">{s.customName || s.type}</span>
                <span className="eog-warrior-ip">{s.earnedIP || 0} IP</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── STEP 3: Victory / Defeat ────────────────────────── */}
      {step === 3 && (
        <>
          <div className="eog-subtitle">Did your company win?</div>
          <div className="eog-win-btns">
            <button className={`eog-win-btn ${won === true ? 'selected' : ''}`} onClick={() => setWon(true)}>Victory</button>
            <button className={`eog-win-btn ${won === false ? 'selected' : ''}`} onClick={() => setWon(false)}>Defeat</button>
          </div>
          <div className="eog-summary">
            <div className="eog-summary-title">End of Game Summary:</div>
            {activeSlots.map(s => {
              const survives = survivors.has(s.index)
              const isNewCaptain = newCaptainIndex === s.index
              const isOldCaptain = s.isCaptain
              const captainBonus = won === true && isOldCaptain && captainInSurvivors
              const ipEarned = survives ? 1 + (captainBonus ? 1 : 0) : 0

              if (!survives) return (
                <div key={s.index} className="eog-summary-row fallen">
                  <span>
                    {isOldCaptain && <span className="eog-captain-star">★ </span>}
                    {s.customName || s.type}
                  </span>
                  <span className="eog-summary-ip eog-summary-fell">Fell — replaced by new warrior</span>
                </div>
              )
              return (
                <div key={s.index} className="eog-summary-row">
                  <span>
                    {(isNewCaptain ? '★ ' : isOldCaptain ? '★ ' : '')}
                    {s.customName || s.type}
                    {isNewCaptain && <span className="eog-new-captain-label"> (new Captain)</span>}
                  </span>
                  <span className="eog-summary-ip">
                    +{ipEarned} IP{captainBonus ? ' (+1 Captain)' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

    </BottomSheet>
  )
}
