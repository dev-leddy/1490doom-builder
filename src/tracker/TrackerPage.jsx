import { useTrackerStore } from '../store/trackerStore'
import TrackerTopbar from './TrackerTopbar'
import WarriorTrackerCard from './WarriorTrackerCard'
import WarriorTabBar from './WarriorTabBar'
import QuickRefPanel from './QuickRefPanel'
import MarkPopup from './MarkPopup'
import MarkAbilityModal from './MarkAbilityModal'
import ConfirmModal from '../shared/ConfirmModal'
import CacheLootModal from './CacheLootModal'
import StatusModal from './StatusModal'
import ReliquaryModal from './ReliquaryModal'
import './tracker.css'

export default function TrackerPage() {
  const {
    warriors, activeWarriorIdx,
    confirmModal, doConfirm, closeConfirm,
    cacheLootTarget, statusTarget,
    markPopupOpen, markAbilityModal,
    reliquaryModal,
    refOpen,
    companionStatusTarget, companionLootTarget, undoToast, doUndo, dismissUndo,
  } = useTrackerStore()

  const activeWarrior = warriors[activeWarriorIdx]

  return (
    <div className="tracker-shell">
      <TrackerTopbar />

      <div className="tracker-card-area">
        {activeWarrior && !refOpen ? (
          <div className="tk-cards-wrap">
            <WarriorTrackerCard warrior={activeWarrior} wi={activeWarriorIdx} />
          </div>
        ) : null}
      </div>

      <WarriorTabBar />

      {refOpen && <QuickRefPanel />}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          subtitle={confirmModal.subtitle}
          rules={confirmModal.rules}
          note={confirmModal.note}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={() => {
            doConfirm()
          }}
          onCancel={closeConfirm}
          className="tk-sheet tk-sheet--confirm"
        />
      )}
      {cacheLootTarget !== null && <CacheLootModal wi={cacheLootTarget} />}
      {statusTarget !== null && <StatusModal wi={statusTarget} />}
      {companionStatusTarget !== null && <StatusModal wi={companionStatusTarget} companion />}
      {companionLootTarget !== null && <CacheLootModal wi={companionLootTarget} companion />}
      {undoToast && (
        <div className="tk-undo-toast" role="status">
          <span className="tk-undo-msg">{undoToast.message}</span>
          <button className="tk-undo-btn" onClick={doUndo}>Undo</button>
          <button className="tk-undo-close" onClick={dismissUndo} aria-label="Dismiss">×</button>
        </div>
      )}
      {markPopupOpen && <MarkPopup />}
      {markAbilityModal && <MarkAbilityModal />}
      {reliquaryModal !== null && <ReliquaryModal />}
    </div>
  )
}
