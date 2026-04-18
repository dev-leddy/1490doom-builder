import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WEAPONS } from '../data/weapons'
import { WARRIOR_IMAGES, ITEM_ICONS } from '../data/images'
import { SvgGear } from './icons'
import WarriorLoadout from './WarriorLoadout'
import WarriorSettingsSheet from './WarriorSettingsSheet'

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) - 1) + '+'
  return parseInt(base) + 1
}

function debuffStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) + 1) + '+'
  return Math.max(0, parseInt(base) - 1)
}

// ── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ slot, wdata }) {
  const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
  const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0

  return (
    <div className="stats-row">
      {['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM'].map(s => {
        let base = wdata.stats[s]
        const improved = (slot.ip?.includes('stat') && slot.statImprove === s) || (slot.statImproves?.includes(s))
        const polearmDebuff = slot.weapon1 === 'Polearm (one-handed)' && s === 'COM'

        if (s === 'ATK') {
          base = parseInt(base) + dualWieldBonus
        }

        let displayVal = base
        if (improved) displayVal = improveStatDisplay(displayVal, s)
        if (polearmDebuff) displayVal = debuffStatDisplay(displayVal, s)

        const bothModified = improved && polearmDebuff
        let statClass = ''
        if ((improved && !bothModified) || (s === 'ATK' && dualWieldBonus > 0)) statClass = 'modified'
        else if (polearmDebuff && !bothModified) statClass = 'debuffed'

        return (
          <div key={s} className="stat-box">
            <span className="stat-label">{s}</span>
            <span className={`stat-val ${statClass}`}>
              {displayVal}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Card ────────────────────────────────────────────────────────────────
export default function WarriorCard({ slotIndex, slot }) {
  const { setNotes, getTotalIPSpent, ipLimit } = useBuilderStore()
  const allSlots = useBuilderStore(s => s.slots)
  const companyMode = useBuilderStore(s => s.companyMode)

  const [expandedNotes, setExpandedNotes] = useState(() => new Set())
  const [showSettings, setShowSettings] = useState(false)
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
  const poolFull = companyMode === 'campaign'
    ? (slot.ip?.length || 0) >= (slot.earnedIP || 0)
    : getTotalIPSpent() >= ipLimit
  const portraitSrc = slot.type ? WARRIOR_IMAGES[slot.type] : null

  const allAbilities = [...(wdata?.abilities || [])]
  const w1d = WEAPONS[slot.weapon1]
  if (w1d?.abilityName) {
    allAbilities.push({ name: w1d.abilityName, desc: w1d.abilityDesc, source: `from ${slot.weapon1}` })
  }
  const w2d = WEAPONS[slot.weapon2]
  if (w2d?.abilityName) {
    allAbilities.push({ name: w2d.abilityName, desc: w2d.abilityDesc, source: `from ${slot.weapon2}` })
  }
  if (slot.isCaptain) {
    allAbilities.unshift({
      name: '★ Captain Re-Roll',
      desc: 'Once per game, the Captain may re-roll a single die.',
    })
  }

  return (
    <div className={`warrior-slot ${slot.isCaptain ? 'is-captain' : ''}`}>
      <div className="slot-header">
        <div className="slot-number">
          {slot.isCaptain && <span className="slot-captain-label">CAPTAIN</span>}
          <span style={{ fontFamily: "'Caslon Antique', serif", fontSize: '1.4rem', color: '#ffffff', textTransform: 'none', letterSpacing: 'normal' }}>
            {slot.customName || slot.type || `WARRIOR ${slotIndex + 1}`}
          </span>
        </div>
        <button className="slot-gear-btn" onClick={() => setShowSettings(true)} title="Warrior Settings" aria-label="Warrior settings">
          <SvgGear />
        </button>
      </div>

      {!wdata ? (
        <button className="slot-choose-btn" onClick={() => setShowSettings(true)}>Choose Warrior</button>
      ) : (
        <>
          {/* Portrait + Stats */}
          <div className="warrior-header-row">
            <div className="slot-portrait-col">
              {portraitSrc ? (
                <img
                  className="warrior-portrait clickable-portrait"
                  src={portraitSrc}
                  alt={slot.type}
                  onClick={() => setShowSettings(true)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s', filter: 'brightness(1.05)' }}
                  title="Warrior settings"
                />
              ) : (
                <div
                  className="warrior-portrait-placeholder clickable-portrait"
                  title="Warrior settings"
                  onClick={() => setShowSettings(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                    <path d="M12 2c2 2 7 5 10 5v7c0 6-5 8-10 10C7 22 2 20 2 14V7c3 0 8-3 10-5z"/>
                  </svg>
                </div>
              )}
              <div className="slot-class-label">{slot.type}</div>
            </div>
            <div className="warrior-header-text">
              <StatsRow slot={slot} wdata={wdata} />
            </div>
          </div>

          {/* Loadout — upgrades + equipment combined */}
          <WarriorLoadout slotIndex={slotIndex} slot={slot} wdata={wdata} poolFull={poolFull} />

          {/* Abilities */}
          {allAbilities.length > 0 && (
            <div className="lr-section-header" style={{ marginTop: '1rem', marginBottom: '0.4rem' }}>
              <span className="lr-section-title">ABILITIES</span>
            </div>
          )}
          {allAbilities.length > 0 && (
            <div className="bd-abilities">
              {allAbilities.map((ab, i) => {
                const abilityIcon = {
                  'OVERDRAW': ITEM_ICONS['Bow'],
                  'RELOAD':   ITEM_ICONS['Crossbow'],
                  'GUARDED':  ITEM_ICONS['Shield'],
                }[ab.name]
                return (
                  <div key={i} className="bd-ability">
                    <span className="bd-ability-name">
                      {abilityIcon && (
                        <img src={abilityIcon} alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', marginRight: '0.35em', filter: 'brightness(0) invert(1)', opacity: 0.85, flexShrink: 0 }} />
                      )}
                      {ab.name}
                      {ab.source && <span style={{fontSize: '0.85em', opacity: 0.7, fontWeight: 'normal', marginLeft: '0.4rem'}}>({ab.source})</span>}
                    </span>
                    <div className="bd-ability-desc">{ab.desc}</div>
                  </div>
                )
              })}
            </div>
          )}

          {wdata.restrictions && (
            <div className="restriction-note">{wdata.restrictions}</div>
          )}

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

      <WarriorSettingsSheet
        slotIndex={slotIndex}
        slot={slot}
        allSlots={allSlots}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
