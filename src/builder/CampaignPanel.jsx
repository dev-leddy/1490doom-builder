import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress, vacancies } from '../store/campaign'
import BottomSheet from '../shared/BottomSheet'
import CampaignSettingsSheet from './CampaignSettingsSheet'
import { SvgGear, IconList } from './icons'
import ActivityLogView from './ActivityLogView'
import { RESULT_LETTER, RESULT_NAME, AWARD_REASON, spendableNow, resultTally, nameInRecord, fallenName, upgradesAfter, rosterLinesAfter } from './campaignUi'

// ── Campaign panel in the company header ──────────────────────────────────────
// "Before game N of 6" with the six-game track, what to do before the next game,
// and Log / End of game / the gear for campaign settings (undo, names, IP, export, end early).
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

// "Upgrades before game 3" / "Starting company": "Name: Combat, Grappling Hook" per warrior
// Recruits ("Recruited: Joss (Scout), starting IP 1") come first, then the upgrades
function UpgradeGroup({ title, groups, roster = [] }) {
  if (!groups.length && !roster.length) return null
  return (
    <div className="cmp-log-upgrades">
      <div className="cmp-log-upgrades-title">{title}</div>
      <ul>
        {roster.map((line, i) => <li key={`r${i}`} className="cmp-log-roster">{line}</li>)}
        {groups.map(g => <li key={g.uid}><span className="cmp-log-upgrades-name">{g.name}:</span> {g.labels.join(', ')}</li>)}
      </ul>
    </div>
  )
}

// Game log: one card per recorded game, and a way into the full log (every change, as a table)
function GameLogSheet({ onFullLog, onClose, ...games }) {
  return (
    <BottomSheet title="GAME LOG" onClose={onClose} className="cmp-log-sheet"
      footer={<button className="co-sheet-done" onClick={onClose}>Done</button>}>
      <div className="cmp-set-list cmp-log-full">
        <button type="button" className="cmp-set-row" onClick={onFullLog}>
          <span className="cmp-set-icon"><IconList /></span>
          <span className="cmp-set-text">
            <span className="cmp-set-label">Full log</span>
            <span className="cmp-set-sub">Every change, with times. Filter by game, warrior or type.</span>
          </span>
          <span className="cmp-set-go" aria-hidden="true">›</span>
        </button>
      </div>
      <GameLogBody {...games} />
    </BottomSheet>
  )
}

function GameLogBody({ log, legacyGames, campaign }) {
  const fallenRoll = log.flatMap(r => (r.fallen || []).map(f => ({ ...f, game: r.gameNumber })))
  const starting = upgradesAfter(campaign, 0)
  const startingRoster = rosterLinesAfter(campaign, 0)
  return (
    <>
      {legacyGames > 0 && (
        <p className="eog-help">{legacyGames === 1 ? 'Game 1 was' : `Games 1 to ${legacyGames} were`} played before the log was kept.</p>
      )}
      {log.length === 0 && legacyGames === 0 && <p className="eog-help">No games recorded yet. Use End of game after each game.</p>}
      {(starting.length > 0 || startingRoster.length > 0) && (
        <div className="cmp-log-game cmp-log-start">
          <UpgradeGroup title="Starting company" groups={starting} roster={startingRoster} />
        </div>
      )}
      <ol className="cmp-log">
        {log.map(r => {
          const awards = (r.awards || []).map(a => `${nameInRecord(r, a.uid)} +${a.ip} (${AWARD_REASON[a.reason] || a.reason})`)
          const cc = r.captainChange
          return (
            <li key={r.id || r.gameNumber} className="cmp-log-game" data-game={r.gameNumber}>
              <div className="cmp-log-head">
                <span className={`cmp-pip is-${r.result}`} aria-hidden="true">{RESULT_LETTER[r.result]}</span>
                <span className="cmp-log-title">Game {r.gameNumber} · {RESULT_NAME[r.result]}</span>
              </div>
              {r.scenario && <div className="cmp-log-scenario">{r.scenario}</div>}
              <dl className="cmp-log-facts">
                <div><dt>Fell</dt><dd>{r.fallen?.length ? r.fallen.map(fallenName).join(', ') : 'No one'}</dd></div>
                <div><dt>IP</dt><dd>{awards.length ? awards.join(', ') : r.result === 'retreat' ? 'None (retreated)' : 'None'}</dd></div>
                {cc && (
                  <div><dt>Captain</dt><dd>{cc.to
                    ? `${nameInRecord(r, cc.to)} took command from ${nameInRecord(r, cc.from)}`
                    : `${nameInRecord(r, cc.from)} fell with the whole company. A recruit leads next.`}</dd></div>
                )}
              </dl>
              {(() => {
                const roster = rosterLinesAfter(campaign, r.gameNumber)
                return (
                  <UpgradeGroup
                    title={roster.length ? `Before game ${r.gameNumber + 1}` : `Upgrades before game ${r.gameNumber + 1}`}
                    groups={upgradesAfter(campaign, r.gameNumber)} roster={roster} />
                )
              })()}
            </li>
          )
        })}
      </ol>
      {fallenRoll.length > 0 && (
        <section className="cmp-fallen-roll">
          <h3 className="cmp-fallen-title">The fallen</h3>
          <ul>
            {fallenRoll.map(f => (
              <li key={`${f.uid}-${f.game}`}><span>{fallenName(f)}</span><span>Game {f.game} · {f.earnedIP || 0} IP</span></li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

export default function CampaignPanel({ onEndOfGame }) {
  const { slots, companyMode, campaignGame, campaign, companyId, companyName } = useBuilderStore()
  const [logOpen, setLogOpen] = useState(null) // null | 'games' (cards sheet) | 'full' (full-screen table)
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
        <button type="button" className="ch-camp-ghost ch-camp-log-btn" onClick={() => setLogOpen('games')}>Log</button>
        <button type="button" className="ch-campaign-eog-btn ch-camp-eog-btn" onClick={onEndOfGame} disabled={isComplete}
          title={isComplete ? 'The campaign is complete' : undefined}>
          {isComplete ? 'Complete' : `End game ${nextGame}`}
        </button>
        <button type="button" className="ch-camp-ghost ch-camp-gear" onClick={() => setSettingsOpen(true)}
          aria-label="Campaign settings" title="Campaign settings">
          <SvgGear />
        </button>
      </div>

      {logOpen === 'games' && (
        <GameLogSheet onFullLog={() => setLogOpen('full')} onClose={() => setLogOpen(null)}
          log={log} legacyGames={legacyGames} campaign={campaign} />
      )}
      {logOpen === 'full' && <ActivityLogView companyId={companyId} companyName={companyName} onClose={() => setLogOpen(null)} />}
      {settingsOpen && (
        <CampaignSettingsSheet onClose={() => setSettingsOpen(false)}
          onOpenLog={() => { setSettingsOpen(false); setLogOpen('full') }} />
      )}
    </div>
  )
}

