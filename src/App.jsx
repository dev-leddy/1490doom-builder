import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTrackerStore } from './store/trackerStore'
import BuilderPage from './builder/BuilderPage'
import TrackerPage from './tracker/TrackerPage'
import Toast from './shared/Toast'
import BetaBanner from './shared/BetaBanner'
import { useBuilderStore } from './store/builderStore'
import RestorePromptModal from './shared/RestorePromptModal'

export default function App() {
  const trackerActive = useTrackerStore(s => s.active)
  const showRestorePrompt = useTrackerStore(s => s.showRestorePrompt)
  const toast = useBuilderStore(s => s.toast)

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  return (
    <div className="app">
      {trackerActive ? <TrackerPage /> : <BuilderPage />}
      <BetaBanner />
      {toast && <Toast message={toast} />}
      {needRefresh && (
        <div className="update-banner">
          <span>New version available</span>
          <button onClick={() => updateServiceWorker(true)}>Update</button>
        </div>
      )}
      {showRestorePrompt && <RestorePromptModal />}
    </div>
  )
}
