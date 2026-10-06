import { useTrackerStore } from '../store/trackerStore'

export default function WarriorTabBar() {
  const { warriors, activeWarriorIdx, refOpen, selectWarrior, toggleActivated } = useTrackerStore()

  function handleClick(e, i) {
    if (e.detail === 2) {
      toggleActivated(i)
    } else {
      selectWarrior(i)
    }
  }

  return (
    <div className="tk-tab-bar">
      {warriors.map((w, i) => {
        const isActive = !refOpen && activeWarriorIdx === i
        const isDead = w.dead || w.currentVit <= 0
        return (
          <button
            key={i}
            className={`tk-tab${isActive ? ' tk-tab-active' : ''}${isDead ? ' tk-tab-dead' : ''}${w.activated ? ' tk-tab-activated' : ''}`}
            onClick={(e) => handleClick(e, i)}
            title="Double-click to toggle activated"
          >
            <span className="tk-tab-vit-row">
              <span className="tk-tab-vit">{isDead ? '☠' : w.currentVit}</span>
            </span>
            <span className="tk-tab-name">
              {w.isCaptain && <span className="tk-tab-captain-dot">★</span>}
              {w.type}
            </span>
            {w.activated && <span className="tk-tab-check">✓</span>}
          </button>
        )
      })}
    </div>
  )
}
