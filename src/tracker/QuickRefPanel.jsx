import { useTrackerStore } from '../store/trackerStore'
import QuickRef from '../shared/QuickRef'

export default function QuickRefPanel() {
  const closeRef = useTrackerStore(s => s.closeRef)

  return (
    <div className="tk-ref-overlay">
      <QuickRef onBack={closeRef} />
    </div>
  )
}
