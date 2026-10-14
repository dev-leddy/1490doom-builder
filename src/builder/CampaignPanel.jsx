import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress, vacancies } from '../store/campaign'
import CampaignSettingsSheet from './CampaignSettingsSheet'
import { SvgGear } from './icons'
import ActivityLogView from './ActivityLogView'
import { RESULT_LETTER, spendableNow, resultTally } from './campaignUi'

// ── Campaign panel in the company header ──────────────────────────────────────
// "Before game N of 6" with the six-game track, what to do before the next game,
// and Log (the full-screen campaign log) / End of game / the gear for campaign settings.
// After the last game: "Campaign complete".

function Track({ log, completed, total }) {
  return (
    <span className="cmp-track" role="img" aria-label={`${completed} of ${total} games played`}>
      {Array.from({ length: total }, (_, i) => {
        const r = log.find(x => x.gameNumber === i + 1)
        const played = i < completed
        const now = i === completed
        const cls = r ? ` is-${r.result}` : played ? ' is-played' : now ? ' is-now' : ''
        return <span key={i} className={`cmp-pip${cls}`}>{r ? RESULT_LETTER[r.result] : played ? '✓' : i + 1}</span>
      })}
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
  const { slots, companyMode, campaignGame, campaign, companyId, companyName } = useBuilderStore()
  const [logOpen, setLogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const company = { companyMode, slots, campaignGame, campaign }
  const { completed, total, isComplete, nextGame } = campaignProgress(company)
  const log = campaign?.log || []
  const legacyGames = Math.max(0, completed - log.length)

  const fallenSlots = vacancies(company).filter(v => v.fallen || v.captainPlaceholder)
  const spendSlots = slots.map((s, i) => ({ i, n: spendableNow(s) })).filter(x => x.n > 0)
  const toSpend = spendSlots.reduce((n, x) => n + x.n, 0)
  const ready = fallenSlots.length === 0 && toSpend === 0

  return (
    <div className={`ch-camp${isComplete ? ' is-complete' : ''}`} data-testid="campaign-panel">
      <div className="ch-camp-head">
        <span className="ch-camp-title">
          {isComplete
            ? <>Campaign complete <span>· {legacyGames ? `${completed} games` : resultTally(log)}</span></>
            : completed === 0
              ? <>Campaign · Game 1 <span>of {total}</span></>
              : <>Before game {nextGame} <span>of {total}</span></>}
        </span>
        <Track log={log} completed={completed} total={total} />
      </div>

      {!isComplete && (ready ? (
        <div className="ch-camp-todo is-done"><span className="n" aria-hidden="true">✓</span>Company ready for game {nextGame}</div>
      ) : (
        <>
          {fallenSlots.length > 0 && (
            <button type="button" className="ch-camp-todo ch-camp-todo--recruit" onClick={() => scrollToSlot(`.warrior-slot[data-slot="${fallenSlots[0].index}"]`)}>
              <span className="n">{fallenSlots.length}</span>Replace the fallen<span className="go" aria-hidden="true">›</span>
            </button>
          )}
          {toSpend > 0 && (
            <button type="button" className="ch-camp-todo ch-camp-todo--spend" onClick={() => scrollToSlot(`.warrior-slot[data-slot="${spendSlots[0].i}"]`)}>
              <span className="n">{toSpend}</span>Spend new IP<span className="go" aria-hidden="true">›</span>
            </button>
          )}
        </>
      ))}

      <div className="ch-camp-actions">
        <button type="button" className="ch-camp-ghost ch-camp-log-btn" onClick={() => setLogOpen(true)}>Log</button>
        <button type="button" className="ch-campaign-eog-btn ch-camp-eog-btn" onClick={onEndOfGame} disabled={isComplete}
          title={isComplete ? 'The campaign is complete' : undefined}>
          {isComplete ? 'Complete' : `End game ${nextGame}`}
        </button>
        <button type="button" className="ch-camp-ghost ch-camp-gear" onClick={() => setSettingsOpen(true)}
          aria-label="Campaign settings" title="Campaign settings">
          <SvgGear />
        </button>
      </div>

      {logOpen && <ActivityLogView companyId={companyId} companyName={companyName} onClose={() => setLogOpen(false)} />}
      {settingsOpen && <CampaignSettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

