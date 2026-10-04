import { useEffect, useState } from 'react'
import { useTrackerStore } from './store/trackerStore'
import BuilderPage from './builder/BuilderPage'
import TrackerPage from './tracker/TrackerPage'
import Toast from './shared/Toast'
import { useBuilderStore } from './store/builderStore'
import { decodeCompany } from './store/builderEncoding'
import RestorePromptModal from './shared/RestorePromptModal'

export default function App() {
  const trackerActive = useTrackerStore(s => s.active)
  const returnToBuilder = useTrackerStore(s => s.returnToBuilder)
  const showRestorePrompt = useTrackerStore(s => s.showRestorePrompt)
  const toast = useBuilderStore(s => s.toast)
  const { doImport } = useBuilderStore()
  const [hashLoaded, setHashLoaded] = useState(false)

  useEffect(() => {
    // Check sessionStorage first (set by /s/:code short link handler)
    let pending = null
    try {
      pending = sessionStorage.getItem('__pendingShare')
      if (pending) sessionStorage.removeItem('__pendingShare')
    } catch {}

    const rawHash = window.location.hash
    let hash = pending || rawHash.slice(1)
    try { hash = decodeURIComponent(hash) } catch {}

    if (hash) {
      const decoded = decodeCompany(hash)
      if (decoded) {
        doImport(hash)
        setHashLoaded(true)
      }
    }
  }, [])

  if (hashLoaded) {
    return (
      <div className="app">
        <BuilderPage key="shared" initialView="builder" />
        {toast && <Toast message={toast} />}
        <span className="app-version">v{__APP_VERSION__}</span>
      </div>
    )
  }

  return (
    <div className="app">
      {trackerActive ? <TrackerPage /> : <BuilderPage initialView={returnToBuilder ? 'builder' : undefined} />}
      {toast && <Toast message={toast} />}
      {showRestorePrompt && <RestorePromptModal />}
      <span className="app-version">v{__APP_VERSION__}</span>
    </div>
  )
}
