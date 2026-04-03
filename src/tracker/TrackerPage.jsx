import { useTrackerStore } from '../store/trackerStore'
import TrackerTopbar from './TrackerTopbar'
import WarriorTrackerCard from './WarriorTrackerCard'
import WarriorTabBar from './WarriorTabBar'
import QuickRefPanel from './QuickRefPanel'
import MarkPopup from './MarkPopup'
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
    markPopupOpen,
    reliquaryModal,
    refOpen,
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
          onConfirm={() => {
            doConfirm()
          }}
          onCancel={closeConfirm}
        />
      )}
      {cacheLootTarget !== null && <CacheLootModal wi={cacheLootTarget} />}
      {statusTarget !== null && <StatusModal wi={statusTarget} />}
      {markPopupOpen && <MarkPopup />}
      {reliquaryModal !== null && <ReliquaryModal />}
    </div>
  )
}
