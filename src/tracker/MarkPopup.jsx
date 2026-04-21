import { useTrackerStore } from '../store/trackerStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS as MARKS_DATA } from '../data/warriors'

export default function MarkPopup() {
  const {
    mark, closeMarkPopup,
    doomedChoirUsed, gravebornUsed,
    setDoomedChoirUsed, setGravebornUsed,
  } = useTrackerStore()

  const markData = MARKS_DATA.find(m => m.name === mark)
  const imgSrc = mark === 'Ashbound' ? MARK_IMAGES['Wretched Survivors'] : MARK_IMAGES[mark]

  if (!markData) return null

  const hasToggle = mark === 'Doomed Choir' || mark === 'Graveborn'
  const isUsed = mark === 'Doomed Choir' ? doomedChoirUsed
               : mark === 'Graveborn'    ? gravebornUsed
               : false

  function handleToggle() {
    if (mark === 'Doomed Choir') setDoomedChoirUsed(!doomedChoirUsed)
    if (mark === 'Graveborn')    setGravebornUsed(!gravebornUsed)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={e => e.target === e.currentTarget && closeMarkPopup()}
    >
      <div className="mark-popup-box">
        <div className="mark-popup-header">
          {imgSrc && <img src={imgSrc} className="mark-popup-img" alt={mark} />}
          <div>
            <div className="mark-popup-label">Company Mark</div>
            <div className="mark-popup-name">{mark}</div>
          </div>
        </div>

        <div className="mark-popup-desc">{markData.desc}</div>

        {hasToggle && (
          <button
            className={`mark-popup-toggle${isUsed ? ' mark-popup-toggle--used' : ''}`}
            onClick={handleToggle}
          >
            {isUsed ? '↺  Mark as Available Again' : '✓  Mark as Used This Game'}
          </button>
        )}

        <button className="mark-popup-close" onClick={closeMarkPopup}>Close</button>
      </div>
    </div>
  )
}
