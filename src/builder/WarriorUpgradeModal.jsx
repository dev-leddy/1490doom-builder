import { useBuilderStore, getAllowedWeapons, getSecondWeaponOptions } from '../store/builderStore'
import { STAT_IMPROVEMENT, WARRIORS } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
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

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
export default function WarriorUpgradeModal({
  isOpen, onClose, title, category,
  slotIndex, slot, wdata, poolFull,
  removeUpgrade, spendIP, freeIP,
  hasFixedShield, hasFixedDualWield, primaryIsPolearmOne, isDualWield
}) {
  const { setWarriorProp, addStatImprove } = useBuilderStore()
  const companyMode = useBuilderStore(s => s.companyMode)

  if (!isOpen) return null

  const isFixed = category === 'weapon2' && (hasFixedShield || hasFixedDualWield || primaryIsPolearmOne)

  const showRemove = category !== 'weapon1' && (
    (category === 'weapon2' && slot.weapon2 && !isFixed) ||
    (category === 'climbing' && slot.climbing && slot.climbing !== 'None') ||
    (category === 'consumable' && slot.consumable) ||
    (category === 'stat' && slot.statImprove)
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

      {category === 'stat' && companyMode === 'campaign' && (
        <>
          <PickIntro label="Stat improvement">+1 to a stat. Costs 1 IP each; each stat only once.</PickIntro>
          <div className="pk-stat-grid">
            {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => {
              const taken = slot.statImproves?.includes(k)
              return (
                <button
                  key={k}
                  type="button"
                  className={`pk-stat${taken ? ' is-taken' : ''}`}
                  disabled={taken}
                  onClick={() => { if (!taken) { addStatImprove(slotIndex, k); onClose() } }}
                >
                  <span className="pk-stat-abbrev">{k}</span>
                  <span className="pk-stat-label">{v.replace(/ \+1$/, '')}</span>
                  {taken && <span className="pk-stat-flag">✓ Taken</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {category === 'stat' && companyMode !== 'campaign' && (
        <>
          <PickIntro label="Stat improvement">+1 to one stat. Costs 1 IP.</PickIntro>
          <div className="pk-stat-grid">
            {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={`pk-stat${slot.statImprove === k ? ' is-active' : ''}`}
                aria-pressed={slot.statImprove === k}
                onClick={() => {
                  const newVal = slot.statImprove === k ? null : k
                  setWarriorProp(slotIndex, 'statImprove', newVal)
                  if (newVal) spendIP('stat')
                  else freeIP('stat')
                  onClose()
                }}
              >
                <span className="pk-stat-abbrev">{k}</span>
                <span className="pk-stat-label">{v.replace(/ \+1$/, '')}</span>
                {slot.statImprove === k && <span className="pk-stat-flag">✓ Chosen</span>}
              </button>
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
