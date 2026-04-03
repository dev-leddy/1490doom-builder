import BottomSheet from './BottomSheet'
import { useTrackerStore } from '../store/trackerStore'
import { useBuilderStore } from '../store/builderStore'
import { getSessionAge, clearTrackerSession, getStoredCompanyName } from '../utils/storage'

function formatAge(ms) {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`
  return 'just now'
}

export default function RestorePromptModal() {
  const { setShowRestorePrompt, restoreSession, openTracker } = useTrackerStore()
  const builderState = useBuilderStore(s => s)
  const storedName = getStoredCompanyName()
  const companyName = storedName || builderState.companyName
  const age = getSessionAge(companyName)
  const ageStr = age ? formatAge(age) : null

  const handleRestore = () => {
    setShowRestorePrompt(false)
    restoreSession(companyName)
  }

  const handleNewGame = () => {
    setShowRestorePrompt(false)
    clearTrackerSession(companyName)
    openTracker(builderState)
  }

  return (
    <BottomSheet
      title="RESUME GAME?"
      onClose={handleNewGame}
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <button
            onClick={handleRestore}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#2d7a3e',
              border: '1px solid #1a5c2a',
              color: '#fff',
              fontFamily: "'Oswald', sans-serif",
              fontSize: '1.1rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            RESTORE GAME
          </button>
          <button
            onClick={handleNewGame}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#be4127',
              border: '1px solid #8a2a1a',
              color: '#fff',
              fontFamily: "'Oswald', sans-serif",
              fontSize: '1.1rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            NEW GAME
          </button>
        </div>
      }
      >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {ageStr && (
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            Last played {ageStr}
          </div>
        )}
        <p style={{ color: '#fff', margin: 0 }}>
          Restore previous game or start fresh?
        </p>
      </div>
    </BottomSheet>
  )
}
