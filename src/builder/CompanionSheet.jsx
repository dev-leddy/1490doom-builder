import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import CompanionPortrait from './CompanionPortrait'
import { useBuilderStore } from '../store/builderStore'
import { COMPANIONS, COMPANION_NAME_MAX, companionBonusSkill } from '../data/companions'
import { getEffectiveStats, statTone, STAT_KEYS } from '../utils/stats'

// The animal's skills, in the same blocks as a warrior's build-mode abilities: its bonus
// to its owner, its static ability, then its once-per-game ability
export function CompanionAbilities({ animal, ownerType, className = '' }) {
  const c = COMPANIONS[animal]
  const bonus = companionBonusSkill(animal, ownerType)
  const list = [bonus, c.passive, { name: c.ability.name.split('·').pop().trim(), desc: c.ability.desc }].filter(Boolean)
  return (
    <div className={`bd-abilities ${className}`}>
      {list.map(a => (
        <div key={a.name} className="bd-ability">
          <span className="bd-ability-name">{a.name}</span>
          <div className="bd-ability-desc">{a.desc}</div>
        </div>
      ))}
    </div>
  )
}

// The animal's stats: the owner's (bonus and improvements included), except its own VITALITY
export function CompanionStats({ slot, vit }) {
  const stats = getEffectiveStats(slot)
  const toneClass = { improved: 'modified', debuffed: 'debuffed' }
  return (
    <span className="stats-row eq-companion-stats">
      {STAT_KEYS.map(s => (
        <span key={s} className="stat-box">
          <span className="stat-label">{s}</span>
          <span className={`stat-val ${s === 'VIT' ? '' : toneClass[statTone(stats[s])] || ''}`}>{s === 'VIT' ? vit : stats[s].display}</span>
        </span>
      ))}
    </span>
  )
}

// Choose (and name) the animal, the same way as the Company Mark: a grid of animals,
// the picked one's rules pinned at the bottom, Cancel / Done. Nothing changes until Done.
// Each animal keeps its own name, so names typed while browsing are all kept on Done.
export default function CompanionSheet({ slotIndex, slot, wdata, onClose }) {
  const options = wdata.companion.options
  const [picked, setPicked] = useState(slot.companion)
  const [names, setNames] = useState(() => Object.fromEntries(options.map(n => [n, slot.companionNames?.[n] || ''])))
  const [editing, setEditing] = useState(null) // the name being typed, or null
  const shownName = n => names[n].trim() || n
  const pick = n => { setEditing(null); setPicked(n) }
  const commitName = () => { if (editing !== null) setNames(prev => ({ ...prev, [picked]: editing })); setEditing(null) }

  const done = () => {
    const store = useBuilderStore.getState()
    const final = editing !== null ? { ...names, [picked]: editing } : names
    for (const n of options) {
      if (final[n].trim() !== (slot.companionNames?.[n] || '').trim()) store.setCompanionName(slotIndex, n, final[n])
    }
    if (picked !== slot.companion) store.setCompanion(slotIndex, picked)
    onClose()
  }

  return (
    <BottomSheet
      title={wdata.companion.label || 'COMPANION'}
      onClose={onClose}
      zIndex={1001}
      bodyClass="co-sheet-body--mark"
      className="companion-sheet"
      footer={
        <>
          <button className="co-sheet-randomize" onClick={onClose}>Cancel</button>
          <button className="co-sheet-done" onClick={done}>Done</button>
        </>
      }
    >
      <div className="mark-grid-scroll">
        <div className="mark-picker-grid companion-grid">
          {options.map(n => {
            const resting = slot.restingCompanion === n
            return (
              <button
                key={n}
                type="button"
                className={`mark-option-btn companion-pick${picked === n ? ' selected' : ''}${resting ? ' is-resting' : ''}`}
                disabled={resting}
                aria-pressed={picked === n}
                onClick={() => pick(n)}
              >
                <CompanionPortrait name={n} className="companion-option-portrait" />
                <div className="mark-option-label">{n}</div>
                {resting && <div className="companion-option-sub">Resting</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* The picked animal: its name (editable) and rules, just above Cancel / Done */}
      <div className="mark-sheet-desc companion-sheet-desc">
        {/* Its name, with a little pencil to rename it in place (Enter or leaving the field
            keeps it, Escape cancels; saved with Done) */}
        <div className="companion-sheet-head">
          {editing !== null ? (
            <input
              className="companion-name-input"
              value={editing}
              autoFocus
              maxLength={COMPANION_NAME_MAX}
              placeholder={picked}
              aria-label={`Name your ${picked}`}
              onFocus={e => e.target.select()}
              onChange={e => setEditing(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitName() }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing(null) }
              }}
            />
          ) : (
            <>
              <span className="companion-sheet-name">{shownName(picked)}</span>
              <button type="button" className="companion-rename" onClick={() => setEditing(names[picked])} aria-label={`Rename ${shownName(picked)}`} title="Rename">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </>
          )}
          {shownName(picked) !== picked && editing === null && <span className="eq-companion-kind">{picked}</span>}
        </div>
        {/* Every animal's stats and skills share one cell, only the picked one visible, so the
            sheet keeps the tallest one's height and never resizes while choosing */}
        <div className="companion-sheet-stack">
          {options.map(n => (
            <div key={n} className={`companion-sheet-card${n === picked ? ' is-picked' : ''}`} aria-hidden={n !== picked}>
              <CompanionStats slot={{ ...slot, companion: n }} vit={wdata.companion.vit} />
              <CompanionAbilities animal={n} ownerType={slot.type} className="companion-sheet-abilities" />
            </div>
          ))}
        </div>
        {slot.restingCompanion && (
          <div className="companion-sheet-resting">{shownName(slot.restingCompanion)} died last game · sits this one out</div>
        )}
      </div>
    </BottomSheet>
  )
}
