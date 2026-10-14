import { RESULT_LETTER, RESULT_NAME, AWARD_REASON, nameInRecord, fallenName, upgradesAfter, rosterLinesAfter } from './campaignUi'

// ── Campaign log, By game: one card per recorded game, then the fallen ────────
// Shown in the full-screen campaign log (ActivityLogView).

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

export default function GameLogCards({ log, legacyGames, campaign }) {
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
