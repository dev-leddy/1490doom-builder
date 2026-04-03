import { useTrackerStore, canRestoreWithReliquary } from '../store/trackerStore'
import { WARRIORS } from '../data/warriors'
import BottomSheet from '../shared/BottomSheet'

export default function ReliquaryModal() {
  const { warriors, reliquaryModal, closeReliquaryModal, confirmReliquary } = useTrackerStore()
  if (!reliquaryModal) return null

  const { wi } = reliquaryModal
  const w = warriors[wi]
  const wdata = WARRIORS[w.type]

  // Build list of used OPG abilities that can be restored
  const options = []

  // Captain re-roll (tracked under '__captain__' key)
  if (w.isCaptain && w.opgUsed['__captain__'] && canRestoreWithReliquary('__captain__')) {
    options.push({ key: '__captain__', label: 'Captain Re-Roll', desc: 'The Captain may re-roll a single die.' })
  }

  // Warrior's own OPG abilities
  wdata.abilities.forEach(ab => {
    if (w.opgUsed[ab.name] && canRestoreWithReliquary(ab.name)) {
      options.push({ key: ab.name, label: ab.name, desc: ab.desc })
    }
  })

  return (
    <BottomSheet
      title="EXPEND RELIQUARY"
      onClose={closeReliquaryModal}
      className="tk-sheet"
      footer={
        <button className="tk-detail-btn tk-detail-btn--ghost" style={{ flex: 1 }} onClick={closeReliquaryModal}>
          {options.length === 0 ? 'CLOSE' : 'CANCEL'}
        </button>
      }
    >
      {options.length === 0 ? (
        <div className="reliquary-empty-msg">
          No Once Per Game abilities have been used — nothing to restore.
        </div>
      ) : (
        <>
          <div className="reliquary-prompt">Select one ability to restore:</div>
          <div className="reliquary-list">
            {options.map(opt => (
              <button
                key={opt.key}
                className="status-item-btn"
                onClick={() => confirmReliquary(wi, opt.key)}
              >
                <strong className="status-item-name">{opt.label}</strong>
                <div className="status-item-desc">{opt.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  )
}
