import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { STAT_IMPROVEMENT } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
import { SvgWeapon1, SvgOffhand, SvgClimbing, SvgConsumable, SvgStat } from './icons'
import WarriorUpgradeModal from './WarriorUpgradeModal'

const TWO_HANDED = new Set(['Heavy Weapon', 'Polearm (two-handed)', 'Crossbow', 'Bow'])
const IP_ROW_IDS = ['weapon2', 'climbing', 'consumable', 'stat']

export default function WarriorLoadout({ slotIndex, slot, wdata, poolFull }) {
  const [modalCategory, setModalCategory] = useState(null)
  const { toggleIP, setWarriorProp, companyMode, removeStatImprove } = useBuilderStore()

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

  // No IP left to spend: don't show slots that can't be filled
  const hideEmpty = id => poolFull && isRowLocked(id)

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
          {isCampaign ? (
            <span style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.6, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.04em' }}>
              {slot.earnedIP || 0} earned · {ipSpent} spent · {Math.max(0, (slot.earnedIP || 0) - ipSpent)} free
            </span>
          ) : (
            <>
              {ipSpent > 0 && (
                <div style={{display: 'flex', gap: '3px'}}>
                  {Array.from({ length: ipSpent }).map((_, i) => (
                    <span key={i} className="lr-ip-pip lr-pip-filled" />
                  ))}
                </div>
              )}
              <span style={{ fontSize: '0.75rem', color: '#fff', opacity: 0.6, fontFamily: "'Oswald', sans-serif" }}>({ipSpent} IP)</span>
            </>
          )}
        </span>
      </div>

      <div className="eq-chips-list">
        {/* Weapon 1 (Always showing) */}
        <button type="button" className="eq-chip eq-chip-main" onClick={() => setModalCategory('weapon1')} title={wpnDisplayDesc(slot.weapon1) ? `${w1.value}: ${wpnDisplayDesc(slot.weapon1)}` : w1.value}>
          <span className="eq-chip-icon">
            {ITEM_ICONS[slot.weapon1] ? <img src={slot.type === 'Beekeeper' ? `${import.meta.env.BASE_URL}assets/icons/scythe.svg` : slot.type === 'Brute' && slot.weapon1 === 'Heavy Weapon' ? `${import.meta.env.BASE_URL}assets/icons/wood-club.svg` : (slot.type === 'Saboteur' || slot.type === 'Warrior Priest' || slot.type === 'Knight') && slot.weapon1 === 'Light Weapon' ? `${import.meta.env.BASE_URL}assets/icons/flanged-mace.svg` : ITEM_ICONS[slot.weapon1]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, ...(slot.weapon1 !== 'Heavy Weapon' && { transform: 'scaleX(-1)' }) }} /> : <span style={{ display: 'flex', transform: 'scaleX(-1)' }}><SvgWeapon1 /></span>}
          </span>
          <span className="eq-chip-content">
            <span className={`eq-chip-value ${(w1.value?.length > 18) ? 'eq-chip-value--small' : ''}`}>
              {w1.value === 'Polearm (two-handed)' ? <>POLEARM<br/>2-HANDED</> :
               w1.value === 'Polearm (one-handed)' ? <>POLEARM<br/>1-HANDED</> :
               (w1.value || 'None')}
            </span>
          </span>
          {slot.weapon1 && (
            <span className="eq-chip-stats">
              <span className="eq-stat-box">
                {w1d && w1d.damage > 0 && <span className="eq-chip-stat eq-chip-stat--dmg">{w1d.damage} DMG</span>}
              </span>
              <span className="eq-stat-box">
                {w1d && w1d.range && w1d.range !== '—' && <span className="eq-chip-stat">{w1d.range}</span>}
              </span>
            </span>
          )}
        </button>

        {/* Weapon 2 Chip */}
        {isRowSelected('weapon2') ? (
          <button type="button" className="eq-chip" onClick={() => setModalCategory('weapon2')} title={slot.weapon2 === 'Light Weapon' && slot.weapon1 === 'Light Weapon' ? `${w2.value}: One-handed. Adds +1 Attack.` : wpnDisplayDesc(slot.weapon2) ? `${w2.value}: ${wpnDisplayDesc(slot.weapon2)}` : w2.value}>
            {getBadge('weapon2') && <span className={`eq-chip-badge eq-badge-${getBadge('weapon2').variant}`}>{getBadge('weapon2').text}</span>}
            <span className="eq-chip-icon">
              {ITEM_ICONS[slot.weapon2] ? <img src={slot.type === 'Knight' && slot.weapon2 === 'Shield' ? `${import.meta.env.BASE_URL}assets/icons/checked-shield.svg` : ITEM_ICONS[slot.weapon2]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9 }} /> : <SvgOffhand />}
            </span>
            <span className="eq-chip-content">
              <span className={`eq-chip-value ${(w2.value?.length > 18) ? 'eq-chip-value--small' : ''}`}>
                {w2.value === 'Polearm (two-handed)' ? <>POLEARM<br/>2-HANDED</> :
                 w2.value === 'Polearm (one-handed)' ? <>POLEARM<br/>1-HANDED</> :
                 w2.value}
              </span>
            </span>
            {slot.weapon2 && slot.weapon2 !== 'Shield' && (
              <span className="eq-chip-stats">
                <span className="eq-stat-box">
                  {w2d && w2d.damage > 0 && <span className="eq-chip-stat eq-chip-stat--dmg">{w2d.damage} DMG</span>}
                </span>
                <span className="eq-stat-box">
                  {w2d && w2d.range && w2d.range !== '—' && <span className="eq-chip-stat">{w2d.range}</span>}
                </span>
              </span>
            )}
          </button>
        ) : hideEmpty('weapon2') ? null : (
          <button type="button" className={`eq-chip eq-chip-empty ${isRowLocked('weapon2') ? 'eq-chip-locked' : ''}`} onClick={() => !isRowLocked('weapon2') && setModalCategory('weapon2')} aria-disabled={isRowLocked('weapon2') || undefined} title={isRowLocked('weapon2') ? "Locked" : `Empty Secondary`}>
            {getBadge('weapon2') && <span className={`eq-chip-badge eq-badge-${getBadge('weapon2').variant}`}>{getBadge('weapon2').text}</span>}
            <span className="eq-chip-icon"><SvgOffhand /></span>
            <span className="eq-chip-content">
              <span className="eq-chip-value eq-chip-value--empty">Off-hand</span>
            </span>
          </button>
        )}

        {/* Gear Chip */}
        {isRowSelected('climbing') ? (
          <button type="button" className="eq-chip" onClick={() => setModalCategory('climbing')} title={CLIMBING_DESCS[slot.climbing] ? `${climbVal}: ${CLIMBING_DESCS[slot.climbing]}` : climbVal}>
             {getBadge('climbing') && <span className={`eq-chip-badge eq-badge-${getBadge('climbing').variant}`}>{getBadge('climbing').text}</span>}
            <span className="eq-chip-icon">
              {ITEM_ICONS[slot.climbing] ? <img src={ITEM_ICONS[slot.climbing]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9 }} /> : <SvgClimbing />}
            </span>
            <span className="eq-chip-content">
              <span className={`eq-chip-value ${(climbVal?.length > 18) ? 'eq-chip-value--small' : ''}`}>{climbVal}</span>
            </span>
          </button>
        ) : hideEmpty('climbing') ? null : (
          <button type="button" className={`eq-chip eq-chip-empty ${isRowLocked('climbing') ? 'eq-chip-locked' : ''}`} onClick={() => !isRowLocked('climbing') && setModalCategory('climbing')} aria-disabled={isRowLocked('climbing') || undefined} title={isRowLocked('climbing') ? "Locked" : `Empty Gear`}>
            {getBadge('climbing') && <span className={`eq-chip-badge eq-badge-${getBadge('climbing').variant}`}>{getBadge('climbing').text}</span>}
            <span className="eq-chip-icon"><SvgClimbing /></span>
            <span className="eq-chip-content">
              <span className="eq-chip-value eq-chip-value--empty">Gear</span>
            </span>
          </button>
        )}

        {/* Supply Chip */}
        {isRowSelected('consumable') ? (
          <button type="button" className="eq-chip" onClick={() => setModalCategory('consumable')} title={CONSUMABLES[slot.consumable] ? `${slot.consumable}: ${CONSUMABLES[slot.consumable]}` : slot.consumable}>
             {getBadge('consumable') && <span className={`eq-chip-badge eq-badge-${getBadge('consumable').variant}`}>{getBadge('consumable').text}</span>}
            <span className="eq-chip-icon">
              {ITEM_ICONS[slot.consumable] ? <img src={ITEM_ICONS[slot.consumable]} alt="" style={{ width: 28, height: 28, filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9 }} /> : <SvgConsumable />}
            </span>
            <span className="eq-chip-content">
              <span className={`eq-chip-value ${(slot.consumable?.length > 18) ? 'eq-chip-value--small' : ''}`}>{slot.consumable}</span>
            </span>
          </button>
        ) : hideEmpty('consumable') ? null : (
          <button type="button" className={`eq-chip eq-chip-empty ${isRowLocked('consumable') ? 'eq-chip-locked' : ''}`} onClick={() => !isRowLocked('consumable') && setModalCategory('consumable')} aria-disabled={isRowLocked('consumable') || undefined} title={isRowLocked('consumable') ? "Locked" : `Empty Item`}>
            {getBadge('consumable') && <span className={`eq-chip-badge eq-badge-${getBadge('consumable').variant}`}>{getBadge('consumable').text}</span>}
            <span className="eq-chip-icon"><SvgConsumable /></span>
            <span className="eq-chip-content">
              <span className="eq-chip-value eq-chip-value--empty">Item</span>
            </span>
          </button>
        )}

        {/* Stat Chip(s) */}
        {isCampaign ? (
          statImproves.map((stat, i) => (
            <button type="button" key={i} className="eq-chip" onClick={(e) => { e.stopPropagation(); removeStatImprove(slotIndex, stat) }} title={`STAT IMPROVEMENT: ${STAT_IMPROVEMENT[stat]} (Click to Remove)`}>
              <span className="eq-chip-icon"><SvgStat /></span>
              <span className="eq-chip-content">
                <span className={`eq-chip-value ${(STAT_IMPROVEMENT[stat]?.length > 18) ? 'eq-chip-value--small' : ''}`}>{STAT_IMPROVEMENT[stat]}</span>
              </span>
            </button>
          ))
        ) : (
          isRowSelected('stat') && (
            <button type="button" className="eq-chip" onClick={() => setModalCategory('stat')} title={`STAT IMPROVEMENT: ${statVal}`}>
               {getBadge('stat') && <span className={`eq-chip-badge eq-badge-${getBadge('stat').variant}`}>{getBadge('stat').text}</span>}
              <span className="eq-chip-icon"><SvgStat /></span>
              <span className="eq-chip-content">
                <span className={`eq-chip-value ${(statVal?.length > 18) ? 'eq-chip-value--small' : ''}`}>{statVal}</span>
              </span>
            </button>
          )
        )}

        {/* Add a stat improvement: the last slot in the same row */}
        {(isCampaign ? (!poolFull && !campaignStatFull) : (!isRowSelected('stat') && !isRowLocked('stat'))) && (
          <button type="button" className="eq-chip eq-chip-empty eq-add-btn" onClick={() => setModalCategory('stat')} title="Add a stat improvement">
            <span className="eq-chip-icon"><SvgStat /></span>
            <span className="eq-chip-content">
              <span className="eq-chip-value eq-chip-value--empty">Stat</span>
            </span>
          </button>
        )}
      </div>

      <WarriorUpgradeModal
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
