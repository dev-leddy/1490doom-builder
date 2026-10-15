import { useState } from 'react'
import { useTrackerStore } from '../store/trackerStore'
import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { getAvatarSrc } from '../data/avatars'
import ConfirmModal from '../shared/ConfirmModal'
import BottomSheet from '../shared/BottomSheet'
import EndOfGameModal from '../builder/EndOfGameModal'
import { campaignProgress } from '../store/campaign'
import { RESULT_LETTER, RESULT_NAME } from '../builder/campaignUi'

export default function TrackerTopbar() {
  const { mark, companyName, companyAvatar, round, changeRound, warriors, resetTracker, closeTracker, openMarkPopup, refOpen, openRef, closeRef } = useTrackerStore()
  const trackerCampaign = useTrackerStore(s => s.campaign)
  const { companyMode, campaignGame, campaign, slots } = useBuilderStore()
  const isCampaign = companyMode === 'campaign'
  const progress = campaignProgress({ companyMode, campaignGame, campaign, slots })
  const gameNumber = trackerCampaign?.gameNumber ?? progress.nextGame ?? progress.completed
  const campaignLog = campaign?.log || []
  // The last few results, oldest first (campaigns have no set length); shown in the campaign sheet
  const recentResults = campaignLog
    .filter(x => x.gameNumber < gameNumber && RESULT_LETTER[x.result])
    .sort((a, b) => a.gameNumber - b.gameNumber)
    .slice(-5)
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [confirmRetreat, setConfirmRetreat] = useState(false)
  const [eogResult, setEogResult] = useState(null)
  const markImg = mark ? MARK_IMAGES[mark] : null
  const avatarSrc = getAvatarSrc(companyAvatar)
  const [confirmReset, setConfirmReset] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [endOfGameOpen, setEndOfGameOpen] = useState(false)

  function openEndOfGame(result = null) {
    setCampaignOpen(false)
    setMenuOpen(false)
    setEogResult(result)
    setEndOfGameOpen(true)
  }

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
            <button
              className="tk-campaign-chip"
              onClick={() => setCampaignOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={campaignOpen}
              aria-label={`Game ${gameNumber}: end game or retreat`}
            >
              <span className="tk-campaign-chip-label">Game <b>{gameNumber}</b></span>
              <svg className="tk-campaign-chip-caret" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
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
            {isCampaign && <CampaignMenuRows onEnd={() => openEndOfGame()} onRetreat={() => { setMenuOpen(false); setConfirmRetreat(true) }} />}
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

      {/* Campaign sheet: opened from the GAME N button */}
      {campaignOpen && (
        <BottomSheet title={`CAMPAIGN · GAME ${gameNumber}`} onClose={() => setCampaignOpen(false)} className="tk-sheet tk-sheet--menu tk-campaign-sheet">
          <dl className="tk-campaign-status">
            <div className="tk-campaign-stat">
              <dt className="tk-campaign-stat-lbl">This game</dt>
              <dd className="tk-campaign-stat-val">Round {round} · {standing.length} of {warriors.length} standing</dd>
            </div>
            <div className="tk-campaign-stat tk-campaign-stat--recent">
              <dt className="tk-campaign-stat-lbl">{recentResults.length > 1 ? `Last ${recentResults.length} games` : 'Last game'}</dt>
              <dd className="tk-campaign-stat-val">
                {recentResults.length ? (
                  <span className="cmp-track">
                    {recentResults.map(g => (
                      <span key={g.gameNumber} role="img" className={`cmp-pip is-${g.result}`} title={`Game ${g.gameNumber}: ${RESULT_NAME[g.result]}`} aria-label={`Game ${g.gameNumber}: ${RESULT_NAME[g.result]}`}>
                        {RESULT_LETTER[g.result]}
                      </span>
                    ))}
                  </span>
                ) : <span className="tk-campaign-stat-none">First game</span>}
              </dd>
            </div>
          </dl>
          <div className="tk-menu-list">
            <CampaignMenuRows onEnd={() => openEndOfGame()} onRetreat={() => { setCampaignOpen(false); setConfirmRetreat(true) }} />
          </div>
        </BottomSheet>
      )}

      {confirmRetreat && (
        <BottomSheet
          title="RETREAT?"
          onClose={() => setConfirmRetreat(false)}
          className="tk-sheet tk-sheet--confirm tk-retreat-sheet"
          footer={
            <>
              <button className="co-sheet-randomize" onClick={() => setConfirmRetreat(false)}>Keep fighting</button>
              <button className="co-sheet-done tk-retreat-confirm" onClick={() => { setConfirmRetreat(false); openEndOfGame('retreat') }}>Retreat</button>
            </>
          }
        >
          <p className="confirm-modal-text">Your company quits the field. You may retreat at the start of any model's activation.</p>
          <dl className="tk-rule-list tk-confirm-rules">
            <div className="tk-rule-row tk-rule-row--limit">
              <dt className="tk-rule-lbl">Victory points</dt>
              <dd className="tk-rule-text">All go to your opponent.</dd>
            </div>
            <div className="tk-rule-row tk-rule-row--limit">
              <dt className="tk-rule-lbl">IP</dt>
              <dd className="tk-rule-text">Your company earns none this game.</dd>
            </div>
            <div className="tk-rule-row">
              <dt className="tk-rule-lbl">Warriors</dt>
              <dd className="tk-rule-text">Those still standing survive. The fallen are still lost.</dd>
            </div>
          </dl>
        </BottomSheet>
      )}

      {endOfGameOpen && (
        <EndOfGameModal
          initialResult={eogResult}
          onClose={() => setEndOfGameOpen(false)}
          // The sheet closes this game itself once the result is recorded
          onConfirm={() => setEndOfGameOpen(false)}
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

const ICON_FLAG = <path d="M5 21V4h11l-1.5 4L16 12H5" />
const ICON_RETREAT = <><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 5l6 7-6 7" /></>

function CampaignMenuRows({ onEnd, onRetreat }) {
  const icon = d => (
    <span className="tk-menu-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
    </span>
  )
  return (
    <>
      <button className="tk-menu-item tk-menu-item--end-game" onClick={onEnd}>
        {icon(ICON_FLAG)}
        <span className="tk-menu-text">
          <span className="tk-menu-label">End game</span>
          <span className="tk-menu-sub">Record the result and award IP</span>
        </span>
      </button>
      <button className="tk-menu-item tk-menu-item--danger tk-menu-item--retreat" onClick={onRetreat}>
        {icon(ICON_RETREAT)}
        <span className="tk-menu-text">
          <span className="tk-menu-label">Retreat</span>
          <span className="tk-menu-sub">Concede all VP. No IP this game</span>
        </span>
      </button>
    </>
  )
}
