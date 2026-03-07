import { useTrackerStore } from '../store/trackerStore'

export default function VitalityTrack({ wi, warrior: w }) {
  const hit = useTrackerStore(s => s.hit)

  return (
    <div className="tk-vit-row">
      {Array.from({ length: w.maxVit }, (_, i) => (
        <button
          key={i}
          className={`tk-vit-box ${i >= w.currentVit ? 'lost' : ''}`}
          onClick={() => hit(wi, i)}
          aria-label={`Vitality ${i + 1}`}
        />
      ))}
      <span className="tk-vit-count">{w.currentVit}/{w.maxVit}</span>
    </div>
  )
}
