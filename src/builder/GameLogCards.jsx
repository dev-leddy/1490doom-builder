import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import * as campaignRules from '../store/campaign'
import BottomSheet from '../shared/BottomSheet'
import { IconPencil } from './icons'
import { WARRIOR_IMAGES } from '../data/images'
import './styles/activity-log.css'
import { RESULT_LETTER, RESULT_NAME, AWARD_REASON, nameInRecord, fallenName, afterGameLines } from './campaignUi'

// ── Campaign log, By game: one card per recorded game, then the fallen ────────
// Shown in the full-screen campaign log (ActivityLogView). onEditGame({ gameNumber, latest })
// opens one editor for the whole game (outcome and scenario name, see OutcomeEditor.jsx).
// readOnly (another member's company in a shared campaign): nothing editable.
// onResurrect(fallen) opens ResurrectSheet for a fallen warrior's tile (the log holds it so
// Escape closes it first); a warrior who came back shows as Returned.

const PREP_SHOWN = 4 // lines of an "After the battle" list before "+N more"

// What happened between games, as sentences ("Scout joined the company.", "Brute improved
// Combat."). cap: show that many, the rest behind "+N more" (keeps cards in a row a similar height)
function AfterGame({ title, lines, cap = Infinity }) {
  const [open, setOpen] = useState(false)
  if (!lines.length) return null
  const shown = open ? lines : lines.slice(0, cap)
  return (
    <div className="cmp-log-upgrades">
      <div className="cmp-log-upgrades-title">{title}</div>
      <ul>{shown.map((l, i) => <li key={i}>{l}</li>)}</ul>
      {lines.length > cap && (
        <button type="button" className="cmp-log-more" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? 'Show less' : `+${lines.length - cap} more`}
        </button>
      )}
    </div>
  )
}

export default function GameLogCards({ log, legacyGames, campaign, onEditGame, onResurrect, readOnly = false }) {
  const fallenRoll = log.flatMap(r => (r.fallen || []).map(f => ({
    ...f, game: r.gameNumber, captain: !!r.roster?.find(x => x.uid === f.uid)?.wasCaptain, back: campaignRules.isResurrected(f),
  })))
  const starting = afterGameLines(campaign, 0)
  const editable = !!onEditGame && !readOnly
  return (
    <>
      {legacyGames > 0 && (
        <p className="eog-help">{legacyGames === 1 ? 'Game 1 was' : `Games 1 to ${legacyGames} were`} played before the log was kept.</p>
      )}
      {log.length === 0 && legacyGames === 0 && <p className="eog-help">{readOnly ? 'No games recorded yet.' : 'No games recorded yet. Use End of game after each game.'}</p>}
      {starting.length > 0 && (
        <div className="cmp-log-game cmp-log-start">
          <AfterGame title="Before the first game" lines={starting} />
        </div>
      )}
      <ol className="cmp-log">
        {log.map(r => {
          const awards = (r.awards || []).map(a => `${nameInRecord(r, a.uid)} +${a.ip} (${AWARD_REASON[a.reason] || a.reason})`)
          const cc = r.captainChange
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
              <AfterGame cap={PREP_SHOWN} title="After the battle" lines={afterGameLines(campaign, r.gameNumber)} />
            </li>
          )
        })}
      </ol>
      {fallenRoll.length > 0 && (
        <section className="cmp-fallen-roll" aria-labelledby="cmp-fallen-title">
          <h3 className="cmp-fallen-title" id="cmp-fallen-title">The fallen</h3>
          <ul className="cmp-fallen-grid">
            {fallenRoll.map(f => {
              const body = (
                <>
                  <span className="cmp-fallen-portrait">
                    {WARRIOR_IMAGES[f.type] && <img src={WARRIOR_IMAGES[f.type]} alt="" />}
                    {f.captain && !f.back && <span className="cmp-fallen-captain">Captain</span>}
                  </span>
                  <span className="cmp-fallen-name">{fallenName(f)}</span>
                  <span className="cmp-fallen-meta">Fell in game {f.game} · {f.earnedIP || 0} IP</span>
                  {f.back && <span className="cmp-fallen-back">Back in the company</span>}
                </>
              )
              const canTap = onResurrect && !readOnly && !f.back
              return (
                <li key={`${f.uid}-${f.game}`} className="cmp-fallen-item">
                  {canTap ? (
                    <button type="button" className="cmp-fallen-tile is-tappable" onClick={() => onResurrect(f)}
                      aria-label={`${fallenName(f)}, fell in game ${f.game}. Resurrect`}>
                      {body}
                    </button>
                  ) : (
                    <div className={`cmp-fallen-tile${f.back ? ' is-back' : ''}`}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}

// Bring a fallen warrior back: who, the IP they come back with, where to, and why not (if
// the engine says no). Upgrades and gear aren't restored.
const MAX_RES_IP = 99
export function ResurrectSheet({ fallen, onClose, onDone, zIndex = 1200 }) {
  const store = useBuilderStore()
  const company = { companyMode: store.companyMode, slots: store.slots, campaignGame: store.campaignGame, campaign: store.campaign }
  const ref = { gameNumber: fallen.game, uid: fallen.uid }
  const oldIP = fallen.earnedIP || 0
  // resurrectDefaults is newer than this sheet in some builds; fall back to their old IP
  const [ip, setIp] = useState(() => {
    try { return campaignRules.resurrectDefaults?.(company, ref)?.ip ?? oldIP } catch { return oldIP }
  })
  let preview = null
  let reason = null
  try { preview = campaignRules.resurrectWarrior(company, ref, { ip }) } catch (err) { reason = err.message }
  const name = fallenName(fallen)
  const ownSlot = store.slots.some(s => !s.type && s.fallen?.uid === fallen.uid)
  const where = !preview ? null : ownSlot ? 'their old slot' : `slot ${preview.slotIndex + 1}`

  function resurrect() {
    if (store.resurrectWarrior(fallen.game, fallen.uid, { ip })) { onDone?.(); onClose() }
  }
  return (
    <BottomSheet title="RESURRECT" onClose={onClose} zIndex={zIndex} className="res-sheet"
      footer={<>
        <button type="button" className="co-sheet-randomize" onClick={onClose}>Cancel</button>
        <button type="button" className="co-sheet-done" disabled={!!reason} onClick={resurrect}>Resurrect</button>
      </>}>
      <div className="res-who">
        <span className="res-portrait">{WARRIOR_IMAGES[fallen.type] && <img src={WARRIOR_IMAGES[fallen.type]} alt="" />}</span>
        <div>
          <p className="res-q">Resurrect {name}?</p>
          <p className="res-meta">Fell in game {fallen.game}</p>
        </div>
      </div>
      {reason ? (
        <p className="eog-error" role="alert">{reason}</p>
      ) : (
        <>
          <div className="res-ip">
            <div className="res-ip-text">
              <span className="res-ip-label" id={`res-ip-${fallen.uid}`}>Comes back with</span>
              <span className="res-ip-hint">They had {oldIP} IP when they fell.</span>
            </div>
            <span className="led-stepper" role="group" aria-labelledby={`res-ip-${fallen.uid}`}>
              <button type="button" className="alv-btn led-step" aria-label="Less IP" disabled={ip <= 0}
                onClick={() => setIp(v => Math.max(0, v - 1))}>−</button>
              <span className="led-step-val res-ip-val" aria-live="polite">{ip} <small>IP</small></span>
              <button type="button" className="alv-btn led-step" aria-label="More IP" disabled={ip >= MAX_RES_IP}
                onClick={() => setIp(v => Math.min(MAX_RES_IP, v + 1))}>+</button>
            </span>
          </div>
          <p className="eog-help">
            They return as a {fallen.type} with their name and {ip} IP to spend, into {where}. Upgrades and gear aren&apos;t restored. They won&apos;t be Captain.
          </p>
          <p className="eog-perm">This is noted in the campaign log.</p>
        </>
      )}
    </BottomSheet>
  )
}
