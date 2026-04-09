import { useBuilderStore, getAllowedWeapons, getSecondWeaponOptions } from '../store/builderStore'
import { STAT_IMPROVEMENT, WARRIORS } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES, CONSUMABLE_NAMES } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

// ── Weapon Selector ───────────────────────────────────────────────────────────
function WeaponSelector({ slotIndex, slot, options, propKey, poolFull, iconSize = 28, onSelect }) {
  const setWarriorProp = useBuilderStore(s => s.setWarriorProp)
  const current = slot[propKey]

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
        <div className="stat-pick-grid">
          {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => {
            const taken = slot.statImproves?.includes(k)
            return (
              <button
                key={k}
                className={`stat-pick-btn ${taken ? 'active' : ''}`}
                disabled={taken}
                onClick={() => { if (!taken) { addStatImprove(slotIndex, k); onClose() } }}
              >
                <span className="stat-pick-abbrev">{k}</span>
                <span className="stat-pick-label">{v}</span>
                {taken && <span className="stat-pick-taken">✓ Taken</span>}
              </button>
            )
          })}
        </div>
      )}

      {category === 'stat' && companyMode !== 'campaign' && (
        <div className="stat-pick-grid">
          {Object.entries(STAT_IMPROVEMENT).map(([k, v]) => (
            <button
              key={k}
              className={`stat-pick-btn ${slot.statImprove === k ? 'active' : ''}`}
              onClick={() => {
                const newVal = slot.statImprove === k ? null : k
                setWarriorProp(slotIndex, 'statImprove', newVal)
                if (newVal) spendIP('stat')
                else freeIP('stat')
                onClose()
              }}
            >
              <span className="stat-pick-abbrev">{k}</span>
              <span className="stat-pick-label">{v}</span>
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
    </BottomSheet>
  )
}
