import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress } from '../store/campaign'
import CampaignSettingsSheet from './CampaignSettingsSheet'
import ActivityLogView from './ActivityLogView'
import { RESULT_LETTER, resultWords, reopenCampaignIn } from './campaignUi'
import CampaignGroupStrip from './CampaignGroupStrip'

// ── Campaign panel in the company header ──────────────────────────────────────
// "Game N" and the recent results, then [menu] [End game N]. The menu (CampaignSettingsSheet)
// holds the log, undo, Fix IP, Play together and End campaign. Campaigns have no set length:
// they run until the player ends one ("Campaign complete", the tally, and New game to reopen).
// What each warrior needs (IP to spend, an empty slot) is shown on the warrior cards.
// In a shared campaign the members row sits underneath.

// The last 6 results and the next game; "+N" for the earlier games. Always one line.
const TRACK_RECENT = 6
function Track({ log, completed, ended }) {
  const end = completed + (ended ? 0 : 1)
  const start = Math.max(0, completed - TRACK_RECENT)
  const tally = resultWords(log)
  return (
    <span className="cmp-track" role="img" aria-label={`${completed} ${completed === 1 ? 'game' : 'games'} played${tally ? `: ${tally}` : ''}`}>
      {start > 0 && <span className="cmp-track-more">+{start}</span>}
      {Array.from({ length: end - start }, (_, k) => {
        const i = start + k
        const r = log.find(x => x.gameNumber === i + 1)
        const played = i < completed
        const cls = r ? ` is-${r.result}` : played ? ' is-played' : ' is-now'
        return <span key={i} className={`cmp-pip${cls}`}>{r ? RESULT_LETTER[r.result] : played ? '✓' : i + 1}</span>
      })}
    </span>
  )
}

const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" width="22" height="22" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export default function CampaignPanel({ onEndOfGame }) {
  const store = useBuilderStore()
  const { slots, companyMode, campaignGame, campaign, companyId, companyName, getCampaignProgress } = store
  const [logOpen, setLogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const company = { companyMode, slots, campaignGame, campaign }
  // getCampaignProgress: { completed, nextGame, isComplete, ended } (no set length)
  const progress = getCampaignProgress?.() ?? campaignProgress(company)
  const { completed } = progress
  const ended = !!(progress.ended ?? progress.isComplete)
  const nextGame = progress.nextGame ?? completed + 1
  const log = campaign?.log || []
  const legacyGames = Math.max(0, completed - log.length)

  return (
    <div className={`ch-camp${ended ? ' is-complete' : ''}`} data-testid="campaign-panel">
      <div className="ch-camp-head">
        <h3 className="ch-camp-title">{ended ? 'Campaign complete' : `Game ${nextGame}`}</h3>
        <Track log={log} completed={completed} ended={ended} />
        {ended && <p className="ch-camp-note">{legacyGames ? `${completed} games played` : resultWords(log) || 'No games played'}</p>}
      </div>

      <div className="ch-camp-actions">
        <button type="button" className="ch-camp-btn ch-camp-menu-btn" data-testid="campaign-menu" onClick={() => setMenuOpen(true)}
          aria-label="Campaign menu" aria-haspopup="dialog" title="Campaign menu">
          <IconMenu />
        </button>
        {ended ? (
          <button type="button" className="ch-camp-btn ch-camp-btn--primary ch-camp-new-btn" onClick={() => reopenCampaignIn(store)}
            aria-label={`New game: reopens the campaign so you can record game ${completed + 1}`}>
            New game
          </button>
        ) : (
          <button type="button" className="ch-camp-btn ch-camp-btn--primary ch-camp-eog-btn" onClick={onEndOfGame}>
            End game {nextGame}
          </button>
        )}
      </div>

      {/* Members row of a shared campaign; empty (and hidden) otherwise */}
      <div className="ch-camp-group"><CampaignGroupStrip companyId={companyId} /></div>

      {logOpen && <ActivityLogView companyId={companyId} companyName={companyName} onClose={() => setLogOpen(false)} />}
      {menuOpen && <CampaignSettingsSheet onClose={() => setMenuOpen(false)} onOpenLog={() => { setMenuOpen(false); setLogOpen(true) }} />}
    </div>
  )
}
