import { useMemo } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { WARRIORS, MARKS_MAP } from '../data/warriors'
import { WEAPONS, CLIMBING_ITEMS, CLIMBING_DESCS, CONSUMABLES } from '../data/weapons'
import { ACTION_DEFS, STATUS_DEFS, CACHE_ITEMS } from '../data/items'
import { WARRIOR_IMAGES, MARK_IMAGES, ITEM_ICONS } from '../data/images'

function improveStatDisplayPrint(base, stat) {
  // MOV / ATK / VIT are flat +1, the rest are "easier checks" (lower target number).
  if (stat === 'MOV' || stat === 'VIT' || stat === 'ATK') return parseInt(base) + 1
  const num = parseInt(base)
  return Math.max(2, num - 1) + '+'
}

function debuffStatDisplayPrint(base, stat) {
  if (stat === 'MOV' || stat === 'VIT' || stat === 'ATK') return Math.max(0, parseInt(base) - 1)
  const num = parseInt(base)
  return (num + 1) + '+'
}

function isOPGDesc(desc) {
  return (desc || '').toLowerCase().includes('once per game')
}

function getMarkImg(mark) {
  // Legacy compatibility: some older builds re-used an image for Ashbound.
  if (mark === 'Ashbound' && !MARK_IMAGES.Ashbound) return MARK_IMAGES['Wretched Survivors'] || ''
  return MARK_IMAGES[mark] || ''
}

export default function PrintRoster() {
  // Subscribe to individual fields to avoid returning a new object each snapshot
  const companyName = useBuilderStore(s => s.companyName)
  const mark = useBuilderStore(s => s.mark)
  const slots = useBuilderStore(s => s.slots)

  const captainIndex = useMemo(() => {
    const idx = slots.findIndex(s => s?.isCaptain)
    return idx >= 0 ? idx : 0
  }, [slots])

  const orderedIndices = useMemo(() => {
    const all = slots.map((_, i) => i)
    return [captainIndex, ...all.filter(i => i !== captainIndex)]
  }, [slots, captainIndex])

  const name = companyName || null
  const markImgSrc = getMarkImg(mark)
  const markRule = mark ? (MARKS_MAP[mark] || '') : ''

  return (
    <div className="pr-page">

      <div className="pr-header">
        <div className="pr-header-left">
          <div className="pr-game-title">1490 DOOM</div>
          <div className="pr-company-block">
            {name
              ? <div className="pr-company-name">{name}</div>
              : <div className="pr-company-name-blank" />
            }
            <div className="pr-company-sub">Doom Company Roster</div>
          </div>
        </div>

        <div className="pr-header-mark">
          {markImgSrc ? (
            <img className="pr-header-mark-avatar" src={markImgSrc} alt={mark || 'None'} />
          ) : null}
          <div className="pr-header-mark-text">
            <div className="pr-header-mark-label">Company Mark</div>
            <div className="pr-header-mark-name">{mark || 'None'}</div>
            {mark && markRule ? <div className="pr-header-mark-rule">{markRule}</div> : null}
          </div>
        </div>
      </div>

      <div className="pr-warriors">
        {orderedIndices.filter(i => slots[i]?.type).map((i, orderIdx) => {
          const slot = slots[i]
          const isCaptain = i === captainIndex

          const wdata = WARRIORS[slot.type]
          const portraitSrc = WARRIOR_IMAGES[slot.type] || ''
          const statKeys = ['MOV', 'ATK', 'VIT', 'SKL', 'DEF', 'COM']
          const spent = slot.ip || []

          const isDualWielding = slot.weapon1 === 'Light Weapon' && slot.weapon2 === 'Light Weapon'
          const dualWieldBonus = (isDualWielding && !wdata.fixedDualWield) ? 1 : 0

          const wpn1 = slot.weapon1 ? WEAPONS[slot.weapon1] : null
          const wpn2 = slot.weapon2 ? WEAPONS[slot.weapon2] : null

          const wpnCards = []
          if (wpn1 && slot.weapon1) {
            wpnCards.push({
              key: 'w1',
              iconSrc: ITEM_ICONS[slot.weapon1] || '',
              name: slot.weapon1,
              damage: wpn1.damage,
              range: wpn1.range,
            })
          }
          if (wpn2 && slot.weapon2) {
            wpnCards.push({
              key: 'w2',
              iconSrc: ITEM_ICONS[slot.weapon2] || '',
              name: slot.weapon2,
              damage: wpn2.damage,
              range: wpn2.range,
            })
          }
          if (slot.climbing && slot.climbing !== 'None') {
            const cdata = CLIMBING_ITEMS[slot.climbing]
            wpnCards.push({
              key: 'climb',
              iconSrc: ITEM_ICONS[slot.climbing] || '',
              name: slot.climbing,
              damage: 0,
              range: null,
              extra: cdata ? `HT ${cdata.height} · SKILL ${cdata.skillCheck}` : null,
              note: CLIMBING_DESCS[slot.climbing] || '',
            })
          }
          if (slot.consumable && slot.consumable !== 'None') {
            wpnCards.push({
              key: 'consumable',
              iconSrc: ITEM_ICONS[slot.consumable] || '',
              name: slot.consumable,
              damage: 0,
              range: null,
              note: CONSUMABLES[slot.consumable] || '',
            })
          }

          const upgradeLines = []
          if (spent.includes('stat') && slot.statImprove) upgradeLines.push(`+1 ${slot.statImprove}`)
          if (spent.includes('weapon2') && slot.weapon2) upgradeLines.push(`2nd Weapon: ${slot.weapon2}`)
          if (spent.includes('climbing') && slot.climbing && slot.climbing !== 'None') upgradeLines.push(`Climbing: ${slot.climbing}`)
          if (spent.includes('consumable') && slot.consumable && slot.consumable !== 'None') upgradeLines.push(`Item: ${slot.consumable}`)

          const baseVit = parseInt(wdata.stats.VIT)
          const bonusVit = spent.includes('stat') && slot.statImprove === 'VIT' ? 1 : 0
          const vit = baseVit + bonusVit

          return (
            <div key={`w-${i}-${orderIdx}`} className={`pr-card ${isCaptain ? 'is-captain' : ''}`}>
              {/* ── Main content ── */}
              <div className="pr-card-main">
                <div className="pr-card-header">
                  {portraitSrc ? <img className="pr-portrait" src={portraitSrc} alt={slot.type} /> : null}
                  <div className="pr-card-header-text">
                    <div className="pr-warrior-name">{slot.type}</div>
                    {isCaptain ? <span className="pr-captain-badge">★ Captain</span> : null}
                  </div>
                </div>

                <div className="pr-stats">
                  {statKeys.map(s => {
                    let base = wdata.stats[s]

                    if (s === 'ATK') {
                      base = parseInt(base) + dualWieldBonus
                    }

                    const improved = spent.includes('stat') && slot.statImprove === s
                    const polearmDebuff = slot.weapon1 === 'Polearm (one-handed)' && s === 'COM'
                    
                    const isDualWieldImproved = s === 'ATK' && dualWieldBonus > 0
                    const isStatImproved = improved || isDualWieldImproved
                    
                    let display = base
                    if (isStatImproved) display = improveStatDisplayPrint(display, s)
                    if (polearmDebuff) display = debuffStatDisplayPrint(display, s)

                    const bothModified = isStatImproved && polearmDebuff
                    let statClass = ''
                    if (isStatImproved && !bothModified) statClass = 'improved'
                    else if (polearmDebuff && !bothModified) statClass = 'debuffed'

                    return (
                      <div key={s} className="pr-stat">
                        <span className="pr-stat-lbl">{s}</span>
                        <span className={`pr-stat-val ${statClass}`}>{display}</span>
                      </div>
                    )
                  })}
                </div>

                {upgradeLines.length ? (
                  <div className="pr-upgrades">
                    <span className="pr-upgrades-label">UPGRADES</span>
                    {upgradeLines.map(line => (
                      <span key={line} className="pr-upgrade-tag">{line}</span>
                    ))}
                  </div>
                ) : (
                  <div className="pr-upgrades pr-upgrades-none">
                    <span className="pr-upgrades-label">UPGRADES</span>
                    <span className="pr-upgrade-none-text">None</span>
                  </div>
                )}

                {wpnCards.length ? (
                  <div className="pr-wpn-specials">
                    {wpnCards.map(row => {
                      const pills = [
                        row.damage > 0 ? `DMG ${row.damage}` : null,
                        row.range && row.range !== '—' ? `RNG ${row.range}` : null,
                        row.extra || null,
                      ].filter(Boolean)
                      return (
                        <div key={row.key} className="pr-wpn-stat-row">
                          {row.iconSrc ? <img src={row.iconSrc} className="pr-wpn-row-icon" alt="" /> : null}
                          <span className="pr-upgrade-tag">{row.name}</span>
                          {pills.map(p => <span key={p} className="pr-wpn-pill">{p}</span>)}
                          {row.note ? <span className="pr-wpn-note">{row.note}</span> : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}

                <div className="pr-abilities">
                  {wdata.abilities.map(ab => (
                    <div key={ab.name} className="pr-ability">
                      <span className="pr-ability-name">{ab.name}</span>
                      {isOPGDesc(ab.desc) ? <span className="pr-ability-opg"> [OPG]</span> : null}
                      {' — '}{ab.desc}
                    </div>
                  ))}
                  {(slot.notes || []).map((n, ni) => (
                    <div key={ni} className="pr-ability pr-ability-note">
                      <span className="pr-ability-name">{n.title || 'Note'}</span>
                      {n.body ? <>{' — '}{n.body}</> : null}
                    </div>
                  ))}
                </div>

              </div>

              {/* ── Tracking panel ── */}
              <div className="pr-card-tracking">
                <div className="pr-vit-track">
                  {Array.from({ length: vit }).map((_, vi) => (
                    <div key={vi} className="pr-vit-box" />
                  ))}
                </div>
                <div className="pr-tracking-header" style={{marginTop:'4pt'}}>Statuses / Cache</div>
                <div className="pr-track-blank-box" />
              </div>
            </div>
          )
        })}
      </div>


      <div className="pr-bottom">
        <div className="pr-ref">
          <div className="pr-ref-header">Quick Reference</div>

          <div className="pr-ref-main-grid">
            <div className="pr-ref-col-actions">
              <div className="pr-ref-panel-header">Actions</div>
              {ACTION_DEFS.map(([k, v]) => (
                <div key={k} className="pr-ref-item">
                  <strong>{k}:</strong> {v}
                </div>
              ))}
            </div>

            <div className="pr-ref-col-right">
              <div className="pr-ref-panel-header">Falling (D6, 2″+ fall)</div>
              <div className="pr-ref-fall-note">
                +1 if fell 4″+. +3 if fell 6″+, model becomes Immobilized. 8+ = Death.
              </div>
              <table className="pr-fall-table">
                <tbody>
                  {[['1–2','0 dmg'],['3–4','1 dmg'],['5–6','2 dmg'],['7','3 dmg'],['8+','☠ Death']].map(([roll, result]) => (
                    <tr key={roll}><td>{roll}</td><td>{result}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="pr-ref-panel-header" style={{marginTop:'6pt'}}>Resource Caches (D6)</div>
              <table className="pr-fall-table">
                <tbody>
                  {CACHE_ITEMS.map(item => (
                    <tr key={item.roll}>
                      <td>{item.roll}</td>
                      <td><strong>{item.name}</strong>{' — '}{item.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pr-ref-panel-header" style={{marginTop:'6pt'}}>Statuses</div>
              {STATUS_DEFS.map(([k, v]) => (
                <div key={k} className="pr-ref-item">
                  <strong>{k}:</strong> {v}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
