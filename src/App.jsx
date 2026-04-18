import { useEffect, useState } from 'react'
import { useTrackerStore } from './store/trackerStore'
import BuilderPage from './builder/BuilderPage'
import TrackerPage from './tracker/TrackerPage'
import Toast from './shared/Toast'
import BetaBanner from './shared/BetaBanner'
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
    const rawHash = window.location.hash
    let hash = rawHash.slice(1)
    
    // URL-decode the hash
    try {
      hash = decodeURIComponent(hash)
    } catch {}
    
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
        <BuilderPage initialView="builder" />
        <BetaBanner />
        {toast && <Toast message={toast} />}
        <span className="app-version">v{__APP_VERSION__}</span>
      </div>
    )
  }

  // ?quiz=<payload> means user returned from standalone quiz at /quiz — force-show beta banner
  const fromStandaloneQuiz = new URLSearchParams(window.location.search).has('quiz')

  return (
    <div className="app">
      {trackerActive ? <TrackerPage /> : <BuilderPage initialView={returnToBuilder ? 'builder' : undefined} />}
      <BetaBanner forceShow={fromStandaloneQuiz} />
      {toast && <Toast message={toast} />}
      {showRestorePrompt && <RestorePromptModal />}
      <span className="app-version">v{__APP_VERSION__}</span>
    </div>
  )
}
