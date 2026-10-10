import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { STAT_IMPROVEMENT } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
import { SvgWeapon1, SvgOffhand, SvgClimbing, SvgConsumable, SvgStat } from './icons'
import WarriorUpgradeModal from './WarriorUpgradeModal'

const TWO_HANDED = new Set(['Heavy Weapon', 'Polearm (two-handed)', 'Crossbow', 'Bow'])
const IP_ROW_IDS = ['weapon2', 'climbing', 'consumable', 'stat']
const HAND = { 'Polearm (one-handed)': '1-handed', 'Polearm (two-handed)': '2-handed' }
// Polearms show as "Polearm" with the hand count as a tag, so the name never breaks inside brackets
const shortName = n => (HAND[n] ? 'Polearm' : n)

// Every loadout slot is the same fixed-size box in a fixed order, so choosing an item
// only changes the box's content; nothing moves or resizes.
const LONG_NAME = 18 // longer names get a smaller font so they still fit the box

// A filled slot: icon, full name (wraps, never truncated) and stat cells
function Tile({ icon, name, fullName, meta = [], onClick, title }) {
  return (
    <button type="button" className={`eq-slot eq-tile${name.length > LONG_NAME ? ' eq-tile--long' : ''}`} onClick={onClick} title={title}
      aria-label={[fullName, ...meta.map(m => m.aria || m.text)].join(', ')}>
      <span className="eq-slot-icon" aria-hidden="true">{icon}</span>
      <span className="eq-slot-text" aria-hidden="true">
        <span className="eq-tile-name">{name}</span>
        {meta.length > 0 && (
          <span className="eq-tile-meta">
            {meta.map((m, i) => <span key={i} className={m.cls}>{m.text}</span>)}
          </span>
        )}
      </span>
    </button>
  )
}

// An open slot that can be filled: same box, dashed, faded slot icon, "+ GEAR"
function AddSlot({ icon, label, onClick }) {
  return (
    <button type="button" className="eq-slot eq-add" onClick={onClick} aria-label={`Add ${label.toLowerCase()}`}>
      <span className="eq-slot-icon" aria-hidden="true">{icon}</span>
      <span className="eq-slot-text" aria-hidden="true">
        <span className="eq-add-label"><span className="eq-add-plus">+</span>{label}</span>
      </span>
    </button>
  )
}

// The off-hand blocked by a two-handed weapon (while IP is left): same box, disabled
function OffSlot({ icon, label, note, reason }) {
  return (
    <div className="eq-slot eq-slot-off" role="img" aria-label={`${label}: ${reason}`}>
      <span className="eq-slot-icon" aria-hidden="true">{icon}</span>
      <span className="eq-slot-text" aria-hidden="true">
        <span className="eq-add-label">{label}</span>
        <span className="eq-slot-note">{note}</span>
      </span>
    </div>
  )
}

export default function WarriorLoadout({ slotIndex, slot, wdata, poolFull }) {
  const [modalCategory, setModalCategory] = useState(null)
  const { toggleIP, setWarriorProp, companyMode, getMaxIPForSlot, getTotalIPSpent } = useBuilderStore()

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

  const ipSpent = slot.ip?.length || 0
  const earnedIP = slot.earnedIP || 0
  // Standard: what is left of the company budget this warrior can still draw on (same rule as poolFull)
  const ipLeft = isCampaign
    ? Math.max(0, earnedIP - ipSpent)
    : Math.max(0, getMaxIPForSlot(slotIndex) - getTotalIPSpent())

  // Weapon meta line: damage, range, and how many hands it takes
  const weaponMeta = (name, d) => [
    d?.damage > 0 && { text: `${d.damage} DMG`, cls: 'eq-tile-dmg' },
    d?.range && d.range !== '—' && { text: d.range },
    // hands as a short cell (2H / 1H) on the same row; read out in full
    (HAND[name] || TWO_HANDED.has(name)) && { text: (HAND[name] || '2-handed') === '1-handed' ? '1H' : '2H', aria: HAND[name] || '2-handed', cls: 'eq-tile-tag' },
  ].filter(Boolean)

  const iconImg = (src, flip) => (
    <img src={src} alt="" style={{ filter: 'sepia(0.3) brightness(0.95)', opacity: 0.9, ...(flip && { transform: 'scaleX(-1)' }) }} />
  )
  const base = import.meta.env.BASE_URL
  const w1Icon = ITEM_ICONS[slot.weapon1]
    ? iconImg(
        slot.type === 'Beekeeper' ? `${base}assets/icons/scythe.svg`
          : slot.type === 'Brute' && slot.weapon1 === 'Heavy Weapon' ? `${base}assets/icons/wood-club.svg`
          : (slot.type === 'Saboteur' || slot.type === 'Warrior Priest' || slot.type === 'Knight') && slot.weapon1 === 'Light Weapon' ? `${base}assets/icons/flanged-mace.svg`
          : ITEM_ICONS[slot.weapon1],
        slot.weapon1 !== 'Heavy Weapon')
    : <span style={{ display: 'flex', transform: 'scaleX(-1)' }}><SvgWeapon1 /></span>
  const w2Icon = ITEM_ICONS[slot.weapon2]
    ? iconImg(slot.type === 'Knight' && slot.weapon2 === 'Shield' ? `${base}assets/icons/checked-shield.svg` : ITEM_ICONS[slot.weapon2])
    : <SvgOffhand />

  // "Stat Improve" over the chosen stat(s): DEF (campaign: every one, e.g. MOV | COM). No "+1":
  // SKL/DEF/COM improve by going down, so the abbreviation alone reads better
  const chosenStats = isCampaign ? statImproves : (statVal ? [slot.statImprove] : [])
  const statTile = chosenStats.length > 0
    ? {
        name: 'Stat Improve',
        full: chosenStats.map(k => STAT_IMPROVEMENT[k].replace(/ \+1$/, '')).join(', '),
        meta: chosenStats.map(k => ({ text: k })),
      }
    : null

  const canAdd = id => id === 'stat'
    ? (isCampaign ? (!poolFull && !campaignStatFull) : (!isRowSelected('stat') && !isRowLocked('stat')))
    : (!isRowSelected(id) && !isRowLocked(id))
  const SLOT_LABELS = { weapon2: 'Off-hand', climbing: 'Gear', consumable: 'Item', stat: 'Stat' }
  const SLOT_ICONS = { weapon2: <SvgOffhand />, climbing: <SvgClimbing />, consumable: <SvgConsumable />, stat: <SvgStat /> }
  // An open slot: addable, or a disabled box that keeps its place while IP is left.
  // Once all IP is used, open boxes go and only the filled tiles remain.
  const openSlot = id => canAdd(id)
    ? <AddSlot key={id} icon={SLOT_ICONS[id]} label={SLOT_LABELS[id]} onClick={() => setModalCategory(id)} />
    : !poolFull && id === 'weapon2' && primaryIsTwoHanded
      ? <OffSlot key={id} icon={SLOT_ICONS[id]} label={SLOT_LABELS[id]} note="2-handed" reason="not available, the main weapon is two-handed" />
      : null

  return (
    <div className="lr-section">
      <div className="lr-section-header">
        <span className="lr-section-title">EQUIPMENT & UPGRADES</span>
        <span className="lr-pips lr-ip-summary" title={isCampaign ? `${earnedIP} IP earned by this warrior` : `${ipSpent} IP spent on this warrior`}>
          <span>
            {/* Standard: IP is one company pool (left is in the header), so a warrior shows only its own spend */}
            {isCampaign ? `${ipSpent} of ${earnedIP} IP spent · ${ipLeft} left` : ipSpent > 0 ? `${ipSpent} IP` : ''}
          </span>
        </span>
      </div>

      <div className="eq-tiles">
        <Tile
          icon={w1Icon}
          name={shortName(slot.weapon1) || 'None'}
          fullName={`Main weapon: ${slot.weapon1 || 'None'}`}
          meta={slot.weapon1 ? weaponMeta(slot.weapon1, w1d) : []}
          onClick={() => setModalCategory('weapon1')}
          title={wpnDisplayDesc(slot.weapon1) ? `${w1.value}: ${wpnDisplayDesc(slot.weapon1)}` : w1.value}
        />

        {isRowSelected('weapon2') ? (
          <Tile
            icon={w2Icon}
            name={shortName(slot.weapon2)}
            fullName={`Off-hand: ${slot.weapon2}`}
            meta={slot.weapon2 === 'Shield' ? [{ text: 'Guard' }, { text: '+1 DEF' }] : weaponMeta(slot.weapon2, w2d)}
            onClick={() => setModalCategory('weapon2')}
            title={slot.weapon2 === 'Light Weapon' && slot.weapon1 === 'Light Weapon' ? `${w2.value} (off-hand): the second Light Weapon gives +1 Attack.` : wpnDisplayDesc(slot.weapon2) ? `${w2.value}: ${wpnDisplayDesc(slot.weapon2)}` : w2.value}
          />
        ) : openSlot('weapon2')}

        {isRowSelected('climbing') ? (
          <Tile
            icon={ITEM_ICONS[slot.climbing] ? iconImg(ITEM_ICONS[slot.climbing]) : <SvgClimbing />}
            name={climbVal}
            fullName={`Gear: ${climbVal}`}
            meta={[{ text: 'Gear' }]}
            onClick={() => setModalCategory('climbing')}
            title={CLIMBING_DESCS[slot.climbing] ? `${climbVal}: ${CLIMBING_DESCS[slot.climbing]}` : climbVal}
          />
        ) : openSlot('climbing')}

        {isRowSelected('consumable') ? (
          <Tile
            icon={ITEM_ICONS[slot.consumable] ? iconImg(ITEM_ICONS[slot.consumable]) : <SvgConsumable />}
            name={slot.consumable}
            fullName={`Item: ${slot.consumable}`}
            meta={[{ text: 'Item' }]}
            onClick={() => setModalCategory('consumable')}
            title={CONSUMABLES[slot.consumable] ? `${slot.consumable}: ${CONSUMABLES[slot.consumable]}` : slot.consumable}
          />
        ) : openSlot('consumable')}

        {statTile ? (
          <Tile
            icon={<SvgStat />}
            name={statTile.name}
            fullName={`${statTile.name}: ${statTile.full}`}
            meta={statTile.meta}
            onClick={() => setModalCategory('stat')}
            title={`${statTile.name}: ${statTile.full}`}
          />
        ) : openSlot('stat')}
      </div>

      {/* Class restriction: explains what can't be added, so it sits right under the loadout */}
      {wdata?.restrictions && (
        <div className="restriction-note">{wdata.restrictions}</div>
      )}

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
        ipLeft={ipLeft}
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
