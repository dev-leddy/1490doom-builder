import { useTrackerStore } from '../store/trackerStore'

export default function WarriorTabBar() {
  const { warriors, activeWarriorIdx, refOpen, selectWarrior, openRef, closeRef } = useTrackerStore()

  return (
    <div className="tk-tab-bar">
      {warriors.map((w, i) => {
        const isActive = !refOpen && activeWarriorIdx === i
        const isDead = w.dead || w.currentVit <= 0
        const shortName = w.type.split(' ')[0]

        return (
          <button
            key={i}
            className={`tk-tab${isActive ? ' tk-tab-active' : ''}${isDead ? ' tk-tab-dead' : ''}`}
            onClick={() => selectWarrior(i)}
          >
            {w.isCaptain && <span className="tk-tab-captain-dot">★</span>}
            {isDead && <span className="tk-tab-dead-icon">☠</span>}
            <span className="tk-tab-vit">{isDead ? '0' : w.currentVit}</span>
            <span className="tk-tab-name">{shortName}</span>
          </button>
        )
      })}

      <button
        className={`tk-tab tk-tab-ref${refOpen ? ' tk-tab-active' : ''}`}
        onClick={refOpen ? closeRef : openRef}
      >
        <span className="tk-tab-vit">{refOpen ? '✕' : '?'}</span>
        <span className="tk-tab-name">{refOpen ? 'Back' : 'Ref'}</span>
      </button>
    </div>
  )
}
