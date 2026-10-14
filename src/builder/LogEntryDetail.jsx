import { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { minEarnedIP, nameWithClass, lastUpgrade } from '../store/campaign'
import { rowActions, MAX_NOTE_LENGTH } from '../store/campaignEvents'
import { STAT_IMPROVEMENT } from '../data/warriors'
import { undoGameRules } from './campaignUi'
import { eventTime } from './activityLog'

// ── One campaign log entry, opened from the full-screen log ───────────────────
// The full entry, its note (add, change, remove) and what can still be done about it:
// rename the game, undo the game / upgrade / recruit, fix the IP of the warriors it names.
// Every change goes through the store, which logs it. Confirms are lifted to the parent
// (ActivityLogView) so Escape can close them first.

export function confirmFor(kind, { company, row, onDone }) {
  const s = useBuilderStore.getState()
  const slots = company.slots
  if (kind.type === 'game') {
    const last = company.campaign?.log?.at(-1)
    return {
      title: `UNDO GAME ${last.gameNumber}?`,
      subtitle: `The company goes back to how it was before game ${last.gameNumber} was recorded.`,
      rules: undoGameRules(last),
      confirmLabel: `Undo game ${last.gameNumber}`,
      onConfirm: () => { s.undoLastCampaignGame(); onDone() },
    }
  }
  if (kind.type === 'upgrade') {
    const slot = slots[kind.slotIndex]
    const up = lastUpgrade(slot)
    const label = up?.kind === 'stat' ? (STAT_IMPROVEMENT[up.stat] || up.stat || 'stat').replace(/ \+1$/, '') : (up?.item || row.e.payload?.label || 'upgrade')
    return {
      title: `UNDO ${label.toUpperCase()}?`,
      subtitle: `Takes the ${label} off ${nameWithClass(slot)} and gives back its 1 IP. Campaign upgrades are permanent, so only undo a mistake.`,
      confirmLabel: 'Undo upgrade',
      onConfirm: () => { s.undoLastUpgrade(kind.slotIndex); onDone() },
    }
  }
  const slot = slots[kind.slotIndex]
  return {
    title: 'UNDO RECRUIT?',
    subtitle: `Remove ${nameWithClass(slot)}? They go back to an empty slot. This is noted in the campaign log.`,
    confirmLabel: 'Undo recruit',
    onConfirm: () => { s.undoRecruit(kind.slotIndex); onDone() },
  }
}

export default function LogEntryDetail({ row, onAsk, onChanged, headingRef }) {
  const { slots, companyMode, campaignGame, campaign, noteLogEntry, setGameScenario, setEarnedIP } = useBuilderStore()
  const company = { slots, companyMode, campaignGame, campaign }
  const e = row.e
  const actions = rowActions(company, e)

  const [note, setNote] = useState(row.note || '')
  const [scenario, setScenario] = useState('')
  const record = actions.renameGame ? (campaign?.log || []).find(r => r.gameNumber === actions.renameGame) : null
  useEffect(() => { setNote(row.note || '') }, [e.id, row.note])
  useEffect(() => { setScenario(record?.scenario || '') }, [e.id, record?.scenario])

  // IP steppers: refresh the log a moment after the last tap, not on every tap
  const ipTimer = useRef(null)
  useEffect(() => () => clearTimeout(ipTimer.current), [])
  const bumpIP = (i, ip) => {
    setEarnedIP(i, ip)
    clearTimeout(ipTimer.current)
    ipTimer.current = setTimeout(onChanged, 1200)
  }

  const saveNote = text => { if (noteLogEntry(e.id, text, { afterGame: e.afterGame })) onChanged() }
  const noteChanged = note.trim() !== (row.note || '')
  const scenarioChanged = record && scenario.trim() !== (record.scenario || '')
  const hasActions = actions.undoGame || actions.undoUpgrade || actions.undoRecruit || actions.renameGame || actions.fixIP.length

  return (
    <div className="led">
      <div className="led-head">
        <span className="alv-tag" data-kind={row.kind}>{row.tag}</span>
        <h3 className="led-title" ref={headingRef} tabIndex={-1}>{row.text}</h3>
        {row.undone && <span className="alv-flag">Undone</span>}
        {row.rejected && <span className="alv-flag alv-flag--warn">Not saved</span>}
      </div>
      {(row.rejected || row.sub) && (
        <p className="led-details">{row.rejected ? 'Replaced by changes from another device, so it never happened.' : row.sub}</p>
      )}
      <dl className="led-facts">
        <div><dt>When</dt><dd>{eventTime(row.at)}</dd></div>
        <div><dt>Game</dt><dd>{row.game.label}</dd></div>
        {row.warriors.length > 0 && <div><dt>Warrior</dt><dd>{row.warriors.map(w => w.name).join(', ')}</dd></div>}
      </dl>

      <section className="led-section">
        <label className="led-label" htmlFor={`led-note-${e.id}`}>Note</label>
        <textarea id={`led-note-${e.id}`} className="led-note-input" rows={3} maxLength={MAX_NOTE_LENGTH} value={note}
          placeholder="Add a note to this entry" onChange={ev => setNote(ev.target.value)} />
        <div className="led-row">
          <span className="led-count">{note.length} / {MAX_NOTE_LENGTH}</span>
          {row.note && <button type="button" className="alv-link" onClick={() => saveNote('')}>Remove note</button>}
          <button type="button" className="alv-btn led-primary" disabled={!noteChanged || !note.trim()} onClick={() => saveNote(note)}>Save note</button>
        </div>
      </section>

      {hasActions ? (
        <section className="led-section">
          <h4 className="led-label">Change it</h4>
          {record && (
            <div className="led-rename">
              <label className="led-sublabel" htmlFor={`led-scn-${e.id}`}>Game {record.gameNumber} scenario</label>
              <div className="led-row led-row--input">
                <input id={`led-scn-${e.id}`} className="alv-search" type="text" maxLength={80} autoComplete="off"
                  placeholder="Name of the scenario" value={scenario} onChange={ev => setScenario(ev.target.value)} />
                <button type="button" className="alv-btn" disabled={!scenarioChanged}
                  onClick={() => { if (setGameScenario(record.gameNumber, scenario.trim())) onChanged() }}>Rename</button>
              </div>
            </div>
          )}
          {actions.fixIP.length > 0 && (
            <div className="led-ip">
              <span className="led-sublabel">Fix IP</span>
              {actions.fixIP.map(i => {
                const s = slots[i]
                const earned = s.earnedIP || 0
                const label = nameWithClass(s)
                return (
                  <div key={s.uid || i} className="led-ip-row">
                    <span className="led-ip-name">{label}<small>{s.ip?.length || 0} spent</small></span>
                    <span className="led-stepper">
                      <button type="button" className="alv-btn led-step" onClick={() => bumpIP(i, earned - 1)}
                        disabled={earned <= minEarnedIP(s)} aria-label={`Less IP for ${label}`}>−</button>
                      <span className="led-step-val" aria-live="polite">{earned}</span>
                      <button type="button" className="alv-btn led-step" onClick={() => bumpIP(i, earned + 1)}
                        aria-label={`More IP for ${label}`}>+</button>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="led-undos">
            {actions.undoGame && (
              <button type="button" className="alv-btn led-danger" onClick={() => onAsk({ type: 'game' })}>
                Undo game {e.payload?.gameNumber}
              </button>
            )}
            {actions.undoUpgrade && (
              <button type="button" className="alv-btn led-danger" onClick={() => onAsk({ type: 'upgrade', slotIndex: actions.undoUpgrade.slotIndex })}>
                Undo this upgrade
              </button>
            )}
            {actions.undoRecruit && (
              <button type="button" className="alv-btn led-danger" onClick={() => onAsk({ type: 'recruit', slotIndex: actions.undoRecruit.slotIndex })}>
                Undo this recruit
              </button>
            )}
          </div>
        </section>
      ) : (
        <p className="led-none">Nothing on this entry can be changed now. You can still add a note.</p>
      )}
    </div>
  )
}
