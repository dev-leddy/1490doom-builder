import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { getAvatarSrc } from '../data/avatars'
import ConfirmModal from '../shared/ConfirmModal'
import BottomSheet from '../shared/BottomSheet'
import EndOfGameModal from '../builder/EndOfGameModal'

export default function TrackerTopbar() {
  const { mark, companyName, companyAvatar, round, changeRound, warriors, resetTracker, closeTracker, openMarkPopup, refOpen, openRef, closeRef } = useTrackerStore()
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

  // At a glance: who has acted this round, out of those still standing
  const standing = warriors.filter(w => !(w.dead || w.currentVit <= 0))
  const activatedCount = standing.filter(w => w.activated).length
  const roundDone = standing.length > 0 && activatedCount === standing.length

  return (
    <>
      <div className="tk-topbar">

        {/* Row 1: menu | company identity | campaign game + End of Game */}
        <div className="tk-topbar-row1">
          <button className="tk-topbar-hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

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
                  <span className="tk-topbar-mark-text">{mark}</span>
                </button>
              )}
            </div>
          </div>

          {isCampaign && (
            <div className="tk-topbar-campaign">
              <span className="tk-topbar-game-label">Game {campaignGame + 1}</span>
              <button className="tk-topbar-eog-btn" onClick={() => setEndOfGameOpen(true)}>
                End of Game
              </button>
            </div>
          )}
        </div>

        {/* Row 2: the round, centred between − and Next; who has activated sits quietly under it */}
        <div className={`tk-round-bar${roundDone ? ' tk-round-bar--done' : ''}`}>
          <button className="tk-round-btn tk-round-btn--prev" onClick={() => changeRound(-1)} aria-label="Previous round">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>

          <div className="tk-round-center">
            <div className="tk-round-display" aria-live="polite">
              <span className="tk-round-label">Round</span>
              <span className="tk-round-num">{round}</span>
            </div>
            <div className="tk-round-progress" aria-label={`${activatedCount} of ${standing.length} activated`}>
              <span className="tk-round-pips" aria-hidden="true">
                {warriors.map((w, i) => {
                  const dead = w.dead || w.currentVit <= 0
                  return <span key={i} className={`tk-round-pip${dead ? ' is-dead' : w.activated ? ' is-done' : ''}`} />
                })}
              </span>
              <span className="tk-round-count">
                {roundDone ? 'All activated' : `${activatedCount}/${standing.length} activated`}
              </span>
            </div>
          </div>

          <button className="tk-round-btn tk-round-btn--next" onClick={() => changeRound(1)} aria-label="Next round">
            <span className="tk-round-next-text">Next</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>

      </div>

      {/* Hamburger menu sheet */}
      {menuOpen && (
        <BottomSheet title="GAME MENU" onClose={() => setMenuOpen(false)} className="tk-sheet tk-sheet--menu">
          <div className="tk-menu-list">
            <button
              className="tk-menu-item"
              onClick={() => { setMenuOpen(false); refOpen ? closeRef() : openRef() }}
            >
              <span className="tk-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" /><path d="M12 6.5v13" /></svg>
              </span>
              <span className="tk-menu-text">
                <span className="tk-menu-label">Quick Reference</span>
                <span className="tk-menu-sub">Actions, statuses and tables</span>
              </span>
              {refOpen && <span className="tk-menu-badge">ON</span>}
            </button>
            <button
              className="tk-menu-item tk-menu-item--danger"
              onClick={() => { setMenuOpen(false); setConfirmReset(true) }}
            >
              <span className="tk-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></svg>
              </span>
              <span className="tk-menu-text">
                <span className="tk-menu-label">Reset Game</span>
                <span className="tk-menu-sub">Back to round 1, full Vitality</span>
              </span>
            </button>
            <button
              className="tk-menu-item tk-menu-item--exit"
              onClick={() => { setMenuOpen(false); closeTracker() }}
            >
              <span className="tk-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M11 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" /></svg>
              </span>
              <span className="tk-menu-text">
                <span className="tk-menu-label">Exit to Builder</span>
                <span className="tk-menu-sub">Leave play mode</span>
              </span>
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
          className="tk-sheet tk-sheet--confirm"
        />
      )}
    </>
  )
}
