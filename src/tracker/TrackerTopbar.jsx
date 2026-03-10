import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { MARK_IMAGES } from '../data/images'
import ConfirmModal from '../shared/ConfirmModal'

export default function TrackerTopbar() {
  const { mark, companyName, round, changeRound, resetTracker, closeTracker, openMarkPopup, refOpen, openRef, closeRef } = useTrackerStore()
  const markImg = mark ? MARK_IMAGES[mark] : null
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  function handleResetConfirm() {
    setConfirmReset(false)
    resetTracker()
  }

  return (
    <div className="tk-topbar">
      <button className="tk-topbar-btn" onClick={() => setConfirmExit(true)}>✕</button>

      <div className="tk-topbar-identity" onClick={openMarkPopup} title="View company mark">
        {markImg && <img src={markImg} className="tk-topbar-mark-img" alt={mark} />}
        <div className="tk-topbar-names">
          <span className="tk-topbar-name">{companyName || 'Unnamed Company'}</span>
          {mark && <span className="tk-topbar-mark-name">{mark}</span>}
        </div>
      </div>

      <div className="tk-round-ctrl">
        <button className="tk-round-btn" onClick={() => changeRound(-1)}>−</button>
        <div className="tk-round-display">
          <span className="tk-round-label">RND</span>
          <span className="tk-round-num">{round}</span>
        </div>
        <button className="tk-round-btn" onClick={() => changeRound(1)}>+</button>
      </div>

      <button className="tk-topbar-btn" onClick={() => setConfirmReset(true)} title="Reset game">↺</button>
      <button className="tk-topbar-btn" onClick={refOpen ? closeRef : openRef} title="Quick Reference">📖</button>

      {confirmReset && (
        <ConfirmModal
          title="Reset Game?"
          subtitle="This will restore all warriors to full Vitality, clear all status effects and cache items, reset Once Per Game abilities, and return to Round 1. Your company build is unchanged."
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      {confirmExit && (
        <ConfirmModal
          title="Return to Builder?"
          subtitle="This will take you back to the Company Builder. Your current game state (vitality, statuses, round) will be lost."
          onConfirm={closeTracker}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </div>
  )
}
