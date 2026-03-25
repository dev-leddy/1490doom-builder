import { useTrackerStore, canRestoreWithReliquary } from '../store/trackerStore'
import { WEAPONS } from '../data/weapons'

export default function AbilityBlock({ wi, warrior: w, wdata }) {
  const { toggleOPG, toggleOPR, tapTPG } = useTrackerStore()

  const abilities = wdata.abilities || []
  const hasShield = w.weapon2 === 'Shield'
  const hasBow = w.weapon1 === 'Bow'

  // Sort: passive (0) → OPR (1) → TPG (2) → OPG (3)
  const sorted = [...abilities].sort((a, b) => {
    const rank = desc => {
      const d = desc.toLowerCase()
      if (d.includes('once per game')) return 3
      if (d.includes('twice per game')) return 2
      if (d.includes('once per round')) return 1
      return 0
    }
    return rank(a.desc) - rank(b.desc)
  })

  return (
    <div className="tk-abilities-block">
      {/* Captain Re-Roll (OPG) - Pinned to Top */}
      {w.isCaptain && (
        <CaptainAbility wi={wi} w={w} />
      )}

      {sorted.map((ab, i) => {
        const isOPG = ab.desc.toLowerCase().includes('once per game')
        const isTPG = ab.desc.toLowerCase().includes('twice per game')
        const isOPR = ab.desc.toLowerCase().includes('once per round')

        // ── TWICE PER GAME ──────────────────────────────────────
        if (isTPG) {
          const tpgCount = w.opgUsed[ab.name] || 0
          const fullyUsed = tpgCount >= 2
          return (
            <div
              key={i}
              className={`tk-ability${fullyUsed ? ' tk-ability-used' : ''}`}
              onClick={!w.dead ? () => tapTPG(wi, ab.name) : undefined}
              style={!w.dead ? { cursor: 'pointer' } : {}}
            >
              <div className="tk-ability-header">
                <span className="tk-ability-name">{ab.name}</span>
                <span className={`tk-opg-badge tk-tpg-badge${fullyUsed ? ' tk-opg-used' : ''}`}>
                  <span className={`tk-tpg-pip${tpgCount >= 1 ? ' used' : ''}`}>●</span>
                  <span className={`tk-tpg-pip${tpgCount >= 2 ? ' used' : ''}`}>●</span>
                  {fullyUsed ? ' USED' : ' TWICE PER GAME'}
                </span>
              </div>
              <div className="tk-ability-desc">{ab.desc}</div>
            </div>
          )
        }

        // ── ONCE PER ROUND ──────────────────────────────────────
        if (isOPR) {
          const used = !!w.oprUsed[ab.name]
          return (
            <div
              key={i}
              className={`tk-ability${used ? ' tk-ability-used' : ''}`}
              onClick={!w.dead ? () => toggleOPR(wi, ab.name) : undefined}
              style={!w.dead ? { cursor: 'pointer' } : {}}
            >
              <div className="tk-ability-header">
                <span className="tk-ability-name">{ab.name}</span>
                <span className={`tk-opg-badge tk-opr-badge${used ? ' tk-opg-used' : ''}`}>
                  {used ? '✓ USED' : 'ONCE PER ROUND'}
                </span>
              </div>
              <div className="tk-ability-desc">{ab.desc}</div>
            </div>
          )
        }

        // ── ONCE PER GAME ───────────────────────────────────────
        if (isOPG) {
          const isUsed = !!w.opgUsed[ab.name]
          const isPermanent = !canRestoreWithReliquary(ab.name)
          const badgeLabel = isUsed ? (isPermanent ? '✓ PERMANENT' : '✓ USED') : 'ONCE PER GAME'
          const badgeCls = `tk-opg-badge${isUsed && isPermanent ? ' tk-opg-permanent' : isUsed ? ' tk-opg-used' : ''}`
          return (
            <div
              key={i}
              className={`tk-ability${isUsed ? ' tk-ability-used' : ''}`}
              onClick={!w.dead ? () => toggleOPG(wi, ab.name) : undefined}
              style={!w.dead ? { cursor: 'pointer' } : {}}
            >
              <div className="tk-ability-header">
                <span className="tk-ability-name">{ab.name}</span>
                <span className={badgeCls}>{badgeLabel}</span>
              </div>
              <div className="tk-ability-desc">{ab.desc}</div>
            </div>
          )
        }

        // ── PASSIVE ─────────────────────────────────────────────
        return (
          <div key={i} className="tk-ability">
            <div className="tk-ability-header">
              <span className="tk-ability-name">{ab.name}</span>
            </div>
            <div className="tk-ability-desc">{ab.desc}</div>
          </div>
        )
      })}

      {/* Shield: GUARDED (OPR — resets each round) */}
      {hasShield && (() => {
        const shield = WEAPONS['Shield']
        const used = !!w.oprUsed['GUARDED']
        return (
          <div
            className={`tk-ability${used ? ' tk-ability-used' : ''}`}
            onClick={!w.dead ? () => toggleOPR(wi, 'GUARDED') : undefined}
            style={!w.dead ? { cursor: 'pointer' } : {}}
          >
            <div className="tk-ability-header">
              <span className="tk-ability-name">
                {shield.abilityName}
                <span style={{fontSize: '0.85em', opacity: 0.7, fontWeight: 'normal', marginLeft: '0.4rem'}}>(from Shield)</span>
              </span>
              <span className={`tk-opg-badge tk-opr-badge${used ? ' tk-opg-used' : ''}`}>
                {used ? '✓ USED' : 'ONCE PER ROUND'}
              </span>
            </div>
            <div className="tk-ability-desc">{shield.abilityDesc}</div>
          </div>
        )
      })()}

      {/* Bow: OVERDRAW (OPR — resets each round) */}
      {hasBow && (() => {
        const bow = WEAPONS['Bow']
        const used = !!w.oprUsed['OVERDRAW']
        return (
          <div
            className={`tk-ability${used ? ' tk-ability-used' : ''}`}
            onClick={!w.dead ? () => toggleOPR(wi, 'OVERDRAW') : undefined}
            style={!w.dead ? { cursor: 'pointer' } : {}}
          >
            <div className="tk-ability-header">
              <span className="tk-ability-name">
                {bow.abilityName}
                <span style={{ fontSize: '0.85em', opacity: 0.7, fontWeight: 'normal', marginLeft: '0.4rem' }}>(from Bow)</span>
              </span>
              <span className={`tk-opg-badge tk-opr-badge${used ? ' tk-opg-used' : ''}`}>
                {used ? '✓ USED' : 'ONCE PER ROUND'}
              </span>
            </div>
            <div className="tk-ability-desc">{bow.abilityDesc}</div>
          </div>
        )
      })()}


    </div>
  )
}

function CaptainAbility({ wi, w }) {
  const { toggleOPG } = useTrackerStore()
  const capUsed = !!w.opgUsed['__captain__']

  return (
    <div
      className={`tk-ability${capUsed ? ' tk-ability-used' : ''}`}
      onClick={!w.dead ? () => toggleOPG(wi, '__captain__') : undefined}
      style={!w.dead ? { cursor: 'pointer' } : {}}
    >
      <div className="tk-ability-header">
        <span className="tk-ability-name">★ Captain Re-Roll</span>
        <span className={`tk-opg-badge${capUsed ? ' tk-opg-used' : ''}`}>
          {capUsed ? '✓ USED' : 'ONCE PER GAME'}
        </span>
      </div>
      <div className="tk-ability-desc">Once per game, the Captain may re-roll a single die.</div>
    </div>
  )
}
