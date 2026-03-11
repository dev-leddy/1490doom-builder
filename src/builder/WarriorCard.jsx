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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M389.917 128.73v100.836h-22.802v-158.5a17.11 17.11 0 0 0-17.11-17.11h-11.863a17.11 17.11 0 0 0-17.11 17.11v158.5h-22.698V46.993a17.11 17.11 0 0 0-17.11-17.11h-11.863a17.11 17.11 0 0 0-17.11 17.11v182.573H229.5V77.33a17.11 17.11 0 0 0-17.108-17.11h-11.864a17.11 17.11 0 0 0-17.11 17.11v263.873l-63.858-51.14a23.385 23.385 0 0 0-30.743 1.32l-5.567 5.31a23.385 23.385 0 0 0-2.01 31.678l102.19 125.647a72.028 72.028 0 0 0 57.092 28.1h60.85A134.637 134.637 0 0 0 436 347.5V128.73a17.11 17.11 0 0 0-17.11-17.108h-11.864a17.11 17.11 0 0 0-17.11 17.11z"/>
  </svg>
)
const SvgClimbing = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M230.125 18.156V247h49.313V18.156h-49.313zM78.812 21.438l-16 136.906c48.707 30.112 97.637 47.843 148.625 53.094V33.125c-44.244-1.822-88.46-5.89-132.625-11.688zm349.438.28c-43.398 6.814-86.784 10.647-130.125 11.97v175c46.732-7.458 95.816-24.375 148.438-50.844L428.25 21.72zm-1.938 166.532c-44.474 19.847-87.06 32.836-128.187 38.97V247h37.031v143.188h-37.031v8.718c0 34.41-20.516 56.084-43.25 56.28-22.734.2-43.438-21.34-43.438-56.28v-8.72l-27.656.002h-9.343V247h37.001v-17.188c-43.774-4.164-86.14-16.857-127.687-38.062 5.04 92.69 3.66 185.37-5.063 278.063 117.402 32.047 234.788 31.002 352.188 0-6.853-93.858-9.223-187.706-4.563-281.563zm-233.187 77.438V371.5H316.47V265.687H193.124zm20.47 18.156H296v67.5h-82.406v-67.5zm18.686 18.687v30.126h45.032V302.53h-45.03zm-2.155 87.658v8.718c0 28.23 13.32 37.692 24.594 37.594 11.27-.098 24.718-10.018 24.718-37.594v-8.72l-49.313.002z"/>
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

// ── Loadout row ───────────────────────────────────────────────────────────────
function LoadoutRow({ icon: Icon, label, value, pills, badge, badgeVariant, isOpen, canRemove, isLocked, onToggle, onRemove, children }) {
  const hasValue = !!value
  const cls = [
    'lr-row',
    isOpen       ? 'lr-open'     : '',
    hasValue && badgeVariant !== 'free' ? 'lr-selected' : '',
    badgeVariant === 'free' ? 'lr-free'     : '',
    isLocked     ? 'lr-locked'   : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <div className="lr-header" onClick={!isLocked ? onToggle : undefined}>
        <span className="lr-icon"><Icon /></span>
        <span className="lr-label">{label}</span>
        <span className={`lr-value${!hasValue ? ' lr-value-empty' : ''}`}>{value || '—'}</span>
        {pills && pills.map((p, i) => <span key={i} className="lr-pill">{p}</span>)}
        <span className="lr-right">
          {badge && <span className={`lr-badge lr-badge-${badgeVariant || 'ip'}`}>{badge}</span>}
          {canRemove && (
            <button className="lr-remove" onClick={e => { e.stopPropagation(); onRemove() }}>×</button>
          )}
          {!isLocked && <span className="lr-chevron">{isOpen ? '▴' : '▾'}</span>}
        </span>
      </div>
      {isOpen && (
        <div className="lr-panel">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Loadout panel (replaces BuildConfig + SlotEquipment) ─────────────────────
const IP_ROW_IDS = ['weapon2', 'climbing', 'consumable', 'stat']

function LoadoutPanel({ slotIndex, slot, wdata, poolFull }) {
  const [activeRow, setActiveRow] = useState(() => slot.weapon1 ? null : 'weapon1')
  const { toggleIP, setWarriorProp, getTotalIPSpent, ipLimit } = useBuilderStore()
  const totalSpent = getTotalIPSpent()

  const hasFixedShield    = wdata?.fixedShield || false
  const hasFixedDualWield = wdata?.fixedDualWield || false
  const primaryIsTwoHanded  = TWO_HANDED.has(slot.weapon1)
  const primaryIsPolearmOne = slot.weapon1 === 'Polearm (one-handed)'

  const isIPRow  = id => IP_ROW_IDS.includes(id)
  const isFixed  = id => id === 'weapon2' && (hasFixedShield || hasFixedDualWield || primaryIsPolearmOne)

  const isRowSelected = id => {
    if (id === 'weapon2')    return !!slot.weapon2
    if (id === 'climbing')   return !!slot.climbing && slot.climbing !== 'None'
    if (id === 'consumable') return !!slot.consumable
    if (id === 'stat')       return !!slot.statImprove && slot.ip?.includes('stat')
    return false
  }

  const isRowLocked = id => {
    if (id === 'weapon2') {
      if (isFixed(id))         return false
      if (primaryIsTwoHanded)  return true
      return !isRowSelected(id) && poolFull
    }
    if (isIPRow(id)) return !isRowSelected(id) && poolFull
    return false
  }

  const handleRowClick = id => {
    if (isRowLocked(id)) return
    setActiveRow(prev => prev === id ? null : id)
  }

  const spendIP = id => { if (!slot.ip?.includes(id) && !poolFull) toggleIP(slotIndex, id, true) }
  const freeIP  = id => { if (slot.ip?.includes(id)) toggleIP(slotIndex, id, false) }

  const removeUpgrade = id => {
    if (id === 'climbing')   setWarriorProp(slotIndex, 'climbing',    null)
    if (id === 'consumable') setWarriorProp(slotIndex, 'consumable',  null)
    if (id === 'stat')       setWarriorProp(slotIndex, 'statImprove', null)
    if (id === 'weapon2')    setWarriorProp(slotIndex, 'weapon2',     null)
    freeIP(id)
    if (activeRow === id) setActiveRow(null)
  }

  const weapon2Label  = hasFixedDualWield ? 'Dual Wield' : 'Off-hand'
  const weapon2IsFree = hasFixedShield || hasFixedDualWield || primaryIsPolearmOne

  // Compute weapon display (name + pills)
  const wpnDisplay = wname => {
    if (!wname) return { value: null, pills: [] }
    const wd = WEAPONS[wname]
    const pills = []
    if (wd?.range && wd.range !== '—') pills.push(`RNG ${wd.range}`)
    if (wd?.damage > 0) pills.push(`DMG ${wd.damage}`)
    return { value: wname, pills }
  }

  // Dual-wield: both weapons are Light Weapon
  const isDualWield = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'

  const w1 = isDualWield
    ? { value: 'Dual Light Weapons', pills: ['RNG Contact', 'DMG 1'] }
    : wpnDisplay(slot.weapon1)

  const w2 = wpnDisplay(slot.weapon2)

  // Climbing
  const climbVal = (slot.climbing && slot.climbing !== 'None') ? slot.climbing : null
  const climbPills = climbVal
    ? (() => { const cd = CLIMBING_ITEMS[climbVal]; return cd ? [`HT ${cd.height}`, `SKILL ${cd.skillCheck}`] : [] })()
    : []

  // Stat
  const statVal = (slot.statImprove && slot.ip?.includes('stat')) ? STAT_IMPROVEMENT[slot.statImprove] : null

  // Badge for each row
  const getBadge = id => {
    if (id === 'weapon1') return null
    if (isFixed(id)) return { text: 'FREE', variant: 'free' }
    if (id === 'weapon2' && primaryIsTwoHanded) return { text: '2-HANDED', variant: 'full' }
    if (isRowLocked(id)) return { text: 'IP FULL', variant: 'full' }
    if (isRowSelected(id)) return { text: '1 IP', variant: 'spent' }
    return { text: '+1 IP', variant: 'ip' }
  }

  // IP pips
  const pips = Array.from({ length: ipLimit }, (_, i) => i < totalSpent)

  return (
    <div className="lr-section">
      {/* Section header with IP pips */}
      <div className="lr-section-header">
        <span className="lr-section-title">UPGRADES</span>
        <span className="lr-pips">
          {pips.map((filled, i) => (
            <span key={i} className={`lr-ip-pip${filled ? ' lr-pip-filled' : ''}`} />
          ))}
        </span>
        <span className="lr-section-ip">{totalSpent} / {ipLimit} IP</span>
      </div>

      {/* ── WEAPON ── */}
      <LoadoutRow
        icon={SvgWeapon1}
        label="WEAPON"
        value={w1.value}
        pills={w1.pills}
        badge={null}
        badgeVariant={null}
        isOpen={activeRow === 'weapon1'}
        canRemove={false}
        isLocked={false}
        onToggle={() => handleRowClick('weapon1')}
        onRemove={null}
      >
        <WeaponSelector
          slotIndex={slotIndex}
          slot={slot}
          options={getAllowedWeapons(wdata)}
          propKey="weapon1"
          poolFull={poolFull}
          iconSize={28}
        />
      </LoadoutRow>

      {/* ── OFF-HAND ── */}
      {(() => {
        const badge = getBadge('weapon2')
        return (
          <LoadoutRow
            icon={SvgOffhand}
            label={weapon2Label.toUpperCase()}
            value={isDualWield ? 'Dual Wield' : w2.value}
            pills={isDualWield ? ['RNG Contact', 'DMG 1'] : w2.pills}
            badge={badge?.text}
            badgeVariant={badge?.variant}
            isOpen={activeRow === 'weapon2'}
            canRemove={isRowSelected('weapon2') && !weapon2IsFree}
            isLocked={isRowLocked('weapon2')}
            onToggle={() => handleRowClick('weapon2')}
            onRemove={() => removeUpgrade('weapon2')}
          >
            <WeaponSelector
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
          </LoadoutRow>
        )
      })()}

      {/* ── GEAR ── */}
      {(() => {
        const badge = getBadge('climbing')
        return (
          <LoadoutRow
            icon={SvgClimbing}
            label="GEAR"
            value={climbVal}
            pills={climbPills}
            badge={badge?.text}
            badgeVariant={badge?.variant}
            isOpen={activeRow === 'climbing'}
            canRemove={isRowSelected('climbing')}
            isLocked={isRowLocked('climbing')}
            onToggle={() => handleRowClick('climbing')}
            onRemove={() => removeUpgrade('climbing')}
          >
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
                    {CLIMBING_ITEMS[opt] && <span className="upgrade-btn-stats">Max HT {CLIMBING_ITEMS[opt].height}</span>}
                  </span>
                </button>
              ))}
            </div>
            {slot.climbing && CLIMBING_DESCS[slot.climbing] && (
              <div className="upgrade-choice-note">{CLIMBING_DESCS[slot.climbing]}</div>
            )}
          </LoadoutRow>
        )
      })()}

      {/* ── SUPPLY ── */}
      {(() => {
        const badge = getBadge('consumable')
        return (
          <LoadoutRow
            icon={SvgConsumable}
            label="SUPPLY"
            value={slot.consumable || null}
            pills={[]}
            badge={badge?.text}
            badgeVariant={badge?.variant}
            isOpen={activeRow === 'consumable'}
            canRemove={isRowSelected('consumable')}
            isLocked={isRowLocked('consumable')}
            onToggle={() => handleRowClick('consumable')}
            onRemove={() => removeUpgrade('consumable')}
          >
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
          </LoadoutRow>
        )
      })()}

      {/* ── STAT ── */}
      {(() => {
        const badge = getBadge('stat')
        return (
          <LoadoutRow
            icon={SvgStat}
            label="STAT"
            value={statVal}
            pills={[]}
            badge={badge?.text}
            badgeVariant={badge?.variant}
            isOpen={activeRow === 'stat'}
            canRemove={isRowSelected('stat')}
            isLocked={isRowLocked('stat')}
            onToggle={() => handleRowClick('stat')}
            onRemove={() => removeUpgrade('stat')}
          >
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
          </LoadoutRow>
        )
      })()}
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

          {/* Loadout — upgrades + equipment combined */}
          <LoadoutPanel slotIndex={slotIndex} slot={slot} wdata={wdata} poolFull={poolFull} />

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
