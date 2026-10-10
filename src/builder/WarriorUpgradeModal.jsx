import { useState } from 'react'
import { useBuilderStore, getAllowedWeapons, getSecondWeaponOptions } from '../store/builderStore'
import { STAT_IMPROVEMENT, WARRIORS } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
import { getEffectiveStats } from '../utils/stats'
import BottomSheet from '../shared/BottomSheet'
import './styles/builder-picker.css'

// ── Shared option card ───────────────────────────────────────────────────────
// One choice in a picker sheet: icon, name (+ sub-line), stat pills, a status chip
// (equipped / locked), the rules text and an optional note. The whole card is the button.
function PickCard({ icon, name, sub, pills = [], status, statusTone, desc, ability, note, active, locked, onClick }) {
  return (
    <button
      type="button"
      className={`pk-card${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
      disabled={locked}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="pk-icon">{icon && <img src={icon} alt="" width={30} height={30} />}</span>
      <span className="pk-main">
        <span className="pk-head">
          <span className="pk-name">
            {name}
            {sub && <span className="pk-name-sub">{sub}</span>}
          </span>
          {status && <span className={`pk-status${statusTone ? ` pk-status--${statusTone}` : ''}`}>{status}</span>}
        </span>
        {pills.length > 0 && (
          <span className="pk-pills">
            {pills.map(p => <span key={p.text} className={`pk-pill${p.tone ? ` pk-pill--${p.tone}` : ''}`}>{p.text}</span>)}
          </span>
        )}
        {desc && <span className="pk-desc">{desc}</span>}
        {ability && (
          <span className="pk-ability">
            <span className="pk-ability-name">{ability.name}</span>
            <span className="pk-ability-desc">{ability.desc}</span>
          </span>
        )}
        {note && <span className="pk-note">{note}</span>}
      </span>
    </button>
  )
}

// "Polearm (two-handed)" → name "Polearm", sub-line "Two-handed"
function splitName(name) {
  const m = /^(.*) \((.*)\)$/.exec(name)
  return m ? { name: m[1], sub: m[2].charAt(0).toUpperCase() + m[2].slice(1) } : { name, sub: null }
}

// Short line at the top of a sheet: what this slot is and what it costs
function PickIntro({ label, children }) {
  return (
    <p className="pk-intro">
      <span className="pk-intro-label">{label}</span>
      {children}
    </p>
  )
}

// ── Weapon Selector ───────────────────────────────────────────────────────────
function WeaponSelector({ slotIndex, slot, options, propKey, poolFull, onSelect }) {
  const setWarriorProp = useBuilderStore(s => s.setWarriorProp)
  const current = slot[propKey]
  const fixedShield = !!WARRIORS[slot.type]?.fixedShield

  return (
    <div className="pk-list">
      {options.map(wn => {
        const wd = WEAPONS[wn]
        const isPolearmOneHand = wn === 'Polearm (one-handed)'
        // A one-handed polearm brings a Shield, which costs 1 IP unless already paid for
        const shieldCost = isPolearmOneHand && current !== wn && !slot.ip?.includes('weapon2') && !fixedShield
        const needsIP = isPolearmOneHand && current !== wn && poolFull && !slot.ip?.includes('weapon2')
        const isShield = wn === 'Shield'
        const desc = isShield ? wd?.note : [propKey === 'weapon2' && wd?.offhandNote ? wd.offhandNote : wd?.note, wd?.special].filter(Boolean).join(' ')
        const pills = []
        if (wd?.damage > 0) pills.push({ text: `DMG ${wd.damage}`, tone: 'dmg' })
        if (wd?.range && wd.range !== '—') pills.push({ text: `RNG ${wd.range}` })
        if (shieldCost && !needsIP) pills.push({ text: '+1 IP', tone: 'cost' })
        const { name, sub } = splitName(wn)

        return (
          <PickCard
            key={wn}
            icon={ITEM_ICONS[wn]}
            name={name}
            sub={sub}
            pills={pills}
            status={current === wn ? '✓ Equipped' : needsIP ? '+1 IP' : null}
            statusTone={needsIP ? 'locked' : null}
            desc={desc}
            ability={isShield && wd?.abilityName ? { name: wd.abilityName, desc: wd.abilityDesc } : null}
            note={needsIP ? 'Comes with a Shield for 1 IP · no IP left' : null}
            active={current === wn}
            locked={needsIP}
            onClick={() => {
              if (needsIP) return
              const newVal = wn === 'None' ? null : wn
              setWarriorProp(slotIndex, propKey, newVal)
              onSelect?.(newVal)
            }}
          />
        )
      })}
    </div>
  )
}

// ── Stat Improve sheet ────────────────────────────────────────────────────────
// Five stats (ATK can't be improved), tiles reading "MOV / Movement" (no "+1": SKL/DEF/COM
// improve by going down). Tapping a stat selects it and shows what changes at the bottom,
// above the buttons (value, and for check stats the chance per roll). Nothing is applied
// until the footer button: "Choose Combat" (standard, 1 IP) or "Take ..." (campaign,
// several at once, permanent). Campaign taken stats are settled boxes, not buttons.
const STAT_INFO = {
  MOV: { name: 'Movement', role: 'Inches moved with each MOVE action.' },
  VIT: { name: 'Vitality', role: 'Total hits before the warrior dies.' },
  SKL: { name: 'Skill', role: 'Roll needed to climb, jump, open doors and search caches.' },
  DEF: { name: 'Defense', role: 'Roll needed to block damage.' },
  COM: { name: 'Combat', role: 'Roll needed to hit when attacking.' },
}
const listJoin = a => a.length < 3 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`
// Chance to roll the target or better on a d6 ("4+" is 50%)
const odds = target => `${Math.round(((7 - Math.max(2, target)) / 6) * 100)}%`

function StatDetail({ k, from, to }) {
  const info = STAT_INFO[k]
  const check = String(from.display).endsWith('+')
  return (
    <div className="pk-stat-detail" data-stat={k}>
      <div className="pk-stat-detail-head">
        <span className="pk-stat-detail-name">{info.name}</span>
        <span className="pk-stat-detail-change">
          <span className="pk-stat-detail-from">{from.display}</span> to <span className="pk-stat-detail-to">{to.display}</span>
        </span>
      </div>
      {check && (
        <div className="pk-stat-detail-odds">
          Chance per roll: <span className="pk-stat-detail-from">{odds(from.value)}</span> to <span className="pk-stat-detail-to">{odds(to.value)}</span>
        </div>
      )}
      <div className="pk-stat-detail-role">{info.role}</div>
    </div>
  )
}

function StatImproveSheet({ slotIndex, slot, poolFull, ipLeft, removeUpgrade, spendIP, onClose }) {
  const setWarriorProp = useBuilderStore(s => s.setWarriorProp)
  const addStatImprove = useBuilderStore(s => s.addStatImprove)
  const campaign = useBuilderStore(s => s.companyMode) === 'campaign'
  const allSlots = useBuilderStore(s => s.slots)
  const chosen = !campaign && slot.ip?.includes('stat') ? slot.statImprove : null
  // Standard: the one selected stat (starts on the chosen one). Campaign: the stats to take.
  const [selected, setSelected] = useState(() => chosen ? [chosen] : [])

  const taken = campaign ? (slot.statImproves || []) : []
  const pending = campaign ? selected : []
  const left = Math.max(0, ipLeft - pending.length)
  const now = getEffectiveStats(slot)
  if (!now) return null

  // The stat's value without and with +1 on it
  const preview = k => {
    const without = campaign ? { ...slot, statImproves: taken.filter(s => s !== k) }
      : chosen === k ? { ...slot, statImprove: null } : slot
    const withIt = campaign ? { ...slot, statImproves: [...taken.filter(s => s !== k), k] }
      : { ...slot, statImprove: k, ip: [...new Set([...(slot.ip || []), 'stat'])] }
    return [getEffectiveStats(without)[k], getEffectiveStats(withIt)[k]]
  }

  const pick = k => setSelected(sel => campaign
    ? (sel.includes(k) ? sel.filter(s => s !== k) : [...sel, k])
    : (sel[0] === k && k !== chosen ? (chosen ? [chosen] : []) : [k]))
  const apply = () => {
    if (campaign) selected.forEach(k => addStatImprove(slotIndex, k))
    else {
      setWarriorProp(slotIndex, 'statImprove', selected[0])
      spendIP('stat')
    }
    onClose()
  }
  const cancel = () => setSelected(chosen ? [chosen] : [])

  // Standard: the last IP may be held back for a captain who hasn't spent any yet
  const captain = allSlots.find(s => s.isCaptain)
  const heldForCaptain = !campaign && !slot.isCaptain && captain && !(captain.ip?.length > 0) &&
    useBuilderStore.getState().getTotalIPSpent() < useBuilderStore.getState().ipLimit
  const canAddNew = campaign ? left > 0 : (!!chosen || !poolFull)
  const why = canAddNew || pending.length ? null
    : campaign ? 'No IP left. Warriors earn IP at the end of a game.'
    : heldForCaptain ? 'No IP left. 1 IP is held for the captain.'
    : 'No IP left.'
  const names = selected.map(k => STAT_INFO[k]?.name || k)
  const shown = selected.at(-1)   // details for the last tapped stat
  const toApply =campaign ? selected.length > 0 : (selected.length > 0 && selected[0] !== chosen)

  return (
    <BottomSheet
      title="STAT IMPROVE"
      onClose={onClose}
      zIndex={1100}
      footer={
        <div className="pk-stat-foot">
          {/* Like the Mark picker: what the selection does sits at the bottom, above the buttons */}
          {shown && (
            <div className="pk-stat-details" aria-live="polite">
              <StatDetail k={shown} from={preview(shown)[0]} to={preview(shown)[1]} />
              {pending.length > 0 && (
                <p className="pk-stat-confirm">
                  <b>Permanent.</b> {listJoin(names)} {pending.length > 1 ? 'improvements stay' : 'improvement stays'} for the rest of the campaign.
                </p>
              )}
            </div>
          )}
          <div className="pk-stat-foot-btns">
            {toApply ? (
              <>
                <button className="co-sheet-randomize" onClick={cancel}>Cancel</button>
                <button className="co-sheet-done pk-stat-apply" onClick={apply}>
                  {campaign
                    ? (selected.length === 1 ? `Take ${names[0]}` : `Take ${selected.length} improvements`)
                    : `Choose ${names[0]}`}
                </button>
              </>
            ) : (
              <>
                {chosen && (
                  <button className="co-sheet-randomize" onClick={() => { removeUpgrade('stat'); onClose() }}>
                    Remove Upgrade
                  </button>
                )}
                <button className="co-sheet-done" onClick={onClose}>Done</button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="pk-stat-grid" role="group" aria-label="Stats">
        {Object.keys(STAT_IMPROVEMENT).map(k => {
          const name = STAT_INFO[k]?.name || k
          if (taken.includes(k)) return (
            <div key={k} className="pk-stat is-taken" aria-label={`${STAT_INFO[k]?.name || k}, taken`}>
              <span className="pk-stat-abbrev">{k}</span>
              <span className="pk-stat-label">✓ Taken</span>
            </div>
          )
          const [from, to] = preview(k)
          const isSel = selected.includes(k)
          const maxed = to.value === from.value
          const disabled = !isSel && (maxed || !canAddNew)
          const state = maxed ? 'At best' : chosen === k ? '✓ Chosen' : isSel ? '✓ Selected' : name
          return (
            <button
              key={k}
              type="button"
              className={`pk-stat${isSel ? ' is-active' : ''}${chosen === k ? ' is-chosen' : ''}`}
              disabled={disabled}
              aria-pressed={isSel}
              aria-label={`${name}${chosen === k ? ', chosen' : isSel ? ', selected' : ''}`}
              onClick={() => pick(k)}
            >
              <span className="pk-stat-abbrev">{k}</span>
              <span className="pk-stat-label">{state}</span>
            </button>
          )
        })}
      </div>
      {why && <p className="pk-note pk-stat-why">{why}</p>}
    </BottomSheet>
  )
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
export default function WarriorUpgradeModal({
  isOpen, onClose, title, category,
  slotIndex, slot, wdata, poolFull,
  removeUpgrade, spendIP, freeIP,
  hasFixedShield, hasFixedDualWield, primaryIsPolearmOne, isDualWield, ipLeft = 0
}) {
  const setWarriorProp = useBuilderStore(s => s.setWarriorProp)

  if (!isOpen) return null

  if (category === 'stat') {
    return (
      <StatImproveSheet
        slotIndex={slotIndex} slot={slot} poolFull={poolFull} ipLeft={ipLeft}
        removeUpgrade={removeUpgrade} spendIP={spendIP} onClose={onClose}
      />
    )
  }

  const isFixed = category === 'weapon2' && (hasFixedShield || hasFixedDualWield || primaryIsPolearmOne)

  const showRemove = category !== 'weapon1' && (
    (category === 'weapon2' && slot.weapon2 && !isFixed) ||
    (category === 'climbing' && slot.climbing && slot.climbing !== 'None') ||
    (category === 'consumable' && slot.consumable)
  )

  return (
    <BottomSheet
      title={title.toUpperCase()}
      onClose={onClose}
      zIndex={1100}
      footer={
        <>
          {showRemove && (
            <button className="co-sheet-randomize" onClick={() => { removeUpgrade(category); onClose() }}>
              Remove Upgrade
            </button>
          )}
          <button className="co-sheet-done" onClick={onClose}>Done</button>
        </>
      }
    >
      {category === 'weapon2' && (
        <PickIntro label="Off-hand">
          {hasFixedShield || hasFixedDualWield ? 'Part of this class. Always carried, costs no IP.' :
           primaryIsPolearmOne ? 'A one-handed polearm is always paired with a Shield.' :
           'Costs 1 IP.'}
        </PickIntro>
      )}
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
        <>
          <PickIntro label="Climbing gear">Costs 1 IP.</PickIntro>
          <div className="pk-list">
            {Object.keys(CLIMBING_ITEMS).filter(k => k !== 'None').map(opt => {
              const cd = CLIMBING_ITEMS[opt]
              const pills = []
              if (cd?.height) pills.push({ text: `Height ${cd.height}` })
              if (cd?.skillCheck) pills.push({ text: `Skill check: ${cd.skillCheck}` })
              return (
                <PickCard
                  key={opt}
                  icon={ITEM_ICONS[opt]}
                  name={opt}
                  pills={pills}
                  status={slot.climbing === opt ? '✓ Equipped' : null}
                  desc={CLIMBING_DESCS[opt]}
                  active={slot.climbing === opt}
                  onClick={() => {
                    const newVal = slot.climbing === opt ? null : opt
                    setWarriorProp(slotIndex, 'climbing', newVal)
                    if (newVal) spendIP('climbing')
                    else freeIP('climbing')
                    onClose()
                  }}
                />
              )
            })}
          </div>
        </>
      )}

      {category === 'consumable' && (
        <>
          <PickIntro label="Item">Costs 1 IP.</PickIntro>
          <div className="pk-list">
            {CONSUMABLE_NAMES.map(opt => (
              <PickCard
                key={opt}
                icon={ITEM_ICONS[opt]}
                name={opt}
                status={slot.consumable === opt ? '✓ Equipped' : null}
                desc={CONSUMABLES[opt]}
                active={slot.consumable === opt}
                onClick={() => {
                  const newVal = slot.consumable === opt ? null : opt
                  setWarriorProp(slotIndex, 'consumable', newVal)
                  if (newVal) spendIP('consumable')
                  else freeIP('consumable')
                  onClose()
                }}
              />
            ))}
          </div>
        </>
      )}

      {category === 'weapon1' && (
        <PickIntro label="Main weapon">Free. A two-handed weapon leaves no room for an off-hand.</PickIntro>
      )}
      {category === 'weapon1' && (
        <WeaponSelector
          slotIndex={slotIndex}
          slot={slot}
          options={getAllowedWeapons(wdata)}
          propKey="weapon1"
          poolFull={poolFull}
          onSelect={() => onClose()}
        />
      )}
    </BottomSheet>
  )
}
