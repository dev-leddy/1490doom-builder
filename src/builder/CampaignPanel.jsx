import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress, vacancies } from '../store/campaign'
import CampaignSettingsSheet from './CampaignSettingsSheet'
import { SvgGear } from './icons'
import ActivityLogView from './ActivityLogView'
import { RESULT_LETTER, spendableNow, resultWords, fallenName } from './campaignUi'

const nameOf = s => (s.customName && s.customName.trim()) || s.type

// ── Campaign panel in the company header ──────────────────────────────────────
// "Game N" with the six-game track, what to do before it (recruit, spend IP) or "Ready",
// then Log (the full-screen campaign log) / End game N (primary) / the gear for campaign settings.
// After the last game: "Campaign complete" with the tally in words and Keep playing.

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

function scrollToSlot(selector) {
  const el = document.querySelector(selector)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.querySelector('.slot-recruit-btn, .ip-upgrade-btn, button')?.focus({ preventScroll: true })
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

  const fallenSlots = vacancies(company).filter(v => v.fallen || v.captainPlaceholder)
  const spendSlots = slots.map((s, i) => ({ i, n: spendableNow(s), name: nameOf(s) })).filter(x => x.n > 0)
  const toSpend = spendSlots.reduce((n, x) => n + x.n, 0)
  const ready = fallenSlots.length === 0 && toSpend === 0
  const fallenNames = fallenSlots.filter(v => v.fallen).map(v => fallenName(v.fallen))

  return (
    <div className={`ch-camp${isComplete ? ' is-complete' : ''}`} data-testid="campaign-panel">
      <div className="ch-camp-head">
        <h3 className="ch-camp-title">{isComplete ? 'Campaign complete' : `Game ${nextGame}`}</h3>
        <Track log={log} completed={completed} total={total} isComplete={isComplete} />
      </div>

      {isComplete ? (
        <p className="ch-camp-note">{legacyGames ? `${completed} games played` : resultWords(log)}</p>
      ) : ready ? (
        <p className="ch-camp-note"><span className="ch-camp-check" aria-hidden="true">✓</span>Ready for game {nextGame}</p>
      ) : (
        <>
          {fallenSlots.length > 0 && (
            <button type="button" className="ch-camp-todo ch-camp-todo--recruit" onClick={() => scrollToSlot(`.warrior-slot[data-slot="${fallenSlots[0].index}"]`)}>
              <span className="n" aria-hidden="true">{fallenSlots.length}</span>
              <span className="ch-camp-todo-text">
                <span className="ch-camp-todo-label">Recruit {fallenSlots.length} {fallenSlots.length === 1 ? 'warrior' : 'warriors'}</span>
                <span className="ch-camp-todo-sub">{fallenNames.length ? `Replaces the fallen ${fallenNames.join(', ')}` : 'Your company needs a new Captain'}</span>
              </span>
              <span className="go" aria-hidden="true">›</span>
            </button>
          )}
          {toSpend > 0 && (
            <button type="button" className="ch-camp-todo ch-camp-todo--spend" onClick={() => scrollToSlot(`.warrior-slot[data-slot="${spendSlots[0].i}"]`)}>
              <span className="n" aria-hidden="true">{toSpend}</span>
              <span className="ch-camp-todo-text">
                <span className="ch-camp-todo-label">Spend {toSpend} IP</span>
                <span className="ch-camp-todo-sub">{spendSlots.map(x => `${x.name} ${x.n}`).join(' · ')}</span>
              </span>
              <span className="go" aria-hidden="true">›</span>
            </button>
          )}
        </>
      )}

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
        <button type="button" className="ch-camp-btn ch-camp-gear" onClick={() => setSettingsOpen(true)}
          aria-label="Campaign settings" title="Campaign settings">
          <SvgGear />
        </button>
      </div>

      {logOpen && <ActivityLogView companyId={companyId} companyName={companyName} onClose={() => setLogOpen(false)} />}
      {settingsOpen && <CampaignSettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
