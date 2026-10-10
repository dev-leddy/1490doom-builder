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

// A filled loadout slot: icon, full name (wraps, never truncated) and a small meta line
function Tile({ icon, name, fullName, meta = [], onClick, title }) {
  return (
    <button type="button" className="eq-tile" onClick={onClick} title={title}
      aria-label={[fullName, ...meta.map(m => m.text)].join(', ')}>
      <span className="eq-tile-icon" aria-hidden="true">{icon}</span>
      <span className="eq-tile-text" aria-hidden="true">
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

// An empty slot that can still be filled
function AddPill({ label, onClick }) {
  return (
    <button type="button" className="eq-add" onClick={onClick} aria-label={`Add ${label.toLowerCase()}`}>
      <span className="eq-add-plus" aria-hidden="true">+</span>{label}
    </button>
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
  const weaponMeta = (name, d, cat) => [
    cat && { text: cat },
    d?.damage > 0 && { text: `${d.damage} DMG`, cls: 'eq-tile-dmg' },
    d?.range && d.range !== '—' && { text: d.range },
    (HAND[name] || TWO_HANDED.has(name)) && { text: HAND[name] || '2-handed', cls: 'eq-tile-tag' },
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

  // Campaign: all stat improvements share one tile; standard: the single chosen stat
  const statTile = isCampaign
    ? (statImproves.length === 1
        ? { name: STAT_IMPROVEMENT[statImproves[0]], meta: [{ text: 'Stat' }] }
        : statImproves.length > 1
          ? { name: statImproves.join(' · '), full: statImproves.map(k => STAT_IMPROVEMENT[k]).join(', '), meta: [{ text: 'Stats +1' }] }
          : null)
    : (statVal ? { name: statVal, meta: [{ text: 'Stat' }] } : null)

  const canAdd = id => id === 'stat'
    ? (isCampaign ? (!poolFull && !campaignStatFull) : (!isRowSelected('stat') && !isRowLocked('stat')))
    : (!isRowSelected(id) && !isRowLocked(id))
  const ADD_LABELS = { weapon2: 'Off-hand', climbing: 'Gear', consumable: 'Item', stat: 'Stat' }
  const adds = IP_ROW_IDS.filter(canAdd)

  return (
    <div className="lr-section">
      <div className="lr-section-header">
        <span className="lr-section-title">EQUIPMENT & UPGRADES</span>
        <span className="lr-pips lr-ip-summary" title={isCampaign ? `${earnedIP} IP earned by this warrior` : `${ipLeft} IP left in the company budget`}>
          <span>
            {isCampaign ? `${ipSpent} of ${earnedIP} IP spent · ${ipLeft} left` : `${ipSpent} IP spent · ${ipLeft} left`}
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

        {isRowSelected('weapon2') && (
          <Tile
            icon={w2Icon}
            name={shortName(slot.weapon2)}
            fullName={`Off-hand: ${slot.weapon2}`}
            meta={weaponMeta(slot.weapon2, w2d, 'Off-hand')}
            onClick={() => setModalCategory('weapon2')}
            title={slot.weapon2 === 'Light Weapon' && slot.weapon1 === 'Light Weapon' ? `${w2.value}: One-handed. Adds +1 Attack.` : wpnDisplayDesc(slot.weapon2) ? `${w2.value}: ${wpnDisplayDesc(slot.weapon2)}` : w2.value}
          />
        )}

        {isRowSelected('climbing') && (
          <Tile
            icon={ITEM_ICONS[slot.climbing] ? iconImg(ITEM_ICONS[slot.climbing]) : <SvgClimbing />}
            name={climbVal}
            fullName={`Gear: ${climbVal}`}
            meta={[{ text: 'Gear' }]}
            onClick={() => setModalCategory('climbing')}
            title={CLIMBING_DESCS[slot.climbing] ? `${climbVal}: ${CLIMBING_DESCS[slot.climbing]}` : climbVal}
          />
        )}

        {isRowSelected('consumable') && (
          <Tile
            icon={ITEM_ICONS[slot.consumable] ? iconImg(ITEM_ICONS[slot.consumable]) : <SvgConsumable />}
            name={slot.consumable}
            fullName={`Item: ${slot.consumable}`}
            meta={[{ text: 'Item' }]}
            onClick={() => setModalCategory('consumable')}
            title={CONSUMABLES[slot.consumable] ? `${slot.consumable}: ${CONSUMABLES[slot.consumable]}` : slot.consumable}
          />
        )}

        {statTile && (
          <Tile
            icon={<SvgStat />}
            name={statTile.name}
            fullName={`Stat improvement: ${statTile.full || statTile.name}`}
            meta={statTile.meta}
            onClick={() => setModalCategory('stat')}
            title={`Stat improvement: ${statTile.full || statTile.name}`}
          />
        )}
      </div>

      {adds.length > 0 && (
        <div className="eq-adds">
          {adds.map(id => (
            <AddPill key={id} label={ADD_LABELS[id]} onClick={() => setModalCategory(id)} />
          ))}
        </div>
      )}

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
