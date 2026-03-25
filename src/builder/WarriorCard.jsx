import React, { useState, useRef } from 'react'
import { useBuilderStore, getAvailableWarriorTypes, getAllowedWeapons, getSecondWeaponOptions } from '../store/builderStore'
import { WARRIORS, STAT_IMPROVEMENT, IP_OPTIONS } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { WARRIOR_IMAGES, ITEM_ICONS } from '../data/images'

function improveStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) - 1) + '+'
  return parseInt(base) + 1
}

function debuffStatDisplay(base, stat) {
  if (stat === 'SKL' || stat === 'DEF' || stat === 'COM') return (parseInt(base) + 1) + '+'
  return Math.max(0, parseInt(base) - 1)
}

const TWO_HANDED = new Set(['Heavy Weapon', 'Polearm (two-handed)', 'Crossbow', 'Bow'])

// ── Inline SVGs ─────────────────────────────────────────────────────────────
const SvgWeapon1 = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="1.2em" height="1.2em">
    <path d="M62.5 17.28c-9.747.288-20.824 5.23-29.844 14.25-15.192 15.193-18.838 36.194-8.125 46.907 7.99 7.988 21.716 8.027 34.47 1.22 16.167 30.05 42.154 57.687 71.438 76.374-18.77 24.156-29.97 54.48-29.97 87.376h18.688c0-28.9 9.828-55.474 26.344-76.53l2.156 39.405C274.5 320.554 402.09 428.196 496.062 494.94c-65.54-95.294-176.99-224.638-288.687-348.407l-38.97-2.124c20.764-15.68 46.638-24.967 74.72-24.97V100.75c-32.2.002-61.945 10.725-85.844 28.78-18.696-29.383-46.39-55.48-76.53-71.686 6.795-12.748 6.796-26.423-1.188-34.407-4.352-4.352-10.393-6.352-17.062-6.156z" />
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

// ── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModal({
  isOpen, onClose, title, category,
  slotIndex, slot, wdata, poolFull,
  removeUpgrade, spendIP, freeIP,
  hasFixedShield, hasFixedDualWield, primaryIsPolearmOne, isDualWield
}) {
  const { setWarriorProp, addStatImprove } = useBuilderStore()
  const companyMode = useBuilderStore(s => s.companyMode)

  if (!isOpen) return null

  const isFixed = category === 'weapon2' && (hasFixedShield || hasFixedDualWield || primaryIsPolearmOne)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box upgrade-modal">
        <div className="upgrade-modal-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div className="modal-title" style={{ margin: 0, paddingRight: '1rem' }}>{title.toUpperCase()}</div>
          <button className="upgrade-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="upgrade-modal-body">
          {category === 'weapon2' && (
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
              iconSize={32}
              onSelect={newVal => {
                if (!isFixed) {
                  if (newVal) spendIP('weapon2')
                  else freeIP('weapon2')
                }
                onClose()
              }}
            />
          )}

          {category === 'climbing' && (
            <div className="upgrade-table">
              {Object.keys(CLIMBING_ITEMS).filter(k => k !== 'None').map(opt => {
                const cd = CLIMBING_ITEMS[opt]
                return (
                  <button
                    key={opt}
                    className={`upgrade-table-btn ${slot.climbing === opt ? 'active' : ''}`}
                    onClick={() => {
                      const newVal = slot.climbing === opt ? null : opt
                      setWarriorProp(slotIndex, 'climbing', newVal)
                      if (newVal) spendIP('climbing')
                      else freeIP('climbing')
                      onClose()
                    }}
                  >
                    <div className="item-tier-1">
                      {ITEM_ICONS[opt] && <img src={ITEM_ICONS[opt]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', flexShrink: 0 }} />}
                      <div className="item-name">{opt}</div>
                    </div>
                    <div className="item-tier-2">
                       <div className="item-stat-wrap">
                         <span className="stat-label">Height</span>
                         <span className="stat-val">{cd?.height || '—'}</span>
                       </div>
                       <div className="item-stat-wrap">
                         <span className="stat-label">Skill</span>
                         <span className="stat-val">{cd?.skillCheck || '—'}</span>
                       </div>
                       <div className="item-info">{CLIMBING_DESCS[opt] || 'None'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {category === 'consumable' && (
            <div className="upgrade-table">
              {CONSUMABLE_NAMES.map(opt => (
                <button
                  key={opt}
                  className={`upgrade-table-btn ${slot.consumable === opt ? 'active' : ''}`}
                  onClick={() => {
                    const newVal = slot.consumable === opt ? null : opt
                    setWarriorProp(slotIndex, 'consumable', newVal)
                    if (newVal) spendIP('consumable')
                    else freeIP('consumable')
                    onClose()
                  }}
                >
                  <div className="item-tier-1">
                    {ITEM_ICONS[opt] && <img src={ITEM_ICONS[opt]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', flexShrink: 0 }} />}
                    <div className="item-name">{opt}</div>
                  </div>
                  <div className="item-tier-2 item-tier-2--full">
                    <div className="item-info" style={{ borderLeft: 'none', paddingLeft: 0 }}>
                      {CONSUMABLES[opt] || 'None'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {category === 'stat' && companyMode === 'campaign' && (
            <div className="upgrade-choice-grid">
              {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => {
                const taken = slot.statImproves?.includes(k)
                return (
                  <button
                    key={k}
                    className={`upgrade-choice-btn ${taken ? 'active' : ''}`}
                    disabled={taken}
                    onClick={() => {
                      if (!taken) { addStatImprove(slotIndex, k); onClose() }
                    }}
                  >
                    {v}
                    {taken && <span style={{ display: 'block', fontSize: '0.65em', opacity: 0.6 }}>Taken</span>}
                  </button>
                )
              })}
            </div>
          )}
          {category === 'stat' && companyMode !== 'campaign' && (
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
                    onClose()
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {category === 'weapon1' && (
            <WeaponSelector
              slotIndex={slotIndex}
              slot={slot}
              options={getAllowedWeapons(wdata)}
              propKey="weapon1"
              poolFull={poolFull}
              iconSize={32}
              onSelect={() => onClose()}
            />
          )}

        </div>
        {category !== 'weapon1' && ((category === 'weapon2' && slot.weapon2 && !isFixed) || (category === 'climbing' && slot.climbing && slot.climbing !== 'None') || (category === 'consumable' && slot.consumable) || (category === 'stat' && slot.statImprove)) && (
          <div className="upgrade-modal-remove-wrap">
            <button className="btn btn-ghost" onClick={() => { removeUpgrade(category); onClose() }}>
              Remove Upgrade
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Loadout Panel (Chips UI) ──────────────────────────────────────────────────
const IP_ROW_IDS = ['weapon2', 'climbing', 'consumable', 'stat']

function LoadoutPanel({ slotIndex, slot, wdata, poolFull }) {
  const [modalCategory, setModalCategory] = useState(null)
  const { toggleIP, setWarriorProp, getTotalIPSpent, ipLimit, companyMode, addStatImprove, removeStatImprove } = useBuilderStore()
  const totalSpent = getTotalIPSpent()

  const hasFixedShield    = wdata?.fixedShield || false
  const hasFixedDualWield = wdata?.fixedDualWield || false
  const primaryIsTwoHanded  = TWO_HANDED.has(slot.weapon1)
  const primaryIsPolearmOne = slot.weapon1 === 'Polearm (one-handed)'

  const isFixed  = id => id === 'weapon2' && (hasFixedShield || hasFixedDualWield || primaryIsPolearmOne)

  const isCampaign = companyMode === 'campaign'
  const statImproves = slot.statImproves || []
  const allStatKeys = Object.keys(STAT_IMPROVEMENT)
  const campaignStatFull = statImproves.length >= allStatKeys.length

  const isRowSelected = id => {
    if (id === 'weapon2')    return !!slot.weapon2
    if (id === 'climbing')   return !!slot.climbing && slot.climbing !== 'None'
    if (id === 'consumable') return !!slot.consumable
    if (id === 'stat')       return isCampaign ? statImproves.length > 0 : (!!slot.statImprove && slot.ip?.includes('stat'))
    return false
  }

  const isRowLocked = id => {
    if (id === 'weapon2') {
      if (isFixed(id))         return false
      if (primaryIsTwoHanded)  return true
      return !isRowSelected(id) && poolFull
    }
    if (id === 'stat' && isCampaign) return poolFull || campaignStatFull
    if (IP_ROW_IDS.includes(id)) return !isRowSelected(id) && poolFull
    return false
  }

  const spendIP = id => { if (!slot.ip?.includes(id) && !poolFull) toggleIP(slotIndex, id, true) }
  const freeIP  = id => { if (slot.ip?.includes(id)) toggleIP(slotIndex, id, false) }

  const removeUpgrade = id => {
    if (id === 'climbing')   setWarriorProp(slotIndex, 'climbing',    null)
    if (id === 'consumable') setWarriorProp(slotIndex, 'consumable',  null)
    if (id === 'stat')       setWarriorProp(slotIndex, 'statImprove', null)
    if (id === 'weapon2')    setWarriorProp(slotIndex, 'weapon2',     null)
    freeIP(id)
  }

  const weapon2Label  = 'Off-hand'
  const weapon2IsFree = hasFixedShield || hasFixedDualWield

  const wpnDisplayDesc = wname => {
    if (!wname) return null
    const wd = WEAPONS[wname]
    if (!wd) return null
    const parts = []
    if (wd.note) parts.push(wd.note)
    if (wd.special) parts.push(wd.special)
    return parts.join(' ') || null
  }

  const wpnDisplay = wname => {
    if (!wname) return { value: null, pills: [] }
    const wd = WEAPONS[wname]
    const pills = []
    if (wd?.range && wd.range !== '—') pills.push(`RNG ${wd.range}`)
    if (wd?.damage > 0) pills.push(`DMG ${wd.damage}`)
    return { value: wname, pills }
  }

  const w1d = WEAPONS[slot.weapon1]
  const w2d = WEAPONS[slot.weapon2]
  const w1 = wpnDisplay(slot.weapon1)
  const w2 = wpnDisplay(slot.weapon2)
  const isDualWield = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'

  const climbVal = (slot.climbing && slot.climbing !== 'None') ? slot.climbing : null
  const climbPills = climbVal
    ? (() => { const cd = CLIMBING_ITEMS[climbVal]; return cd ? [`HT ${cd.height}`, `SKILL ${cd.skillCheck}`] : [] })()
    : []

  const statVal = (slot.statImprove && slot.ip?.includes('stat')) ? STAT_IMPROVEMENT[slot.statImprove] : null

  const getBadge = id => {
    if (id === 'weapon1') return null
    if (isFixed(id)) return null
    if (id === 'weapon2' && primaryIsTwoHanded) return { text: '2-HANDED', variant: 'full' }
    if (isRowLocked(id)) return { text: 'IP FULL', variant: 'full' }
    return null
  }

  const ipSpent = slot.ip?.length || 0

  return (
    <div className="lr-section">
      <div className="lr-section-header">
        <span className="lr-section-title">EQUIPMENT & UPGRADES</span>
        <span className="lr-pips" style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
          {ipSpent > 0 && (
            <div style={{display: 'flex', gap: '3px'}}>
              {Array.from({ length: ipSpent }).map((_, i) => (
                <span key={i} className="lr-ip-pip lr-pip-filled" />
              ))}
            </div>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--mist)', fontFamily: "'Oswald', sans-serif" }}>({ipSpent} IP)</span>
        </span>
      </div>

      <div className="eq-chips-list">
        {/* Weapon 1 (Always showing) */}
        <div className="eq-chip eq-chip-main" onClick={() => setModalCategory('weapon1')} title={wpnDisplayDesc(slot.weapon1) ? `${w1.value}: ${wpnDisplayDesc(slot.weapon1)}` : w1.value}>
          <div className="eq-chip-icon">
            {ITEM_ICONS[slot.weapon1] ? <img src={ITEM_ICONS[slot.weapon1]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, transform: 'scaleX(-1)' }} /> : <span style={{ display: 'flex', transform: 'scaleX(-1)' }}><SvgWeapon1 /></span>}
          </div>
          <div className="eq-chip-content">
            <span className={`eq-chip-value ${(w1.value?.length > 18) ? 'eq-chip-value--small' : ''}`}>
              {w1.value === 'Polearm (two-handed)' ? <>POLEARM<br/>2-HANDED</> : 
               w1.value === 'Polearm (one-handed)' ? <>POLEARM<br/>1-HANDED</> : 
               (w1.value || 'None')}
            </span>
          </div>
          {slot.weapon1 && (
            <div className="eq-chip-stats">
              <div className="eq-stat-box">
                {w1d && w1d.damage > 0 && <span className="eq-chip-stat eq-chip-stat--dmg">{w1d.damage} DMG</span>}
              </div>
              <div className="eq-stat-box">
                {w1d && w1d.range && w1d.range !== '—' && <span className="eq-chip-stat">{w1d.range}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Weapon 2 Chip */}
        {isRowSelected('weapon2') ? (
          <div className="eq-chip" onClick={() => setModalCategory('weapon2')} title={slot.weapon2 === 'Light Weapon' && slot.weapon1 === 'Light Weapon' ? `${w2.value}: One-handed. Adds +1 Attack.` : wpnDisplayDesc(slot.weapon2) ? `${w2.value}: ${wpnDisplayDesc(slot.weapon2)}` : w2.value}>
            {getBadge('weapon2') && <span className={`eq-chip-badge eq-badge-${getBadge('weapon2').variant}`}>{getBadge('weapon2').text}</span>}
            <div className="eq-chip-icon">
              {ITEM_ICONS[slot.weapon2] ? <img src={ITEM_ICONS[slot.weapon2]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9 }} /> : <SvgOffhand />}
            </div>
            <div className="eq-chip-content">
              <span className={`eq-chip-value ${(w2.value?.length > 18) ? 'eq-chip-value--small' : ''}`}>
                {w2.value === 'Polearm (two-handed)' ? <>POLEARM<br/>2-HANDED</> : 
                 w2.value === 'Polearm (one-handed)' ? <>POLEARM<br/>1-HANDED</> : 
                 w2.value}
              </span>
            </div>
            {slot.weapon2 && slot.weapon2 !== 'Shield' && (
              <div className="eq-chip-stats">
                <div className="eq-stat-box">
                  {w2d && w2d.damage > 0 && <span className="eq-chip-stat eq-chip-stat--dmg">{w2d.damage} DMG</span>}
                </div>
                <div className="eq-stat-box">
                  {w2d && w2d.range && w2d.range !== '—' && <span className="eq-chip-stat">{w2d.range}</span>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`eq-chip eq-chip-empty ${isRowLocked('weapon2') ? 'eq-chip-locked' : ''}`} onClick={() => !isRowLocked('weapon2') && setModalCategory('weapon2')} title={isRowLocked('weapon2') ? "Locked" : `Empty Secondary`}>
            {getBadge('weapon2') && <span className={`eq-chip-badge eq-badge-${getBadge('weapon2').variant}`}>{getBadge('weapon2').text}</span>}
            <div className="eq-chip-icon" style={{ opacity: 0.3 }}><SvgOffhand /></div>
            <div className="eq-chip-content">
              <span className="eq-chip-value" style={{ color: 'var(--mist)' }}>Empty</span>
            </div>
          </div>
        )}

        {/* Gear Chip */}
        {isRowSelected('climbing') ? (
          <div className="eq-chip" onClick={() => setModalCategory('climbing')} title={CLIMBING_DESCS[slot.climbing] ? `${climbVal}: ${CLIMBING_DESCS[slot.climbing]}` : climbVal}>
             {getBadge('climbing') && <span className={`eq-chip-badge eq-badge-${getBadge('climbing').variant}`}>{getBadge('climbing').text}</span>}
            <div className="eq-chip-icon">
              {ITEM_ICONS[slot.climbing] ? <img src={ITEM_ICONS[slot.climbing]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9 }} /> : <SvgClimbing />}
            </div>
            <div className="eq-chip-content">
              <span className={`eq-chip-value ${(climbVal?.length > 18) ? 'eq-chip-value--small' : ''}`}>{climbVal}</span>
            </div>
          </div>
        ) : (
          <div className={`eq-chip eq-chip-empty ${isRowLocked('climbing') ? 'eq-chip-locked' : ''}`} onClick={() => !isRowLocked('climbing') && setModalCategory('climbing')} title={isRowLocked('climbing') ? "Locked" : `Empty Gear`}>
            {getBadge('climbing') && <span className={`eq-chip-badge eq-badge-${getBadge('climbing').variant}`}>{getBadge('climbing').text}</span>}
            <div className="eq-chip-icon" style={{ opacity: 0.3 }}><SvgClimbing /></div>
            <div className="eq-chip-content">
              <span className="eq-chip-value" style={{ color: 'var(--mist)' }}>Empty</span>
            </div>
          </div>
        )}

        {/* Supply Chip */}
        {isRowSelected('consumable') ? (
          <div className="eq-chip" onClick={() => setModalCategory('consumable')} title={CONSUMABLES[slot.consumable] ? `${slot.consumable}: ${CONSUMABLES[slot.consumable]}` : slot.consumable}>
             {getBadge('consumable') && <span className={`eq-chip-badge eq-badge-${getBadge('consumable').variant}`}>{getBadge('consumable').text}</span>}
            <div className="eq-chip-icon">
              {ITEM_ICONS[slot.consumable] ? <img src={ITEM_ICONS[slot.consumable]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9 }} /> : <SvgConsumable />}
            </div>
            <div className="eq-chip-content">
              <span className={`eq-chip-value ${(slot.consumable?.length > 18) ? 'eq-chip-value--small' : ''}`}>{slot.consumable}</span>
            </div>
          </div>
        ) : (
          <div className={`eq-chip eq-chip-empty ${isRowLocked('consumable') ? 'eq-chip-locked' : ''}`} onClick={() => !isRowLocked('consumable') && setModalCategory('consumable')} title={isRowLocked('consumable') ? "Locked" : `Empty Item`}>
            {getBadge('consumable') && <span className={`eq-chip-badge eq-badge-${getBadge('consumable').variant}`}>{getBadge('consumable').text}</span>}
            <div className="eq-chip-icon" style={{ opacity: 0.3 }}><SvgConsumable /></div>
            <div className="eq-chip-content">
              <span className="eq-chip-value" style={{ color: 'var(--mist)' }}>Empty</span>
            </div>
          </div>
        )}

        {/* Stat Chip(s) */}
        {isCampaign ? (
          statImproves.map((stat, i) => (
            <div key={i} className="eq-chip" onClick={(e) => { e.stopPropagation(); removeStatImprove(slotIndex, stat) }} title={`STAT IMPROVEMENT: ${STAT_IMPROVEMENT[stat]} (Click to Remove)`}>
              <div className="eq-chip-icon"><SvgStat /></div>
              <div className="eq-chip-content">
                <span className={`eq-chip-value ${(STAT_IMPROVEMENT[stat]?.length > 18) ? 'eq-chip-value--small' : ''}`}>{STAT_IMPROVEMENT[stat]}</span>
              </div>
            </div>
          ))
        ) : (
          isRowSelected('stat') && (
            <div className="eq-chip" onClick={() => setModalCategory('stat')} title={`STAT IMPROVEMENT: ${statVal}`}>
               {getBadge('stat') && <span className={`eq-chip-badge eq-badge-${getBadge('stat').variant}`}>{getBadge('stat').text}</span>}
              <div className="eq-chip-icon"><SvgStat /></div>
              <div className="eq-chip-content">
                <span className={`eq-chip-value ${(statVal?.length > 18) ? 'eq-chip-value--small' : ''}`}>{statVal}</span>
              </div>
            </div>
          )
        )}
      </div>

      {(isCampaign ? (!poolFull && !campaignStatFull) : (!isRowSelected('stat') && !isRowLocked('stat'))) && (
        <div className="eq-add-row">
          {isCampaign ? (
            <button className="eq-add-btn" onClick={() => setModalCategory('stat')}>
              <span className="lr-icon"><SvgStat /></span>
              <span>Stat</span>
            </button>
          ) : (
            <button className="eq-add-btn" onClick={() => setModalCategory('stat')}>
              <span className="lr-icon"><SvgStat /></span>
              <span>Stat</span>
            </button>
          )}
        </div>
      )}

      <UpgradeModal
        isOpen={!!modalCategory}
        category={modalCategory}
        title={
          modalCategory === 'weapon1' ? 'Select Weapon' :
          modalCategory === 'weapon2' ? `Select ${weapon2Label}` :
          modalCategory === 'climbing' ? 'Select Gear' :
          modalCategory === 'consumable' ? 'Select Item' :
          modalCategory === 'stat' ? 'Select Stat Upgrade' : ''
        }
        onClose={() => setModalCategory(null)}
        slotIndex={slotIndex}
        slot={slot}
        wdata={wdata}
        poolFull={poolFull}
        removeUpgrade={removeUpgrade}
        spendIP={spendIP}
        freeIP={freeIP}
        hasFixedShield={hasFixedShield}
        hasFixedDualWield={hasFixedDualWield}
        primaryIsPolearmOne={primaryIsPolearmOne}
        isDualWield={isDualWield}
      />
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

  const companyMode = useBuilderStore(s => s.companyMode)
  const wdata = slot.type ? WARRIORS[slot.type] : null
  const available = getAvailableWarriorTypes(slotIndex, allSlots)
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
          {editingName ? (
            <input
              className="slot-name-input"
              autoFocus
              value={slot.customName || ''}
              placeholder="Enter Name…"
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
              {slot.customName || ""}
            </span>
          )}
        </div>
        {companyMode === 'campaign' && slot.type && (
          <span className="warrior-campaign-ip">
            {slot.earnedIP || 0} earned · {slot.ip?.length || 0} spent · {Math.max(0, (slot.earnedIP || 0) - (slot.ip?.length || 0))} free
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', marginBottom: '1rem' }}>
        {slot.type && (
          <button
            className={`captain-toggle ${slot.isCaptain ? 'is-captain' : ''}`}
            style={{ fontSize: '1.6rem', background: 'none', border: 'none', padding: 0, marginTop: 0, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setCaptain(slotIndex)}
            title={slot.isCaptain ? 'Captain' : 'Set as Captain'}
          >★</button>
        )}
        <select
          className="warrior-select"
          style={{ marginBottom: 0 }}
          value={slot.type || ''}
          onChange={e => selectWarrior(slotIndex, e.target.value || null)}
        >
          <option value="">— Choose Warrior —</option>
          {available.map(wt => <option key={wt} value={wt}>{wt}</option>)}
          {slot.type && !available.includes(slot.type) && (
            <option value={slot.type}>{slot.type}</option>
          )}
        </select>
      </div>

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
          {allAbilities.length > 0 && (
            <div className="lr-section-header" style={{ marginTop: '1rem', marginBottom: '0.4rem' }}>
              <span className="lr-section-title">ABILITIES</span>
            </div>
          )}
          {allAbilities.length > 0 && (
            <div className="bd-abilities">
              {allAbilities.map((ab, i) => (
                <div key={i} className="bd-ability">
                  <span className="bd-ability-name">
                    {ab.name}
                    {ab.source && <span style={{fontSize: '0.85em', opacity: 0.7, fontWeight: 'normal', marginLeft: '0.4rem'}}>({ab.source})</span>}
                  </span>
                  <div className="bd-ability-desc">{ab.desc}</div>
                </div>
              ))}
            </div>
          )}

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
  const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
  const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0

  return (
    <div className="stats-row">
      {['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM'].map(s => {
        let base = wdata.stats[s]
        const improved = (slot.ip?.includes('stat') && slot.statImprove === s) || (slot.statImproves?.includes(s))
        const polearmDebuff = slot.weapon1 === 'Polearm (one-handed)' && s === 'COM'
        
        // Apply dual wield bonus to ATK
        if (s === 'ATK') {
          base = parseInt(base) + dualWieldBonus
        }

        let displayVal = base
        if (improved) displayVal = improveStatDisplay(base, s)
        else if (polearmDebuff) displayVal = debuffStatDisplay(base, s)

        let statClass = ''
        if (improved || (s === 'ATK' && dualWieldBonus > 0)) statClass = 'modified'
        else if (polearmDebuff) statClass = 'debuffed'

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

function StatDisplay({ label, val, isDmg = false }) {
  if (!val || val === '—') return null
  return (
    <div className={`upgrade-mini-stat ${isDmg ? 'stat-dmg' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-val">{val}</span>
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
    <div className="upgrade-table">
      {options.map(wn => {
        const wd = WEAPONS[wn]
        const ic = ITEM_ICONS[wn]
        const isPolearmOneHand = wn === 'Polearm (one-handed)'
        const needsIP = isPolearmOneHand && current !== wn && poolFull && !slot.ip?.includes('weapon2')
        const infoLine = [propKey === 'weapon2' && wd?.offhandNote ? wd.offhandNote : wd?.note, wd?.special].filter(Boolean).join(' ')
        
        return (
          <button
            key={wn}
            className={`upgrade-table-btn ${current === wn ? 'active' : ''}`}
            disabled={needsIP}
            onClick={() => {
              if (needsIP) return
              const newVal = wn === 'None' ? null : wn
              setWarriorProp(slotIndex, propKey, newVal)
              onSelect?.(newVal)
            }}
          >
            <div className="item-tier-1">
              {ic && <img src={ic} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', flexShrink: 0 }} />}
              <div className="item-name">
                {wn === 'Polearm (two-handed)' ? <>POLEARM<br/>2-HANDED</> :
                 wn === 'Polearm (one-handed)' ? <>POLEARM<br/>1-HANDED</> :
                 wn}
              </div>
              {needsIP && <div className="polearm-ip-note" style={{ fontSize: '0.65rem', marginLeft: '0.5rem' }}>+1 IP</div>}
            </div>

            <div className="item-tier-2">
              {wn === 'Shield' ? (
                <div className="item-info item-info--full">
                  Gain +1 DEFENSE against the first attack each round. Grants the Guarded Ability.{' '}
                  <em>(Once per round, the model may use their shield to prevent a PUSH action that targets them.)</em>
                </div>
              ) : (
                <>
                  <div className="item-stat-wrap">
                    <span className="stat-label">Damage</span>
                    <span className={`stat-val ${wd?.damage > 0 ? 'dmg' : ''}`}>{wd?.damage || '—'}</span>
                  </div>

                  <div className="item-stat-wrap">
                    <span className="stat-label">Range</span>
                    <span className="stat-val">{wd?.range && wd.range !== '—' ? wd.range : '—'}</span>
                  </div>

                  <div className="item-info">
                    {infoLine || 'None'}
                  </div>
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
