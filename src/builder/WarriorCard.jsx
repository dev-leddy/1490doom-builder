import React, { useState, useRef } from 'react'
import { useBuilderStore, getAvailableWarriorTypes, getAllowedWeapons, getSecondWeaponOptions } from '../store/builderStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { WARRIOR_IMAGES, ITEM_ICONS } from '../data/images'

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') {
    return (parseInt(base) - 1) + '+'
  }
  return parseInt(base) + 1
}

const TWO_HANDED = new Set(['Heavy Weapon', 'Polearm (two-handed)', 'Crossbow', 'Bow'])

// ── Inline SVGs matching the original app exactly ─────────────────────────
const SvgWeapon2 = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.4em" height="1.4em">
    <path d="M2 2l7 7-1.5 1.5L2 5V2h3l5 5.5L8.5 9 2 2zm20 0v3l-5.5 5.5L15 9l-7-7h3l4.5 5L17 5.5 14.5 3 17 2h3l2 2zM8.5 13.5l-6 6 1 1 6-6-1-1zm7 0l-1 1 6 6 1-1-6-6z"/>
  </svg>
)
const SvgClimbing = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.4em" height="1.4em">
    <path d="M14 6l-1-2H5v17h2v-7h5l1 2h7V6h-6zm4 8h-4l-1-2H7V6h5l1 2h5v6z"/>
  </svg>
)
const SvgConsumable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.4em" height="1.4em">
    <path d="M9 3v8L5.5 17c-.83 1.5.17 3 1.5 3h11c1.33 0 2.33-1.5 1.5-3L16 11V3H9zm2 2h2v7.5l2.6 4.5H10.4L13 12.5V5h-2z"/>
  </svg>
)
const SvgStat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.4em" height="1.4em">
    <path d="M12 4l-8 8h5v8h6v-8h5z"/>
  </svg>
)

// ── Main card ──────────────────────────────────────────────────────────────
export default function WarriorCard({ slotIndex, slot }) {
  const { selectWarrior, setCaptain, setNotes, setWarriorProp, getTotalIPSpent, ipLimit } = useBuilderStore()
  const allSlots = useBuilderStore(s => s.slots)

  const [expandedNotes, setExpandedNotes] = useState(() => new Set())
  const [editingName, setEditingName] = useState(false)
  const longPressRef = useRef(null)
  const notes = slot.notes || []

  const addNote = () => {
    setNotes(slotIndex, [{ title: '', body: '' }, ...notes])
    setExpandedNotes(prev => {
      const shifted = new Set(); prev.forEach(i => shifted.add(i + 1)); shifted.add(0); return shifted
    })
  }
  const removeNote = (ni) => {
    setNotes(slotIndex, notes.filter((_, i) => i !== ni))
    setExpandedNotes(prev => {
      const next = new Set()
      prev.forEach(i => { if (i < ni) next.add(i); else if (i > ni) next.add(i - 1) })
      return next
    })
  }
  const updateNote = (ni, field, value) =>
    setNotes(slotIndex, notes.map((n, i) => i === ni ? { ...n, [field]: value } : n))
  const collapseNote = (ni) => setExpandedNotes(prev => { const s = new Set(prev); s.delete(ni); return s })
  const expandNote  = (ni) => setExpandedNotes(prev => new Set([...prev, ni]))

  const wdata = slot.type ? WARRIORS[slot.type] : null
  const available = getAvailableWarriorTypes(slotIndex, allSlots)
  const totalSpent = getTotalIPSpent()
  const poolFull = totalSpent >= ipLimit
  const portraitSrc = slot.type ? WARRIOR_IMAGES[slot.type] : null

  return (
    <div className={`warrior-slot ${slot.isCaptain ? 'is-captain' : ''}`}>
      <div className="slot-header">
        <div className="slot-number">
          {editingName ? (
            <input
              className="slot-name-input"
              autoFocus
              value={slot.customName || ''}
              placeholder={`Warrior ${slotIndex + 1}`}
              onChange={e => setWarriorProp(slotIndex, 'customName', e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false) }}
            />
          ) : (
            <span
              onDoubleClick={() => setEditingName(true)}
              onTouchStart={() => { longPressRef.current = setTimeout(() => setEditingName(true), 500) }}
              onTouchEnd={() => clearTimeout(longPressRef.current)}
              onTouchMove={() => clearTimeout(longPressRef.current)}
              title="Double-click to rename"
            >
              {slot.customName || `Warrior ${slotIndex + 1}`}
            </span>
          )}
        </div>
        {slot.type && (
          <button
            className={`captain-toggle ${slot.isCaptain ? 'is-captain' : ''}`}
            onClick={() => setCaptain(slotIndex)}
            title={slot.isCaptain ? 'Captain' : 'Set as Captain'}
          >
            ★
          </button>
        )}
      </div>

      <select
        className="warrior-select"
        value={slot.type || ''}
        onChange={e => selectWarrior(slotIndex, e.target.value || null)}
      >
        <option value="">— Choose Warrior —</option>
        {available.map(wt => (
          <option key={wt} value={wt}>{wt}</option>
        ))}
        {slot.type && !available.includes(slot.type) && (
          <option value={slot.type}>{slot.type}</option>
        )}
      </select>

      {!wdata ? (
        <div className="empty-slot-msg">Select a warrior type above</div>
      ) : (
        <>
          {/* Portrait + Stats row — always shown; placeholder when no portrait image */}
          <div className="warrior-header-row">
            {portraitSrc ? (
              <img className="warrior-portrait" src={portraitSrc} alt={slot.type} />
            ) : (
              <div className="warrior-portrait-placeholder" title="No portrait available">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M12 2c2 2 7 5 10 5v7c0 6-5 8-10 10C7 22 2 20 2 14V7c3 0 8-3 10-5z"/>
                </svg>
              </div>
            )}
            <div className="warrior-header-text">
              <StatsRow slot={slot} wdata={wdata} />
            </div>
          </div>

          {/* Abilities */}
          <div className="abilities-list">
            {wdata.abilities.map((ab, i) => (
              <div key={i} className="ability-item">
                <span className="ability-name">{ab.name}</span>
                {ab.desc}
              </div>
            ))}
          </div>

          {wdata.restrictions && (
            <div className="restriction-note">{wdata.restrictions}</div>
          )}

          {/* Primary Weapon */}
          <WeaponSelector
            label="Primary Weapon"
            slotIndex={slotIndex}
            slot={slot}
            options={getAllowedWeapons(wdata)}
            propKey="weapon1"
            poolFull={poolFull}
            iconSize={32}
          />

          {/* IP Upgrade tray + sub-panels */}
          <IPOptions
            slotIndex={slotIndex}
            slot={slot}
            wdata={wdata}
            poolFull={poolFull}
          />

          {/* Notes */}
          <div className="notes-section">
            {notes.map((note, ni) =>
              expandedNotes.has(ni) ? (
                <div key={ni} className="note-panel">
                  <div className="note-panel-header">
                    <span className="note-panel-label">Note</span>
                    <button className="note-panel-close" title="Remove" onClick={() => removeNote(ni)}>×</button>
                  </div>
                  <input
                    className="note-title-input"
                    type="text"
                    value={note.title}
                    onChange={e => updateNote(ni, 'title', e.target.value)}
                    placeholder="Title (e.g. Poisoned, Inspired…)"
                  />
                  <div className="note-body-wrap">
                    <textarea
                      className="warrior-note"
                      rows={3}
                      value={note.body}
                      onChange={e => updateNote(ni, 'body', e.target.value)}
                      placeholder="Effect, conditions, house rules…"
                    />
                    <button className="note-save-btn" title="Save" onClick={() => collapseNote(ni)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z"/></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div key={ni} className="note-chip">
                  <span className="note-chip-title">{note.title || 'Note'}</span>
                  <div className="note-chip-actions">
                    <button className="note-chip-edit" title="Edit" onClick={() => expandNote(ni)}>✎</button>
                    <button className="note-chip-remove" title="Remove" onClick={() => removeNote(ni)}>×</button>
                  </div>
                </div>
              )
            )}
            <button className="note-toggle" onClick={addNote}>+ Add Note</button>
          </div>

        </>
      )}
    </div>
  )
}

// ── Stats row (extracted to avoid duplication) ─────────────────────────────
function StatsRow({ slot, wdata }) {
  return (
    <div className="stats-row">
      {['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM'].map(s => {
        const base = wdata.stats[s]
        const improved = slot.ip?.includes('stat') && slot.statImprove === s
        return (
          <div key={s} className="stat-box">
            <span className="stat-label">{s}</span>
            <span className={`stat-val ${improved ? 'modified' : ''}`}>
              {improved ? improveStatDisplay(base, s) : base}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Weapon selector ─────────────────────────────────────────────────────────
function WeaponSelector({ label, labelIcon, slotIndex, slot, options, propKey, poolFull, iconSize = 28 }) {
  const setWarriorProp = useBuilderStore(s => s.setWarriorProp)
  const current = slot[propKey]
  const wpnData = current ? WEAPONS[current] : null
  const isDualWield = propKey === 'weapon2' && slot.weapon1 === 'Light Weapon' && current === 'Light Weapon'

  return (
    <div className="upgrade-detail" style={{ marginBottom: '0.75rem', marginTop: 0 }}>
      <span className="upgrade-detail-label">
        {labelIcon && <>{labelIcon}{' '}</>}
        {label}
      </span>
      <div className="upgrade-choice-grid">
        {options.map(wn => {
          const wd = WEAPONS[wn]
          const ic = ITEM_ICONS[wn]
          const isPolearmOneHand = wn === 'Polearm (one-handed)'
          const needsIP = isPolearmOneHand && current !== wn && poolFull && !slot.ip?.includes('weapon2')
          const stats = wd && wd.damage > 0
            ? `${wd.range} · DMG ${wd.damage}`
            : wd?.note || null
          const abilityLine = wd?.abilityName ? `${wd.abilityName}: ${wd.abilityDesc}` : null

          return (
            <button
              key={wn}
              className={`upgrade-choice-btn ${current === wn ? 'active' : ''}`}
              disabled={needsIP}
              title={needsIP ? 'Requires 1 IP for mandatory Shield — pool full' : ''}
              onClick={() => !needsIP && setWarriorProp(slotIndex, propKey, wn === 'None' ? null : wn)}
            >
              {ic && (
                <img
                  src={ic}
                  alt=""
                  style={{ width: iconSize, height: iconSize, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, flexShrink: 0 }}
                />
              )}
              <span className="upgrade-btn-text">
                <span className="upgrade-btn-name">{wn}</span>
                {stats && <span className="upgrade-btn-stats">{stats}</span>}
                {abilityLine && <span className="upgrade-btn-stats">{abilityLine}</span>}
                {needsIP && <span className="polearm-ip-note">Requires 1 IP (Shield)</span>}
              </span>
            </button>
          )
        })}
      </div>
      {wpnData && (
        <div className="upgrade-choice-note">
          {isDualWield && <strong>Dual Wield: +1 Attack die. </strong>}
          {wpnData.note}
        </div>
      )}
    </div>
  )
}

// ── Upgrade tray (4 IP cards + sub-panels) ─────────────────────────────────
const UPGRADE_CARD_DEFS = [
  { id: 'weapon2', SvgIcon: SvgWeapon2 },
  { id: 'climbing', SvgIcon: SvgClimbing },
  { id: 'consumable', SvgIcon: SvgConsumable },
  { id: 'stat', SvgIcon: SvgStat },
]

function IPOptions({ slotIndex, slot, wdata, poolFull }) {
  const { toggleIP, setWarriorProp } = useBuilderStore()

  const primaryIsTwoHanded = TWO_HANDED.has(slot.weapon1)
  const primaryIsPolearmOneHanded = slot.weapon1 === 'Polearm (one-handed)'
  const hasFixedShield = wdata?.fixedShield || false
  const hasFixedDualWield = wdata?.fixedDualWield || false

  // Build card configs with correct label + locked state
  const cards = UPGRADE_CARD_DEFS.map(card => {
    let label, locked
    if (card.id === 'weapon2') {
      if (hasFixedDualWield) {
        label = 'Dual Wield\n(Free)'
        locked = true // Reaver gets second Light Weapon at no IP cost
      } else if (hasFixedShield) {
        label = 'Shield\n(Free)'
        locked = true // warriors with fixedShield get it at no IP cost
      } else if (primaryIsPolearmOneHanded) {
        label = 'Shield\n(Auto)'
        locked = true // Polearm one-handed always has a shield — auto IP spend
      } else {
        label = 'Second\nWeapon'
        locked = primaryIsTwoHanded // two-handed weapon can't have a second
      }
    } else {
      label = card.id === 'climbing' ? 'Climbing\nGear'
            : card.id === 'consumable' ? 'Consumable'
            : 'Stat\nBoost'
      locked = false
    }
    return { ...card, label, locked }
  })

  return (
    <div className="upgrade-tray">
      <div className="upgrade-tray-header">
        <span className="upgrade-tray-label">Upgrades</span>
        <span className="upgrade-tray-count">{slot.ip?.length || 0} spent on this warrior</span>
      </div>

      <div className="upgrade-cards">
        {cards.map(card => {
          // fixedShield / fixedDualWield warriors show weapon2 card as pre-selected (no IP cost)
          const isFreeWeapon2Card = card.id === 'weapon2' && (hasFixedShield || hasFixedDualWield)
          const checked = slot.ip?.includes(card.id) || isFreeWeapon2Card
          const isLocked = card.locked || (!checked && poolFull)
          return (
            <button
              key={card.id}
              className={`upgrade-card ${checked ? 'selected' : ''} ${isLocked && !checked ? 'locked' : ''}`}
              disabled={isLocked && !checked}
              onClick={() => !(isLocked && !checked) && toggleIP(slotIndex, card.id, !checked)}
            >
              <span className="upgrade-card-icon"><card.SvgIcon /></span>
              <span className="upgrade-card-label">{card.label}</span>
              <span className="upgrade-card-check">✓</span>
            </button>
          )
        })}
      </div>

      {/* Second Weapon sub-panel */}
      {(slot.ip?.includes('weapon2') || hasFixedShield || hasFixedDualWield) && (
        <WeaponSelector
          label="Choose Second Weapon"
          labelIcon={<SvgWeapon2 />}
          slotIndex={slotIndex}
          slot={slot}
          options={
            hasFixedShield ? ['Shield'] :
            hasFixedDualWield ? ['Light Weapon'] :
            getSecondWeaponOptions(wdata, slot.weapon1)
          }
          propKey="weapon2"
          poolFull={poolFull}
          iconSize={28}
        />
      )}

      {/* Climbing sub-panel */}
      {slot.ip?.includes('climbing') && (
        <div className="upgrade-detail">
          <span className="upgrade-detail-label"><SvgClimbing /> Choose Climbing Gear</span>
          <div className="upgrade-choice-grid">
            {Object.keys(CLIMBING_ITEMS).filter(k => k !== 'None').map(opt => (
              <button
                key={opt}
                className={`upgrade-choice-btn ${slot.climbing === opt ? 'active' : ''}`}
                onClick={() => setWarriorProp(slotIndex, 'climbing', slot.climbing === opt ? null : opt)}
              >
                {ITEM_ICONS[opt] && (
                  <img
                    src={ITEM_ICONS[opt]}
                    alt=""
                    style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, flexShrink: 0 }}
                  />
                )}
                <span className="upgrade-btn-text">
                  <span className="upgrade-btn-name">{opt}</span>
                  {CLIMBING_ITEMS[opt] && (
                    <span className="upgrade-btn-stats">Max {CLIMBING_ITEMS[opt].height}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          {slot.climbing && CLIMBING_DESCS[slot.climbing] && (
            <div className="upgrade-choice-note">{CLIMBING_DESCS[slot.climbing]}</div>
          )}
        </div>
      )}

      {/* Consumable sub-panel */}
      {slot.ip?.includes('consumable') && (
        <div className="upgrade-detail">
          <span className="upgrade-detail-label"><SvgConsumable /> Choose Consumable</span>
          <div className="upgrade-choice-grid">
            {CONSUMABLE_NAMES.map(opt => (
              <button
                key={opt}
                className={`upgrade-choice-btn ${slot.consumable === opt ? 'active' : ''}`}
                onClick={() => setWarriorProp(slotIndex, 'consumable', slot.consumable === opt ? null : opt)}
              >
                {ITEM_ICONS[opt] && (
                  <img
                    src={ITEM_ICONS[opt]}
                    alt=""
                    style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, flexShrink: 0 }}
                  />
                )}
                <span className="upgrade-btn-text">
                  <span className="upgrade-btn-name">{opt}</span>
                </span>
              </button>
            ))}
          </div>
          {slot.consumable && CONSUMABLES[slot.consumable] && (
            <div className="upgrade-choice-note">{CONSUMABLES[slot.consumable]}</div>
          )}
        </div>
      )}

      {/* Stat Boost sub-panel — plain choice buttons matching original */}
      {slot.ip?.includes('stat') && (
        <div className="upgrade-detail">
          <span className="upgrade-detail-label"><SvgStat /> Choose Stat to Improve</span>
          <div className="upgrade-choice-grid">
            {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => (
              <button
                key={k}
                className={`upgrade-choice-btn ${slot.statImprove === k ? 'active' : ''}`}
                onClick={() => setWarriorProp(slotIndex, 'statImprove', k)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
