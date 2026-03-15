import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTrackerStore } from './store/trackerStore'
import BuilderPage from './builder/BuilderPage'
import LandingPage from './builder/LandingPage'
import TrackerPage from './tracker/TrackerPage'
import Toast from './shared/Toast'
import { useBuilderStore } from './store/builderStore'

export default function App() {
  const trackerActive = useTrackerStore(s => s.active)
  const toast = useBuilderStore(s => s.toast)

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  const [view, setView] = useState(() =>
    window.location.hash ? 'builder' : 'landing'
  )
  const [pendingWizard, setPendingWizard] = useState(false)

  function goNew() { setPendingWizard(true); setView('builder') }
  function goLoad() { setView('builder') }

  return (
    <div className="app">
      {trackerActive
        ? <TrackerPage />
        : view === 'landing'
          ? <LandingPage onNew={goNew} onLoad={goLoad} />
          : <BuilderPage
              initialWizardOpen={pendingWizard}
              onWizardMounted={() => setPendingWizard(false)}
            />
      }
      {toast && <Toast message={toast} />}
      {needRefresh && (
        <div className="update-banner">
          <span>New version available</span>
          <button onClick={() => updateServiceWorker(true)}>Update</button>
        </div>
      )}
    </div>
  )
}
