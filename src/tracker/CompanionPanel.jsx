import { useTrackerStore, companionState } from '../store/trackerStore'
import { COMPANIONS, companionKey } from '../data/companions'
import { getEffectiveStats, statTone, STAT_KEYS } from '../utils/stats'
import { useState } from 'react'
import StatusBlock from './StatusBlock'
import BottomSheet from '../shared/BottomSheet'
import { ITEM_ICONS } from '../data/images'

// Statuses that stop the animal spending an action on its ability
const BLOCKING = ['STUNNED']

const STATE_LABEL = { slain: 'SLAIN', removed: 'REMOVED' }
const stateNote = (state, owner) => state === 'slain' ? `Slain · ${owner} loses its bonus` : `Removed · ${owner} is down`

// The owner's animal: a separate model with its own vitality, statuses and once-per-game
// ability, laid out like a compact warrior card right under its owner's vitality track.
// It activates with its owner (no Activated button of its own).
export default function CompanionPanel({ wi, warrior: w }) {
  const { hitCompanion, openCompanionStatus, removeCompanionStatus, toggleOPG, openCompanionLoot, warriors } = useTrackerStore()
  const [heldItem, setHeldItem] = useState(null)
  const c = w.companion
  const def = COMPANIONS[c?.name]
  if (!def) return null

  const state = companionState(w)
  const key = companionKey(c.name)
  const used = !!w.opgUsed[key]
  const blocker = state !== 'alive' ? STATE_LABEL[state] : BLOCKING.find(n => c.statuses.some(s => s.name === n))
  const canTap = !used && !blocker
  const abilityName = def.ability.name.split('·').pop().trim()
  // The owner's stats (its bonus and bought improvements included), changed only by the
  // animal's own statuses; VITALITY is its own track
  const stats = getEffectiveStats({ ...w, companion: c }, { statuses: c.statuses, companionAlive: true })

  return (
    <section className={`tk-companion tk-companion--${state}`} aria-label={`Companion: ${c.name}`}>
      <div className="tk-companion-header">
        <div className="tk-companion-title">
          {/* Mirrors the warrior header above: name, then what it is underneath */}
          <span className="tk-companion-line">
            <span className="tk-companion-name">{c.name}</span>
            {state !== 'alive' && <span className="tk-companion-state">{STATE_LABEL[state]}</span>}
          </span>
          <span className="tk-companion-kicker">Companion</span>
          {state !== 'alive' && <span className="tk-companion-note">{stateNote(state, w.customName || w.type)}</span>}
        </div>
        <div className="tk-hdr-btn-group">
          {def.holdsItems && (
            <button className="tk-hdr-btn tk-hdr-btn-cache" onClick={() => openCompanionLoot(wi)} disabled={state !== 'alive'} aria-label={`Add cache item to ${c.name}`}>+ CACHE</button>
          )}
          <button className="tk-hdr-btn tk-hdr-btn-status" onClick={() => openCompanionStatus(wi)} aria-label={`Add status to ${c.name}`}>+ STATUS</button>
        </div>
      </div>

      {/* Statuses up top, like its owner's */}
      {c.statuses.length > 0 && (
        <div className="tk-companion-statuses">
          <StatusBlock statuses={c.statuses} onClear={id => removeCompanionStatus(wi, id)} dead={state === 'slain'} />
        </div>
      )}

      {stats && (
        <div className="tk-stats-strip tk-companion-stats">
          {STAT_KEYS.map(s => {
            const toneClass = s === 'VIT' ? '' : { improved: 'tk-stat-improved', debuffed: 'tk-stat-debuffed' }[statTone(stats[s])] || ''
            return (
              <div key={s} className={`tk-stat ${toneClass}`}>
                <span className="tk-stat-lbl">{s}</span>
                <span className="tk-stat-val">{s === 'VIT' ? c.maxVit : stats[s].display}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="tk-vit-row tk-companion-vit">
        {Array.from({ length: c.maxVit }, (_, i) => (
          <button
            key={i}
            className={`tk-vit-box ${i >= c.currentVit ? 'lost' : ''}`}
            onClick={() => hitCompanion(wi, i)}
            aria-label={`${c.name} vitality ${i + 1}`}
          />
        ))}
        <span className="tk-vit-count">{c.currentVit}/{c.maxVit}</span>
      </div>

      {/* Static ability (the Raptor's FLIGHT): always on, like a warrior's passive abilities */}
      {def.passive && (
        <div className="tk-ability tk-companion-passive">
          <div className="tk-ability-header">
            <span className="tk-ability-name">{def.passive.name}</span>
          </div>
          <div className="tk-ability-desc">{def.passive.desc}</div>
        </div>
      )}

      <div
        className={`tk-ability tk-companion-ability${used ? ' tk-ability-used' : ''}${!used && blocker ? ' tk-ability-blocked' : ''}`}
        onClick={canTap || used ? () => toggleOPG(wi, key) : undefined}
        style={canTap || used ? { cursor: 'pointer' } : {}}
      >
        <div className="tk-ability-header">
          <span className="tk-ability-name">{abilityName}</span>
          <span className={`tk-opg-badge${used ? ' tk-opg-used' : blocker ? ' tk-opg-blocked' : ''}`}>
            {used ? '✓ USED' : blocker ? `UNAVAILABLE · ${blocker}` : 'ONCE PER GAME'}
          </span>
        </div>
        <div className="tk-ability-desc">{def.ability.desc}</div>
      </div>

      {/* What it holds (the Monkey). Animals can't EXPEND or HANDOFF: a warrior takes it from them */}
      {def.holdsItems && (c.cacheItems || []).length > 0 && (
        <div className="tk-companion-holds">
          <div className="tk-section-label">Holds</div>
          {c.cacheItems.map(item => (
            <button key={item.id} className="tk-companion-held" onClick={() => setHeldItem(item)}>
              {ITEM_ICONS[item.name] && <img src={ITEM_ICONS[item.name]} alt="" />}
              <span className="tk-companion-held-name">{item.name}</span>
              <span className="tk-companion-held-badge">HELD</span>
            </button>
          ))}
        </div>
      )}

      {heldItem && (
        <HeldItemSheet
          item={heldItem}
          animal={c.name}
          takers={warriors.map((x, i) => ({ x, i })).filter(({ x }) => !x.dead && x.currentVit > 0)}
          onTake={toWi => { setHeldItem(null); useTrackerStore.getState().takeCompanionItem(wi, heldItem.id, toWi) }}
          onDrop={() => { setHeldItem(null); useTrackerStore.getState().dropCompanionItem(wi, heldItem.id) }}
          onClose={() => setHeldItem(null)}
        />
      )}
    </section>
  )
}

// An item the animal holds: a friendly warrior takes it (HANDOFF), or it's dropped
function HeldItemSheet({ item, animal, takers, onTake, onDrop, onClose }) {
  return (
    <BottomSheet
      title={item.name}
      onClose={onClose}
      className="tk-sheet"
      footer={
        <>
          <button className="tk-detail-btn tk-detail-btn--ghost" onClick={onClose}>Close</button>
          <button className="tk-detail-btn tk-detail-btn--clear" onClick={onDrop}>Drop</button>
        </>
      }
    >
      <div className="tk-equip-detail-desc">{item.desc}</div>
      <p className="tk-companion-held-rule">The {animal} can&rsquo;t EXPEND or HANDOFF it. A friendly warrior in base contact can take it with HANDOFF.</p>
      <div className="tk-companion-takers">
        {takers.map(({ x, i }) => (
          <button key={i} className="tk-companion-taker" onClick={() => onTake(i)}>Give to {x.customName || x.type}</button>
        ))}
      </div>
    </BottomSheet>
  )
}
