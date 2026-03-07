import { useTrackerStore } from './store/trackerStore'
import BuilderPage from './builder/BuilderPage'
import TrackerPage from './tracker/TrackerPage'
import Toast from './shared/Toast'
import { useBuilderStore } from './store/builderStore'

export default function App() {
  const trackerActive = useTrackerStore(s => s.active)
  const toast = useBuilderStore(s => s.toast)

  return (
    <div className="app">
      {trackerActive ? <TrackerPage /> : <BuilderPage />}
      {toast && <Toast message={toast} />}
    </div>
  )
}
