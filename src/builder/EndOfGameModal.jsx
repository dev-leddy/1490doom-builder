import { useState, useMemo } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useTrackerStore } from '../store/trackerStore'
import { WARRIOR_IMAGES } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

const RULEBOOK_TEXT =
  'At the end of each game, each player gives 1 improvement point to a model that ' +
  'survived the game. The winner awards 1 additional point to their Captain. These ' +
  'points cannot be spent on the same item or stat twice on a single warrior. ' +
  'These upgrades are permanent.'

const RETREAT_TEXT =
  'At the beginning of any model\'s activation, a player may choose to retreat. ' +
  'That player concedes all victory points to their opponent, and in a Campaign ' +
  'they add NO improvement points to their Doom Company.'

/* ── Warrior identity block: portrait + name + class ─────── */
function WarriorIdentity({ s, isCaptain, showClass }) {
  const displayName = s.customName && s.customName !== s.type ? s.customName : s.type

  return (
    <div className="eog-identity">
      <img src={WARRIOR_IMAGES[s.type]} alt={s.type} className="eog-portrait" />
      <div className="eog-identity-text">
        <span className="eog-warrior-name">
          {isCaptain && <span className="eog-captain-star">★ </span>}
          {displayName}
        </span>
        {showClass && <span className="eog-warrior-class">{s.type}</span>}
      </div>
    </div>
  )
}

export default function EndOfGameModal({ onClose, onConfirm }) {
  const { slots, campaignGame, awardEndOfGame } = useBuilderStore()
  const activeSlots = slots.map((s, i) => ({ ...s, index: i })).filter(s => s.type)
  const anyNamed = activeSlots.some(s => s.customName && s.customName.trim())

  // Pre-populate survivors from tracker vitality if available
  const initialSurvivors = useMemo(() => {
    const trackerWarriors = useTrackerStore.getState().warriors
    if (trackerWarriors.length > 0) {
      return new Set(
        activeSlots
          .filter(s => {
            const tw = trackerWarriors.find(w => w.index === s.index)
            return !tw || tw.currentVit > 0
          })
          .map(s => s.index)
      )
    }
    return new Set(activeSlots.map(s => s.index))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Step order: 1 = Victory/Defeat/Retreat + Who survived, 2 = Captain promo (if needed), 3 = Allocate IP
  const [step, setStep] = useState(1)
  const [won, setWon] = useState(null)       // true | false | 'retreat' | null
  const [survivors, setSurvivors] = useState(initialSurvivors)
  const [newCaptainIndex, setNewCaptainIndex] = useState(null)
  const [objectiveIPs, setObjectiveIPs] = useState(0)
  const [allocation, setAllocation] = useState({})

  const isRetreat = won === 'retreat'

  const captain = activeSlots.find(s => s.isCaptain)
  const captainFell = captain && !survivors.has(captain.index)
  const survivingNonCaptains = activeSlots.filter(s => survivors.has(s.index) && !s.isCaptain)
  const captainInSurvivors = captain && survivors.has(captain.index)
  const needsCaptainPromo = captainFell && survivingNonCaptains.length > 0

  const effectiveCaptainIndex = captainInSurvivors
    ? captain?.index
    : (needsCaptainPromo ? newCaptainIndex : null)
  const captainBonus = won === true && effectiveCaptainIndex != null

  const freePool = 1 + objectiveIPs + (captainBonus ? 1 : 0)
  const allocated = useMemo(
    () => Object.values(allocation).reduce((sum, n) => sum + n, 0),
    [allocation]
  )
  const remaining = freePool - allocated

  function toggleSurvivor(idx) {
    setSurvivors(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
    setNewCaptainIndex(null)
    setAllocation({})
  }

  function adjustAllocation(idx, delta) {
    setAllocation(prev => {
      const cur = prev[idx] || 0
      if (delta > 0 && remaining <= 0) return prev
      return { ...prev, [idx]: Math.max(0, cur + delta) }
    })
  }

  function goToAllocation() {
    // On victory, default the free IP to the captain — player can reassign
    setAllocation(captainBonus && effectiveCaptainIndex != null
      ? { [effectiveCaptainIndex]: 1 }
      : {}
    )
    setStep(3)
  }

  function handleRetreatConfirm() {
    awardEndOfGame({
      survivorIndices: [...survivors],
      ipAllocations: {},
      newCaptainIndex: needsCaptainPromo ? newCaptainIndex : null,
    })
    onConfirm?.()
    onClose()
  }

  function goNext() {
    if (needsCaptainPromo) setStep(2)
    else if (isRetreat) handleRetreatConfirm()
    else goToAllocation()
  }

  function handleConfirm() {
    awardEndOfGame({
      survivorIndices: [...survivors],
      ipAllocations: allocation,
      newCaptainIndex: needsCaptainPromo ? newCaptainIndex : null,
    })
    onConfirm?.()
    onClose()
  }

  const stepTitle = step === 1 ? `END OF GAME ${campaignGame + 1}`
    : step === 2 ? 'CHOOSE CAPTAIN'
    : 'ALLOCATE IP'

  // Step 2 next: on retreat skip allocation
  const step2Next = isRetreat ? handleRetreatConfirm : goToAllocation

  const footer = step === 1 ? (
    <>
      <button className="co-sheet-randomize" onClick={onClose}>Cancel</button>
      <button className="co-sheet-done" disabled={won === null} onClick={goNext}>
        {isRetreat ? 'Confirm Retreat' : 'Next'}
      </button>
    </>
  ) : step === 2 ? (
    <>
      <button className="co-sheet-randomize" onClick={() => setStep(1)}>Back</button>
      <button className="co-sheet-done" disabled={newCaptainIndex === null} onClick={step2Next}>
        {isRetreat ? 'Confirm Retreat' : 'Next'}
      </button>
    </>
  ) : (
    <>
      <button className="co-sheet-randomize" onClick={() => setStep(needsCaptainPromo ? 2 : 1)}>Back</button>
      <button className="co-sheet-done" disabled={remaining !== 0} onClick={handleConfirm}>Confirm</button>
    </>
  )

  return (
    <BottomSheet title={stepTitle} onClose={onClose} footer={footer}>

      {/* ── STEP 1: Victory/Defeat/Retreat + Who survived ───── */}
      {step === 1 && (
        <>
          <div className="eog-win-btns">
            <button className={`eog-win-btn ${won === true ? 'selected' : ''}`} onClick={() => setWon(true)}>Victory</button>
            <button className={`eog-win-btn ${won === false ? 'selected' : ''}`} onClick={() => setWon(false)}>Defeat</button>
            <button className={`eog-win-btn eog-win-btn--retreat ${won === 'retreat' ? 'selected' : ''}`} onClick={() => setWon('retreat')}>Retreated</button>
          </div>

          {isRetreat && (
            <div className="eog-retreat-note">{RETREAT_TEXT}</div>
          )}

          <div className="eog-subtitle" style={{ marginTop: '1rem' }}>Which warriors survived?</div>
          <div className="eog-warrior-list">
            {activeSlots.map(s => (
              <label key={s.index} className={`eog-warrior-row ${survivors.has(s.index) ? 'survived' : 'fallen'}`}>
                <input type="checkbox" checked={survivors.has(s.index)} onChange={() => toggleSurvivor(s.index)} />
                <WarriorIdentity s={s} isCaptain={s.isCaptain} showClass={anyNamed} />
                <span className="eog-warrior-ip">{s.earnedIP || 0} IP</span>
              </label>
            ))}
          </div>
          {captainFell && survivingNonCaptains.length > 0 && (
            <div className="eog-captain-fell-note">★ The Captain fell — you'll choose a replacement next.</div>
          )}
          {captainFell && survivingNonCaptains.length === 0 && (
            <div className="eog-captain-fell-note">★ The Captain fell with no surviving warriors. A new Captain will be added.</div>
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
            {survivingNonCaptains.map(s => (
              <label key={s.index} className={`eog-warrior-row survived ${newCaptainIndex === s.index ? 'new-captain' : ''}`}>
                <input type="radio" name="new-captain" checked={newCaptainIndex === s.index} onChange={() => setNewCaptainIndex(s.index)} />
                <WarriorIdentity s={s} isCaptain={false} showClass={anyNamed} />
                <span className="eog-warrior-ip">{s.earnedIP || 0} IP</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── STEP 3: IP Allocation ───────────────────────────── */}
      {step === 3 && (
        <>
          <div className="eog-rulebook-reminder">{RULEBOOK_TEXT}</div>

          <div className="eog-objective-row">
            <span className="eog-objective-label">Objective Bonus IP</span>
            <div className="eog-stepper">
              <button
                className="eog-stepper-btn"
                onClick={() => {
                  const next = Math.max(0, objectiveIPs - 1)
                  if (allocated > 1 + next) setAllocation({})
                  setObjectiveIPs(next)
                }}
              >−</button>
              <span className="eog-stepper-val">{objectiveIPs}</span>
              <button className="eog-stepper-btn" onClick={() => setObjectiveIPs(v => v + 1)}>+</button>
            </div>
          </div>

          <div className="eog-alloc-header">
            <span>Warriors</span>
            <span className="eog-remaining" data-over={remaining < 0}>{remaining} IP remaining</span>
          </div>

          <div className="eog-warrior-list">
            {[...activeSlots].sort((a, b) => (survivors.has(a.index) ? 0 : 1) - (survivors.has(b.index) ? 0 : 1)).map(s => {
              const isDead = !survivors.has(s.index)
              const isEffCaptain = s.index === effectiveCaptainIndex
              const captainBonusHere = captainBonus && isEffCaptain
              const cur = allocation[s.index] || 0
              return (
                <div key={s.index} className={`eog-warrior-row eog-alloc-row ${isDead ? 'fallen' : 'survived'} ${captainBonusHere ? 'eog-captain-victory-row' : ''}`}>
                  <div className="eog-alloc-warrior-info">
                    <WarriorIdentity s={s} isCaptain={s.isCaptain || isEffCaptain} showClass={anyNamed} />
                    <span className="eog-current-ip">Current IP {s.earnedIP || 0}</span>
                  </div>
                  {isDead ? (
                    <span className="eog-dead-label">💀 DEAD</span>
                  ) : (
                    <div className="eog-stepper">
                      <button className="eog-stepper-btn" onClick={() => adjustAllocation(s.index, -1)} disabled={cur <= 0}>−</button>
                      <span className="eog-stepper-val">{cur}</span>
                      <button className="eog-stepper-btn" onClick={() => adjustAllocation(s.index, 1)} disabled={remaining <= 0}>+</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {remaining !== 0 && (
            <div className="eog-alloc-hint">
              {remaining > 0
                ? `Allocate all ${freePool} IP before confirming.`
                : 'Too many IPs allocated — reduce before confirming.'}
            </div>
          )}
        </>
      )}

    </BottomSheet>
  )
}
