import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress, canUndoLastGame, vacancies } from '../store/campaign'
import BottomSheet from '../shared/BottomSheet'
import ConfirmModal from '../shared/ConfirmModal'
import { RESULT_LETTER, RESULT_NAME, AWARD_REASON, spendableNow, resultTally, nameInRecord } from './campaignUi'

// ── Campaign panel in the company header ──────────────────────────────────────
// "Before game N of 6" with the six-game track, what to do before the next game,
// and Game log / Undo game / End of game. After the last game: "Campaign complete".

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

function GameLogSheet({ log, legacyGames, onClose }) {
  const fallenRoll = log.flatMap(r => (r.fallen || []).map(f => ({ ...f, game: r.gameNumber })))
  return (
    <BottomSheet title="GAME LOG" onClose={onClose} className="cmp-log-sheet"
      footer={<button className="co-sheet-done" onClick={onClose}>Done</button>}>
      {legacyGames > 0 && (
        <p className="eog-help">{legacyGames === 1 ? 'Game 1 was' : `Games 1 to ${legacyGames} were`} played before the log was kept.</p>
      )}
      {log.length === 0 && legacyGames === 0 && <p className="eog-help">No games recorded yet. Use End of game after each game.</p>}
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
                <div><dt>Fell</dt><dd>{r.fallen?.length ? r.fallen.map(f => f.name).join(', ') : 'No one'}</dd></div>
                <div><dt>IP</dt><dd>{awards.length ? awards.join(', ') : r.result === 'retreat' ? 'None (retreated)' : 'None'}</dd></div>
                {cc && (
                  <div><dt>Captain</dt><dd>{cc.to
                    ? `${nameInRecord(r, cc.to)} took command from ${nameInRecord(r, cc.from)}`
                    : `${nameInRecord(r, cc.from)} fell with the whole company. A recruit leads next.`}</dd></div>
                )}
              </dl>
            </li>
          )
        })}
      </ol>
      {fallenRoll.length > 0 && (
        <section className="cmp-fallen-roll">
          <h3 className="cmp-fallen-title">The fallen</h3>
          <ul>
            {fallenRoll.map(f => (
              <li key={`${f.uid}-${f.game}`}><span>{f.name}{f.name !== f.type ? ` (${f.type})` : ''}</span><span>Game {f.game} · {f.earnedIP || 0} IP</span></li>
            ))}
          </ul>
        </section>
      )}
    </BottomSheet>
  )
}

export default function CampaignPanel({ onEndOfGame }) {
  const { slots, companyMode, campaignGame, campaign, undoLastCampaignGame } = useBuilderStore()
  const [logOpen, setLogOpen] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)

  const company = { companyMode, slots, campaignGame, campaign }
  const { completed, total, isComplete, nextGame } = campaignProgress(company)
  const log = campaign?.log || []
  const legacyGames = Math.max(0, completed - log.length)
  const last = log.at(-1)
  const canUndo = canUndoLastGame(company)

  const fallenSlots = vacancies(company).filter(v => v.fallen || v.captainPlaceholder)
  const spendSlots = slots.map((s, i) => ({ i, n: spendableNow(s) })).filter(x => x.n > 0)
  const toSpend = spendSlots.reduce((n, x) => n + x.n, 0)
  const ready = fallenSlots.length === 0 && toSpend === 0

  // What an undo takes back, in plain words
  const undoRules = last ? [
    { label: 'Result', text: `Game ${last.gameNumber} (${RESULT_NAME[last.result]}) comes off the log.` },
    ...(last.awards?.length ? [{ label: 'IP', text: `${last.awards.map(a => `${nameInRecord(last, a.uid)} +${a.ip}`).join(', ')} taken back.` }] : []),
    ...(last.fallen?.length ? [{ label: 'The fallen', text: `${last.fallen.map(f => f.name).join(', ')} return to the company.` }] : []),
    ...(last.captainChange ? [{ label: 'Captain', text: `${nameInRecord(last, last.captainChange.from)} leads again.` }] : []),
    { label: 'Since then', text: `Recruits hired and upgrades bought after game ${last.gameNumber} are lost too.`, limit: true },
  ] : []

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
        <button type="button" className="ch-camp-ghost ch-camp-log-btn" onClick={() => setLogOpen(true)}>Game log</button>
        {canUndo && (
          <button type="button" className="ch-camp-ghost ch-camp-undo-btn" onClick={() => setConfirmUndo(true)}>Undo game {last.gameNumber}</button>
        )}
        <button type="button" className="ch-campaign-eog-btn ch-camp-eog-btn" onClick={onEndOfGame} disabled={isComplete}
          title={isComplete ? 'The campaign is complete' : undefined}>
          {isComplete ? 'Complete' : `End game ${nextGame}`}
        </button>
      </div>

      {logOpen && <GameLogSheet log={log} legacyGames={legacyGames} onClose={() => setLogOpen(false)} />}
      {confirmUndo && last && (
        <ConfirmModal
          title={`UNDO GAME ${last.gameNumber}?`}
          subtitle={`The company goes back to how it was before game ${last.gameNumber} was recorded.`}
          rules={undoRules}
          confirmLabel={`Undo game ${last.gameNumber}`}
          onConfirm={() => { undoLastCampaignGame(); setConfirmUndo(false) }}
          onCancel={() => setConfirmUndo(false)}
        />
      )}
    </div>
  )
}

