import { useTrackerStore } from '../store/trackerStore'

export default function WarriorTabBar() {
  const { warriors, activeWarriorIdx, refOpen, selectWarrior } = useTrackerStore()

  return (
    <div className="tk-tab-bar">
      {warriors.map((w, i) => {
        const isActive = !refOpen && activeWarriorIdx === i
        const isDead = w.dead || w.currentVit <= 0
        return (
          <button
            key={i}
            className={`tk-tab${isActive ? ' tk-tab-active' : ''}${isDead ? ' tk-tab-dead' : ''}`}
            onClick={() => selectWarrior(i)}
          >
            {w.isCaptain && <span className="tk-tab-captain-dot">★</span>}
            <span className="tk-tab-vit">{isDead ? '☠' : w.currentVit}</span>
            <span className="tk-tab-name">{w.type}</span>
          </button>
        )
      })}
    </div>
  )
}
