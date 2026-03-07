import { useTrackerStore, canRestoreWithReliquary } from '../store/trackerStore'

export default function AbilityBlock({ wi, warrior: w, wdata }) {
  const { toggleOPG } = useTrackerStore()

  const abilities = wdata.abilities || []

  // Passive abilities first, OPG (once per game) abilities last
  const sorted = [...abilities].sort((a, b) => {
    const aOPG = a.desc.toLowerCase().includes('once per game') ? 1 : 0
    const bOPG = b.desc.toLowerCase().includes('once per game') ? 1 : 0
    return aOPG - bOPG
  })

  return (
    <div className="tk-abilities-block">
      {sorted.map((ab, i) => {
        const isOPG = ab.desc.toLowerCase().includes('once per game')
        const isUsed = isOPG && !!w.opgUsed[ab.name]
        const isPermanent = !canRestoreWithReliquary(ab.name)
        const badgeLabel = isPermanent ? 'PERMANENT' : isUsed ? '✓ USED' : 'ONCE PER GAME'
        const badgeCls = `tk-opg-badge${isPermanent ? ' tk-opg-permanent' : isUsed ? ' tk-opg-used' : ''}`

        return (
          <div
            key={i}
            className={`tk-ability${isUsed ? ' tk-ability-used' : ''}`}
            onClick={isOPG && !w.dead ? () => toggleOPG(wi, ab.name) : undefined}
            style={isOPG && !w.dead ? { cursor: 'pointer' } : {}}
          >
            <div className="tk-ability-header">
              <span className="tk-ability-name">{ab.name}</span>
              {isOPG && <span className={badgeCls}>{badgeLabel}</span>}
            </div>
            <div className="tk-ability-desc">{ab.desc}</div>
          </div>
        )
      })}

      {/* Captain Re-Roll */}
      {w.isCaptain && (
        <CaptainAbility wi={wi} w={w} />
      )}
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
