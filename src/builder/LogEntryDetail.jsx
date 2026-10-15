import { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { minEarnedIP, nameWithClass, lastUpgrade } from '../store/campaign'
import { IconPencil } from './icons'
import { rowActions, MAX_NOTE_LENGTH } from '../store/campaignEvents'
import { STAT_IMPROVEMENT } from '../data/warriors'
import { undoGameRules } from './campaignUi'
import { eventTime } from './activityLog'

// ── One campaign log entry, opened from the full-screen log ───────────────────
// The full entry, its note (add, change, remove) and what can still be done about it:
// edit the game (one editor for outcome and scenario name), undo the game / upgrade /
// recruit, fix the IP of the warriors it names.
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

export default function LogEntryDetail({ row, onAsk, onChanged, onEditGame, headingRef }) {
  const { slots, companyMode, campaignGame, campaign, noteLogEntry, setEarnedIP } = useBuilderStore()
  const company = { slots, companyMode, campaignGame, campaign }
  const e = row.e
  const actions = rowActions(company, e)

  const [note, setNote] = useState(row.note || '')
  useEffect(() => { setNote(row.note || '') }, [e.id, row.note])

  // The game this entry is about, if it can still be edited (a record, or a rename of one)
  const log = campaign?.log || []
  const gameNo = actions.editOutcome?.gameNumber ?? actions.renameGame
  const record = gameNo != null ? log.find(r => r.gameNumber === gameNo) : null
  const editGame = record ? (actions.editOutcome || { gameNumber: gameNo, latest: record === log.at(-1) && !!record.before }) : null

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
  const hasActions = actions.undoGame || actions.undoUpgrade || actions.undoRecruit || actions.fixIP.length

  return (
    <div className="led">
      <div className="led-head">
        <span className="alv-tag" data-kind={row.kind} data-result={row.result || undefined}>{row.tag}</span>
        <h3 className="led-title" ref={headingRef} tabIndex={-1}>{row.text}</h3>
        {row.undone && <span className="alv-flag">Undone</span>}
        {row.edited && <span className="alv-flag alv-flag--edited">Edited</span>}
        {row.rejected && <span className="alv-flag alv-flag--warn">Not saved</span>}
        {editGame && (
          <button type="button" className="cmp-log-edit led-edit" aria-label={`Edit game ${editGame.gameNumber}`}
            onClick={() => onEditGame?.(editGame)}>
            <IconPencil /><span aria-hidden="true">Edit game</span>
          </button>
        )}
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
        !editGame && <p className="led-none">Nothing on this entry can be changed now. You can still add a note.</p>
      )}
    </div>
  )
}
