import { useTrackerStore } from '../store/trackerStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS as MARKS_DATA } from '../data/warriors'

export default function MarkPopup() {
  const { mark, closeMarkPopup } = useTrackerStore()
  const markData = MARKS_DATA.find(m => m.name === mark)
  const imgSrc = mark === 'Ashbound'
    ? MARK_IMAGES['Wretched Survivors']
    : MARK_IMAGES[mark]

  if (!markData) return null

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
        <button className="mark-popup-close" onClick={closeMarkPopup}>CLOSE</button>
      </div>
    </div>
  )
}
