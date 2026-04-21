import { useTrackerStore } from '../store/trackerStore'
import { MARKS as MARKS_DATA } from '../data/warriors'
import { MARK_IMAGES } from '../data/images'

export default function MarkAbilityModal() {
  const {
    markAbilityModal, closeMarkAbilityModal,
    doomedChoirUsed, gravebornUsed,
    setDoomedChoirUsed, setGravebornUsed,
    warriors, mark,
  } = useTrackerStore()

  if (!markAbilityModal) return null

  const { type, warriorIdx } = markAbilityModal
  const markData = MARKS_DATA.find(m => m.name === mark)
  const imgSrc = mark === 'Ashbound' ? MARK_IMAGES['Wretched Survivors'] : MARK_IMAGES[mark]
  const warrior = warriorIdx != null ? warriors[warriorIdx] : null
  const isUsed = type === 'doomed-choir' ? doomedChoirUsed
               : type === 'graveborn'    ? gravebornUsed
               : false

  function handleUse() {
    if (type === 'doomed-choir') setDoomedChoirUsed(true)
    if (type === 'graveborn')    setGravebornUsed(true)
    closeMarkAbilityModal()
  }

  function handleSkip() {
    closeMarkAbilityModal()
  }

  const sublabel = type === 'ashbound'     ? 'Deployment Reminder'
                 : isUsed                  ? 'Already Used This Game'
                 : type === 'graveborn'    ? 'A Warrior Has Fallen'
                 : 'Ability Available'     // doomed-choir

  return (
    <div
      className="mark-ability-backdrop"
      onClick={e => e.target === e.currentTarget && handleSkip()}
    >
      <div className="mark-popup-box">

        {/* Header — reuses mark-popup-box styles */}
        <div className="mark-popup-header">
          {imgSrc && <img src={imgSrc} className="mark-popup-img" alt={mark} />}
          <div>
            <div className="mark-popup-label">{sublabel}</div>
            <div className="mark-popup-name">{mark}</div>
          </div>
        </div>

        {/* Fallen warrior callout (Graveborn only) */}
        {warrior && type === 'graveborn' && (
          <div className="mark-ability-notice">
            <strong>{warrior.customName || warrior.type}</strong> has been reduced to 0 vitality.
          </div>
        )}

        {/* Ability description */}
        <div className="mark-popup-desc">{markData?.desc}</div>

        {/* Already-used notice */}
        {isUsed && (
          <div className="mark-ability-used-label">Ability already used this game.</div>
        )}

        {/* Footer buttons */}
        {type === 'ashbound' ? (
          <button className="mark-popup-close" onClick={handleSkip}>Got It</button>
        ) : isUsed ? (
          <button className="mark-popup-close" onClick={handleSkip}>Close</button>
        ) : (
          <div className="mark-ability-btn-row">
            <button className="mark-ability-skip-btn" onClick={handleSkip}>
              {type === 'doomed-choir' ? 'Not This Round' : 'Skip'}
            </button>
            <button className="mark-ability-use-btn" onClick={handleUse}>
              Use Ability
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
