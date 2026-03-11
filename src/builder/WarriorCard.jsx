import React, { useState, useRef } from 'react'
import { useBuilderStore, getAvailableWarriorTypes, getAllowedWeapons, getSecondWeaponOptions } from '../store/builderStore'
import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { WARRIOR_IMAGES, ITEM_ICONS } from '../data/images'

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) - 1) + '+'
  return parseInt(base) + 1
}

const TWO_HANDED = new Set(['Heavy Weapon', 'Polearm (two-handed)', 'Crossbow', 'Bow'])

// ── Inline SVGs ─────────────────────────────────────────────────────────────
const SvgWeapon1 = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
  </svg>
)
const SvgOffhand = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M21 7c0-1.1-.9-2-2-2h-1V4c0-1.1-.9-2-2-2s-2 .9-2 2v1h-1c-1.1 0-2 .9-2 2v.03C10.55 6.4 9.57 6 8.5 6 6.57 6 5 7.57 5 9.5V11c-1.66.44-3 1.95-3 3.75V17c0 2.76 2.24 5 5 5h8c2.76 0 5-2.24 5-5V7zm-2 10c0 1.65-1.35 3-3 3H7c-1.65 0-3-1.35-3-3v-2.25C4 13.68 4.68 13 5.5 13H6v-3.5C6 8.67 7.17 8 8.5 8S11 8.67 11 9.5V13h1V7c0-.55.45-1 1-1s1 .45 1 1v6h1V4c0-.55.45-1 1-1s1 .45 1 1v9h1V7z"/>
  </svg>
)
const SvgClimbing = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M14 6l-1-2H5v17h2v-7h5l1 2h7V6h-6zm4 8h-4l-1-2H7V6h5l1 2h5v6z"/>
  </svg>
)
const SvgConsumable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M9 3v8L5.5 17c-.83 1.5.17 3 1.5 3h11c1.33 0 2.33-1.5 1.5-3L16 11V3H9zm2 2h2v7.5l2.6 4.5H10.4L13 12.5V5h-2z"/>
  </svg>
)
const SvgStat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M12 4l-8 8h5v8h6v-8h5z"/>
  </svg>
)

// ── Equipment preview row (mirrors play mode WeaponRow) ─────────────────────
function EquipRow({ name, iconKey, wpnData, overrideNote }) {
  if (!name) return null
  const ic = ITEM_ICONS[iconKey || name]
  const dmgPill = wpnData?.damage > 0 ? `DMG ${wpnData.damage}` : null
  const rngPill = wpnData?.range && wpnData.range !== '—' ? `RNG ${wpnData.range}` : null
  const noteText = overrideNote !== undefined
    ? overrideNote
    : wpnData ? [wpnData.note, wpnData.special].filter(Boolean).join(' — ') : ''
  const abilityNote = overrideNote === undefined && wpnData?.abilityName
    ? `${wpnData.abilityName}: ${wpnData.abilityDesc}`
    : null
  return (
    <div className="bd-equip-row">
      {ic && <img src={ic} className="bd-equip-icon" alt="" />}
      <div className="bd-equip-body">
        <div className="bd-equip-name-line">
          <span className="bd-equip-name">{name}</span>
          {dmgPill && <span className="bd-equip-pill">{dmgPill}</span>}
          {rngPill && <span className="bd-equip-pill">{rngPill}</span>}
        </div>
        {noteText && <div className="bd-equip-note">{noteText}</div>}
        {abilityNote && <div className="bd-equip-note bd-equip-ability">{abilityNote}</div>}
      </div>
    </div>
  )
}

function SlotEquipment({ slot, wdata }) {
  const isDualWield = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
  const hasGear = slot.weapon1 || slot.weapon2 || (slot.climbing && slot.climbing !== 'None') || slot.consumable || (slot.statImprove && slot.ip?.includes('stat'))
  if (!hasGear) return null

  return (
    <div className="bd-equip-block">
      {isDualWield ? (
        <EquipRow
          name="Dual Light Weapons"
          iconKey="Dual Wield"
          wpnData={{ damage: 1, range: 'Contact' }}
          overrideNote="Two light weapons. +1 Attack die on all attacks."
        />
      ) : (
        <>
          {slot.weapon1 && <EquipRow name={slot.weapon1} wpnData={WEAPONS[slot.weapon1]} />}
          {slot.weapon2 && <EquipRow name={slot.weapon2} wpnData={WEAPONS[slot.weapon2]} />}
        </>
      )}
      {slot.climbing && slot.climbing !== 'None' && (() => {
        const cd = CLIMBING_ITEMS[slot.climbing]
        const cdesc = CLIMBING_DESCS[slot.climbing] || ''
        const pills = cd ? `HT ${cd.height} · SKILL ${cd.skillCheck}` : ''
        return <EquipRow name={slot.climbing} overrideNote={[pills, cdesc].filter(Boolean).join(' — ')} />
      })()}
      {slot.consumable && (
        <EquipRow name={slot.consumable} overrideNote={CONSUMABLES[slot.consumable] || ''} />
      )}
      {slot.statImprove && slot.ip?.includes('stat') && (
        <EquipRow
          name={STAT_IMPROVEMENT[slot.statImprove]}
          iconKey={null}
          overrideNote="Stat improvement applied"
        />
      )}
    </div>
  )
}

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
          >★</button>
        )}
      </div>

      <select
        className="warrior-select"
        value={slot.type || ''}
        onChange={e => selectWarrior(slotIndex, e.target.value || null)}
      >
        <option value="">— Choose Warrior —</option>
        {available.map(wt => <option key={wt} value={wt}>{wt}</option>)}
        {slot.type && !available.includes(slot.type) && (
          <option value={slot.type}>{slot.type}</option>
        )}
      </select>

      {!wdata ? (
        <div className="empty-slot-msg">Select a warrior type above</div>
      ) : (
        <>
          {/* Portrait + Stats */}
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

          {/* Abilities — play-mode style */}
          <div className="bd-abilities">
            {wdata.abilities.map((ab, i) => (
              <div key={i} className="bd-ability">
                <span className="bd-ability-name">{ab.name}</span>
                <div className="bd-ability-desc">{ab.desc}</div>
              </div>
            ))}
          </div>

          {wdata.restrictions && (
            <div className="restriction-note">{wdata.restrictions}</div>
          )}

          {/* Equipment preview — play-mode style */}
          <SlotEquipment slot={slot} wdata={wdata} />

          {/* Build config — tabbed */}
          <BuildConfig slotIndex={slotIndex} slot={slot} wdata={wdata} poolFull={poolFull} />

          {/* Notes — standalone at bottom */}
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

// ── Stats row ────────────────────────────────────────────────────────────────
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

// ── Weapon selector ──────────────────────────────────────────────────────────
function WeaponSelector({ label, labelIcon, slotIndex, slot, options, propKey, poolFull, iconSize = 28, onSelect }) {
  const setWarriorProp = useBuilderStore(s => s.setWarriorProp)
  const current = slot[propKey]
  const wpnData = current ? WEAPONS[current] : null
  const isDualWield = propKey === 'weapon2' && slot.weapon1 === 'Light Weapon' && current === 'Light Weapon'

  return (
    <div>
      {labelIcon && (
        <span className="upgrade-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {labelIcon} {label}
        </span>
      )}
      <div className="upgrade-choice-grid">
        {options.map(wn => {
          const wd = WEAPONS[wn]
          const ic = ITEM_ICONS[wn]
          const isPolearmOneHand = wn === 'Polearm (one-handed)'
          const needsIP = isPolearmOneHand && current !== wn && poolFull && !slot.ip?.includes('weapon2')
          const stats = wd && wd.damage > 0
            ? `${wd.range} · DMG ${wd.damage}`
            : wd?.range && wd.range !== '—' ? wd.range : null
          const abilityLine = wd?.abilityName ? `${wd.abilityName}: ${wd.abilityDesc}` : null
          return (
            <button
              key={wn}
              className={`upgrade-choice-btn ${current === wn ? 'active' : ''}`}
              disabled={needsIP}
              title={needsIP ? 'Requires 1 IP for mandatory Shield — pool full' : ''}
              onClick={() => {
                if (needsIP) return
                const newVal = wn === 'None' ? null : wn
                setWarriorProp(slotIndex, propKey, newVal)
                onSelect?.(newVal)
              }}
            >
              {ic && <img src={ic} alt="" style={{ width: iconSize, height: iconSize, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, flexShrink: 0 }} />}
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

// ── Build config — tabbed ────────────────────────────────────────────────────
const IP_TAB_IDS = ['weapon2', 'climbing', 'consumable', 'stat']

function BuildConfig({ slotIndex, slot, wdata, poolFull }) {
  const [activeTab, setActiveTab] = useState(() => slot.weapon1 ? null : 'weapon1')
  const { toggleIP, setWarriorProp } = useBuilderStore()

  const hasFixedShield    = wdata?.fixedShield || false
  const hasFixedDualWield = wdata?.fixedDualWield || false
  const primaryIsTwoHanded  = TWO_HANDED.has(slot.weapon1)
  const primaryIsPolearmOne = slot.weapon1 === 'Polearm (one-handed)'

  const isIPTab = id => IP_TAB_IDS.includes(id)
  const isFixed = id => id === 'weapon2' && (hasFixedShield || hasFixedDualWield || primaryIsPolearmOne)

  // Tab is "selected" (highlighted gold) when an actual item is chosen
  const isTabSelected = id => {
    if (id === 'weapon2') return !!slot.weapon2 || hasFixedShield || hasFixedDualWield
    if (id === 'climbing')   return !!slot.climbing && slot.climbing !== 'None'
    if (id === 'consumable') return !!slot.consumable
    if (id === 'stat')       return !!slot.statImprove && slot.ip?.includes('stat')
    return false
  }

  // Tab is locked (can't open) when pool is full and nothing selected yet
  const isTabLocked = id => {
    if (id === 'weapon2') {
      if (isFixed(id)) return false
      if (primaryIsTwoHanded) return true
      return !isTabSelected(id) && poolFull
    }
    if (isIPTab(id)) return !isTabSelected(id) && poolFull
    return false
  }

  const handleTabClick = id => {
    if (isTabLocked(id)) return
    setActiveTab(prev => prev === id ? null : id)
  }

  // Spend IP when a specific item is picked (called from panel handlers)
  const spendIP = id => {
    if (!slot.ip?.includes(id) && !poolFull) toggleIP(slotIndex, id, true)
  }
  const freeIP = id => {
    if (slot.ip?.includes(id)) toggleIP(slotIndex, id, false)
  }

  // × button: clear the item + return the IP
  const removeUpgrade = (e, id) => {
    e.stopPropagation()
    if (id === 'climbing')   setWarriorProp(slotIndex, 'climbing',    null)
    if (id === 'consumable') setWarriorProp(slotIndex, 'consumable',  null)
    if (id === 'stat')       setWarriorProp(slotIndex, 'statImprove', null)
    if (id === 'weapon2')    setWarriorProp(slotIndex, 'weapon2',     null)
    freeIP(id)
    if (activeTab === id) setActiveTab(null)
  }

  const weapon2Label  = hasFixedDualWield ? 'Dual Wield' : (hasFixedShield || primaryIsPolearmOne) ? 'Shield' : 'Off-hand'
  const weapon2IsFree = hasFixedShield || hasFixedDualWield || primaryIsPolearmOne

  const tabs = [
    { id: 'weapon1',    label: 'Weapon',   SvgIcon: SvgWeapon1 },
    { id: 'weapon2',    label: weapon2Label, SvgIcon: SvgOffhand, isFree: weapon2IsFree },
    { id: 'climbing',   label: 'Gear',     SvgIcon: SvgClimbing },
    { id: 'consumable', label: 'Supply',   SvgIcon: SvgConsumable },
    { id: 'stat',       label: 'Stat',     SvgIcon: SvgStat },
  ]

  return (
    <div className="build-config">
      <div className="build-tabs">
        {tabs.map(tab => {
          const selected  = isTabSelected(tab.id)
          const locked    = isTabLocked(tab.id)
          const active    = activeTab === tab.id
          // × shows on any non-fixed IP tab when an item is selected
          const canRemove = isIPTab(tab.id) && isTabSelected(tab.id) && !isFixed(tab.id)
          return (
            <button
              key={tab.id}
              className={`build-tab${selected ? ' bd-selected' : ''}${active ? ' bd-active' : ''}${locked ? ' bd-locked' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              disabled={locked}
              title={locked ? (primaryIsTwoHanded ? 'Two-handed weapon equipped' : 'IP pool full') : ''}
            >
              <span className="build-tab-icon"><tab.SvgIcon /></span>
              <span className="build-tab-label">
                {tab.label}
                {tab.isFree && <span className="build-tab-free">FREE</span>}
              </span>
              {canRemove && (
                <span className="build-tab-x" onClick={e => removeUpgrade(e, tab.id)}>×</span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab && (
        <div className="build-tab-panel">

          {activeTab === 'weapon1' && (
            <WeaponSelector
              label="Primary Weapon"
              slotIndex={slotIndex}
              slot={slot}
              options={getAllowedWeapons(wdata)}
              propKey="weapon1"
              poolFull={poolFull}
              iconSize={28}
            />
          )}

          {activeTab === 'weapon2' && (
            <WeaponSelector
              label={weapon2Label + (weapon2IsFree ? ' (Free)' : '')}
              labelIcon={<SvgWeapon2 />}
              slotIndex={slotIndex}
              slot={slot}
              options={
                hasFixedShield      ? ['Shield'] :
                hasFixedDualWield   ? ['Light Weapon'] :
                primaryIsPolearmOne ? ['Shield'] :
                getSecondWeaponOptions(wdata, slot.weapon1)
              }
              propKey="weapon2"
              poolFull={poolFull}
              iconSize={28}
              onSelect={newVal => {
                if (!isFixed('weapon2')) {
                  if (newVal) spendIP('weapon2')
                  else freeIP('weapon2')
                }
              }}
            />
          )}

          {activeTab === 'climbing' && (
            <div>
              <div className="upgrade-choice-grid">
                {Object.keys(CLIMBING_ITEMS).filter(k => k !== 'None').map(opt => (
                  <button
                    key={opt}
                    className={`upgrade-choice-btn ${slot.climbing === opt ? 'active' : ''}`}
                    onClick={() => {
                      const newVal = slot.climbing === opt ? null : opt
                      setWarriorProp(slotIndex, 'climbing', newVal)
                      if (newVal) spendIP('climbing')
                      else freeIP('climbing')
                    }}
                  >
                    {ITEM_ICONS[opt] && <img src={ITEM_ICONS[opt]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, flexShrink: 0 }} />}
                    <span className="upgrade-btn-text">
                      <span className="upgrade-btn-name">{opt}</span>
                      {CLIMBING_ITEMS[opt] && <span className="upgrade-btn-stats">Max {CLIMBING_ITEMS[opt].height}</span>}
                    </span>
                  </button>
                ))}
              </div>
              {slot.climbing && CLIMBING_DESCS[slot.climbing] && (
                <div className="upgrade-choice-note">{CLIMBING_DESCS[slot.climbing]}</div>
              )}
            </div>
          )}

          {activeTab === 'consumable' && (
            <div>
              <div className="upgrade-choice-grid">
                {CONSUMABLE_NAMES.map(opt => (
                  <button
                    key={opt}
                    className={`upgrade-choice-btn ${slot.consumable === opt ? 'active' : ''}`}
                    onClick={() => {
                      const newVal = slot.consumable === opt ? null : opt
                      setWarriorProp(slotIndex, 'consumable', newVal)
                      if (newVal) spendIP('consumable')
                      else freeIP('consumable')
                    }}
                  >
                    {ITEM_ICONS[opt] && <img src={ITEM_ICONS[opt]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, flexShrink: 0 }} />}
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

          {activeTab === 'stat' && (
            <div className="upgrade-choice-grid">
              {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => (
                <button
                  key={k}
                  className={`upgrade-choice-btn ${slot.statImprove === k ? 'active' : ''}`}
                  onClick={() => {
                    const newVal = slot.statImprove === k ? null : k
                    setWarriorProp(slotIndex, 'statImprove', newVal)
                    if (newVal) spendIP('stat')
                    else freeIP('stat')
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
