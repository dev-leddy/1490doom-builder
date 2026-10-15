import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress } from '../store/campaign'
import CampaignSettingsSheet from './CampaignSettingsSheet'
import { SvgGear } from './icons'
import ActivityLogView from './ActivityLogView'
import { RESULT_LETTER, resultWords } from './campaignUi'
import CampaignGroupStrip from './CampaignGroupStrip'

// ── Campaign panel in the company header ──────────────────────────────────────
// [gear] "Game N" and the game track, then Log / End game N (primary). After the last game:
// "Campaign complete", the tally in words and Keep playing. What each warrior needs (IP to
// spend, an empty slot to recruit into) is shown on the warrior cards, not here.
// In a shared campaign the members row sits underneath.

// Every game while the campaign is short (8 or fewer); longer or unlimited campaigns show
// "+N" for the earlier games, the last 6 results and the next game, on one line.
const TRACK_ALL = 8
const TRACK_RECENT = 6
function Track({ log, completed, total, isComplete }) {
  const upTo = completed + (isComplete ? 0 : 1)              // games to show: played + the next one
  const showAll = total != null && Math.max(total, upTo) <= TRACK_ALL
  const end = showAll ? Math.max(total, upTo) : upTo
  const start = showAll ? 0 : Math.max(0, completed - TRACK_RECENT)
  const tally = resultWords(log)
  const label = `${completed} ${total != null ? `of ${total} ` : ''}games played${tally ? `: ${tally}` : ''}`
  return (
    <span className="cmp-track" role="img" aria-label={label}>
      {start > 0 && <span className="cmp-track-more">+{start}</span>}
      {Array.from({ length: end - start }, (_, k) => {
        const i = start + k
        const r = log.find(x => x.gameNumber === i + 1)
        const played = i < completed
        const now = i === completed && !isComplete
        const cls = r ? ` is-${r.result}` : played ? ' is-played' : now ? ' is-now' : ''
        return <span key={i} className={`cmp-pip${cls}`}>{r ? RESULT_LETTER[r.result] : played ? '✓' : i + 1}</span>
      })}
      {!showAll && total != null && <span className="cmp-track-more">of {total}</span>}
    </span>
  )
}

export default function CampaignPanel({ onEndOfGame }) {
  const { slots, companyMode, campaignGame, campaign, companyId, companyName, getCampaignProgress, keepPlaying } = useBuilderStore()
  const [logOpen, setLogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const company = { companyMode, slots, campaignGame, campaign }
  // getCampaignProgress: { completed, total (null = no limit), isComplete, nextGame, unlimited }
  const { completed, total, isComplete, nextGame } = getCampaignProgress?.() ?? campaignProgress(company)
  const log = campaign?.log || []
  const legacyGames = Math.max(0, completed - log.length)

  return (
    <div className={`ch-camp${isComplete ? ' is-complete' : ''}`} data-testid="campaign-panel">
      <div className="ch-camp-head">
        <button type="button" className="ch-camp-btn ch-camp-gear" onClick={() => setSettingsOpen(true)}
          aria-label="Campaign settings" title="Campaign settings">
          <SvgGear />
        </button>
        <h3 className="ch-camp-title">{isComplete ? 'Campaign complete' : `Game ${nextGame}`}</h3>
        <Track log={log} completed={completed} total={total} isComplete={isComplete} />
        {isComplete && <p className="ch-camp-note">{legacyGames ? `${completed} games played` : resultWords(log)}</p>}
      </div>

      <div className="ch-camp-actions">
        <button type="button" className="ch-camp-btn ch-camp-log-btn" onClick={() => setLogOpen(true)}>Log</button>
        {!isComplete ? (
          <button type="button" className="ch-camp-btn ch-camp-btn--primary ch-camp-eog-btn" onClick={onEndOfGame}>
            End game {nextGame}
          </button>
        ) : keepPlaying && (
          <button type="button" className="ch-camp-btn ch-camp-btn--primary ch-camp-keep-btn" onClick={() => keepPlaying()}>
            Keep playing
          </button>
        )}
      </div>

      {/* Members row of a shared campaign; empty (and hidden) otherwise */}
      <div className="ch-camp-group"><CampaignGroupStrip companyId={companyId} /></div>

      {logOpen && <ActivityLogView companyId={companyId} companyName={companyName} onClose={() => setLogOpen(false)} />}
      {settingsOpen && <CampaignSettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
