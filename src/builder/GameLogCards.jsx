import { useState } from 'react'
import { IconPencil } from './icons'
import { WARRIOR_IMAGES } from '../data/images'
import './styles/activity-log.css'
import { RESULT_LETTER, RESULT_NAME, AWARD_REASON, nameInRecord, fallenName, upgradesAfter, rosterLinesAfter } from './campaignUi'

// ── Campaign log, By game: one card per recorded game, then the fallen ────────
// Shown in the full-screen campaign log (ActivityLogView). onEditGame({ gameNumber, latest })
// opens one editor for the whole game (outcome and scenario name, see OutcomeEditor.jsx).
// readOnly (another member's company in a shared campaign): nothing editable.

const PREP_SHOWN = 4 // lines of a "Before game N" list before "+N more"

// "Upgrades before game 3" / "Starting company": "Name: Combat, Grappling Hook" per warrior.
// Recruits ("Recruited: Joss (Scout), starting IP 1") come first, then the upgrades.
// cap: show that many lines, the rest behind "+N more" (keeps cards in a row a similar height)
function UpgradeGroup({ title, groups, roster = [], cap = Infinity }) {
  const [open, setOpen] = useState(false)
  const lines = [
    ...roster.map((line, i) => <li key={`r${i}`} className="cmp-log-roster">{line}</li>),
    ...groups.map(g => <li key={g.uid}><span className="cmp-log-upgrades-name">{g.name}:</span> {g.labels.join(', ')}</li>),
  ]
  if (!lines.length) return null
  const hidden = open ? 0 : Math.max(0, lines.length - cap)
  return (
    <div className="cmp-log-upgrades">
      <div className="cmp-log-upgrades-title">{title}</div>
      <ul>{hidden ? lines.slice(0, cap) : lines}</ul>
      {lines.length > cap && (
        <button type="button" className="cmp-log-more" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? 'Show less' : `+${lines.length - cap} more`}
        </button>
      )}
    </div>
  )
}

export default function GameLogCards({ log, legacyGames, campaign, onEditGame, readOnly = false }) {
  const fallenRoll = log.flatMap(r => (r.fallen || []).map(f => ({
    ...f, game: r.gameNumber, captain: !!r.roster?.find(x => x.uid === f.uid)?.wasCaptain,
  })))
  const starting = upgradesAfter(campaign, 0)
  const startingRoster = rosterLinesAfter(campaign, 0)
  const editable = !!onEditGame && !readOnly
  return (
    <>
      {legacyGames > 0 && (
        <p className="eog-help">{legacyGames === 1 ? 'Game 1 was' : `Games 1 to ${legacyGames} were`} played before the log was kept.</p>
      )}
      {log.length === 0 && legacyGames === 0 && <p className="eog-help">{readOnly ? 'No games recorded yet.' : 'No games recorded yet. Use End of game after each game.'}</p>}
      {(starting.length > 0 || startingRoster.length > 0) && (
        <div className="cmp-log-game cmp-log-start">
          <UpgradeGroup title="Starting company" groups={starting} roster={startingRoster} />
        </div>
      )}
      <ol className="cmp-log">
        {log.map(r => {
          const awards = (r.awards || []).map(a => `${nameInRecord(r, a.uid)} +${a.ip} (${AWARD_REASON[a.reason] || a.reason})`)
          const cc = r.captainChange
          const roster = rosterLinesAfter(campaign, r.gameNumber)
          return (
            <li key={r.id || r.gameNumber} className="cmp-log-game" data-game={r.gameNumber} data-result={r.result}>
              <div className="cmp-log-head">
                <span className={`cmp-pip is-${r.result}`} aria-hidden="true">{RESULT_LETTER[r.result]}</span>
                <span className="cmp-log-title">Game {r.gameNumber} · {RESULT_NAME[r.result]}</span>
                {editable && (
                  <button type="button" className="cmp-log-edit" aria-label={`Edit game ${r.gameNumber}`}
                    onClick={() => onEditGame({ gameNumber: r.gameNumber, latest: r === log.at(-1) && !!r.before })}>
                    <IconPencil /><span aria-hidden="true">Edit</span>
                  </button>
                )}
              </div>
              {r.scenario
                ? <div className="cmp-log-scenario">{r.scenario}</div>
                : !readOnly && <div className="cmp-log-scenario is-empty">No scenario name</div>}
              <dl className="cmp-log-facts">
                <div><dt>Fell</dt><dd>{r.fallen?.length ? r.fallen.map(fallenName).join(', ') : 'No one'}</dd></div>
                <div><dt>IP</dt><dd>{awards.length ? awards.join(', ') : r.result === 'retreat' ? 'None (retreated)' : 'None'}</dd></div>
                {cc && (
                  <div><dt>Captain</dt><dd>{cc.to
                    ? `${nameInRecord(r, cc.to)} took command from ${nameInRecord(r, cc.from)}`
                    : `${nameInRecord(r, cc.from)} fell with the whole company. A recruit leads next.`}</dd></div>
                )}
              </dl>
              <UpgradeGroup cap={PREP_SHOWN}
                title={roster.length ? `Before game ${r.gameNumber + 1}` : `Upgrades before game ${r.gameNumber + 1}`}
                groups={upgradesAfter(campaign, r.gameNumber)} roster={roster} />
            </li>
          )
        })}
      </ol>
      {fallenRoll.length > 0 && (
        <section className="cmp-fallen-roll" aria-labelledby="cmp-fallen-title">
          <h3 className="cmp-fallen-title" id="cmp-fallen-title">The fallen</h3>
          <ul className="cmp-fallen-grid">
            {fallenRoll.map(f => (
              <li key={`${f.uid}-${f.game}`} className="cmp-fallen-tile">
                <span className="cmp-fallen-portrait">
                  {WARRIOR_IMAGES[f.type] && <img src={WARRIOR_IMAGES[f.type]} alt="" />}
                  {f.captain && <span className="cmp-fallen-captain">Captain</span>}
                </span>
                <span className="cmp-fallen-name">{fallenName(f)}</span>
                <span className="cmp-fallen-meta">Fell in game {f.game} · {f.earnedIP || 0} IP</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
