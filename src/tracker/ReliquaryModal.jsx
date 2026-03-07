import { useTrackerStore, canRestoreWithReliquary } from '../store/trackerStore'
import { WARRIORS } from '../data/warriors'

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
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeReliquaryModal()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="tracker-modal-title">EXPEND RELIQUARY</div>

        {options.length === 0 ? (
          <>
            <div className="reliquary-empty-msg">
              No Once Per Game abilities have been used — nothing to restore.
            </div>
            <button className="btn btn-ghost btn-full" onClick={closeReliquaryModal}>CLOSE</button>
          </>
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
            <button className="btn btn-ghost btn-full" onClick={closeReliquaryModal}>CANCEL</button>
          </>
        )}
      </div>
    </div>
  )
}
