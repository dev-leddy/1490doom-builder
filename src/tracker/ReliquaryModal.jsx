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
      className="tk-sheet tk-sheet--reliquary"
      footer={
        <button className="tk-detail-btn tk-detail-btn--ghost" style={{ flex: 1 }} onClick={closeReliquaryModal}>
          {options.length === 0 ? 'CLOSE' : 'CANCEL'}
        </button>
      }
    >
      {options.length === 0 ? (
        <div className="tk-sheet-intro reliquary-empty-msg">
          No Once Per Game abilities have been used — nothing to restore.
        </div>
      ) : (
        <>
          <p className="tk-sheet-intro reliquary-prompt">
            <span className="tk-sheet-intro-label">Restore one</span>
            Pick a used Once Per Game ability for {w.customName || w.type} to use again.
          </p>
          <div className="reliquary-list tk-sheet-list">
            {options.map(opt => (
              <button
                key={opt.key}
                className="status-item-btn status-item-btn--restore"
                onClick={() => confirmReliquary(wi, opt.key)}
              >
                <strong className="status-item-name">
                  <span className="status-item-title">{opt.label}</span>
                  <span className="tk-sheet-chip">Used</span>
                </strong>
                <span className="status-item-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  )
}
