import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { getAvatarSrc } from '../data/avatars'
import ConfirmModal from '../shared/ConfirmModal'
import BottomSheet from '../shared/BottomSheet'
import EndOfGameModal from '../builder/EndOfGameModal'

export default function TrackerTopbar() {
  const { mark, companyName, companyAvatar, round, changeRound, resetTracker, closeTracker, openMarkPopup, refOpen, openRef, closeRef } = useTrackerStore()
  const { companyMode, campaignGame } = useBuilderStore()
  const isCampaign = companyMode === 'campaign'
  const markImg = mark ? MARK_IMAGES[mark] : null
  const avatarSrc = getAvatarSrc(companyAvatar)
  const [confirmReset, setConfirmReset] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [endOfGameOpen, setEndOfGameOpen] = useState(false)

  function handleResetConfirm() {
    setConfirmReset(false)
    resetTracker()
  }

  return (
    <>
      <div className="tk-topbar">

        {/* Row 1: hamburger (left) | round control (centered) */}
        <div className="tk-topbar-row1">
          <button className="tk-topbar-hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {isCampaign && (
            <button className="tk-topbar-eog-btn" onClick={() => setEndOfGameOpen(true)}>
              End of Game
            </button>
          )}

          <div className="tk-round-ctrl">
            <button className="tk-round-btn" onClick={() => changeRound(-1)} aria-label="Previous round">−</button>
            <div className="tk-round-display">
              <span className="tk-round-label">Round</span>
              <span className="tk-round-num">{round}</span>
            </div>
            <button className="tk-round-btn" onClick={() => changeRound(1)} aria-label="Next round">+</button>
          </div>
        </div>

        {/* Row 2: avatar + stacked name/mark (left) | game label (right, campaign only) */}
        <div className="tk-topbar-row2">
          <div className="tk-topbar-identity">
            {avatarSrc && (
              <div className="tk-topbar-avatar-ring">
                <div className="tk-topbar-avatar-inner">
                  <img src={avatarSrc} className="tk-topbar-avatar" alt="" />
                </div>
              </div>
            )}
            <div className="tk-topbar-name-stack">
              <span className="tk-topbar-name">{companyName || 'Unnamed Company'}</span>
              {mark && (
                <button className="tk-topbar-mark-sub" onClick={openMarkPopup}>
                  {markImg && <img src={markImg} className="tk-topbar-mark-sub-img" alt="" />}
                  {mark}
                </button>
              )}
            </div>
          </div>
          {isCampaign && (
            <span className="tk-topbar-game-label">Game {campaignGame}</span>
          )}
        </div>

      </div>

      {/* Hamburger menu sheet */}
      {menuOpen && (
        <BottomSheet title="GAME MENU" onClose={() => setMenuOpen(false)}>
          <div className="tk-menu-list">
            <button
              className="tk-menu-item"
              onClick={() => { setMenuOpen(false); refOpen ? closeRef() : openRef() }}
            >
              <span className="tk-menu-icon">📖</span>
              <span className="tk-menu-label">Quick Reference</span>
              {refOpen && <span className="tk-menu-badge">ON</span>}
            </button>
            <button
              className="tk-menu-item tk-menu-item--danger"
              onClick={() => { setMenuOpen(false); setConfirmReset(true) }}
            >
              <span className="tk-menu-icon">↺</span>
              <span className="tk-menu-label">Reset Game</span>
            </button>
            <button
              className="tk-menu-item tk-menu-item--exit"
              onClick={() => { setMenuOpen(false); closeTracker() }}
            >
              <span className="tk-menu-icon">←</span>
              <span className="tk-menu-label">Exit to Builder</span>
            </button>
          </div>
        </BottomSheet>
      )}

      {endOfGameOpen && (
        <EndOfGameModal
          onClose={() => setEndOfGameOpen(false)}
          onConfirm={() => { setEndOfGameOpen(false); resetTracker() }}
        />
      )}

      {confirmReset && (
        <ConfirmModal
          title="Reset Game?"
          subtitle="This will restore all warriors to full Vitality, clear all status effects and cache items, reset Once Per Game abilities, and return to Round 1. Your company build is unchanged."
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </>
  )
}
