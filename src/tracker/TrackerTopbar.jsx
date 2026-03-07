import { useTrackerStore } from '../store/trackerStore'
import { MARK_IMAGES } from '../data/images'

export default function TrackerTopbar() {
  const { mark, companyName, round, changeRound, resetTracker, closeTracker, openMarkPopup } = useTrackerStore()
  const markImg = mark ? MARK_IMAGES[mark] : null

  return (
    <div className="tk-topbar">
      <button className="tk-topbar-btn" onClick={closeTracker}>✕</button>

      <div className="tk-topbar-identity" onClick={openMarkPopup} title="View company mark">
        {markImg && <img src={markImg} className="tk-topbar-mark-img" alt={mark} />}
        <div className="tk-topbar-names">
          <span className="tk-topbar-name">{companyName || 'Unnamed Company'}</span>
          {mark && <span className="tk-topbar-mark-name">{mark}</span>}
        </div>
      </div>

      <div className="tk-round-ctrl">
        <button className="tk-round-btn" onClick={() => changeRound(-1)}>−</button>
        <div className="tk-round-display">
          <span className="tk-round-label">RND</span>
          <span className="tk-round-num">{round}</span>
        </div>
        <button className="tk-round-btn" onClick={() => changeRound(1)}>+</button>
      </div>

      <button className="tk-topbar-btn" onClick={resetTracker} title="Reset game">↺</button>
    </div>
  )
}
