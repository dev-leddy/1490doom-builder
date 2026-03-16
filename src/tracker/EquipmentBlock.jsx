import { WEAPONS } from '../data/weapons'
import { ITEM_ICONS } from '../data/images'
import { CLIMBING_ITEMS, CLIMBING_DESCS } from '../data/weapons'

function WeaponRow({ iconKey, name, wpnData, overrideNote }) {
  if (!name) return null
  const ic = ITEM_ICONS[iconKey] || ITEM_ICONS[name]
  const dmgPill = wpnData?.damage > 0 ? `DMG ${wpnData.damage}` : null
  const rngPill = wpnData?.range && wpnData.range !== '—' ? `RNG ${wpnData.range}` : null
  const noteText = overrideNote !== undefined
    ? overrideNote
    : wpnData ? [wpnData.note, wpnData.special].filter(Boolean).join(' — ') : ''

  return (
    <div className="tk-wpn-row">
      {ic && <img src={ic} className="tk-wpn-icon" alt="" />}
      <div className="tk-wpn-body">
        <div className="tk-wpn-name-line">
          <span className="tk-wpn-name">{name}</span>
          {dmgPill && <span className="tk-wpn-pill">{dmgPill}</span>}
          {rngPill && <span className="tk-wpn-pill">{rngPill}</span>}
        </div>
        {noteText && <div className="tk-wpn-note">{noteText}</div>}
      </div>
    </div>
  )
}

export default function EquipmentBlock({ warrior: w }) {
  return (
    <div className="tk-equip-block">
      {w.weapon1 && <WeaponRow iconKey={w.weapon1} name={w.weapon1} wpnData={WEAPONS[w.weapon1]} />}
      {w.weapon2 && <WeaponRow iconKey={w.weapon2} name={w.weapon2} wpnData={WEAPONS[w.weapon2]} />}

      {w.climbing && w.climbing !== 'None' && (() => {
        const cdata = CLIMBING_ITEMS[w.climbing]
        const cdesc = CLIMBING_DESCS[w.climbing] || ''
        const pills = cdata ? `HT ${cdata.height} · SKILL ${cdata.skillCheck}` : ''
        return (
          <WeaponRow
            iconKey={w.climbing}
            name={w.climbing}
            wpnData={null}
            overrideNote={[pills, cdesc].filter(Boolean).join(' — ')}
          />
        )
      })()}
    </div>
  )
}
