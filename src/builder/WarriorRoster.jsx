import { useBuilderStore } from '../store/builderStore'
import WarriorCard from './WarriorCard'

export default function WarriorRoster() {
  const slots = useBuilderStore(s => s.slots)

  return (
    <div className="warriors-grid">
      {slots.map((slot, i) => (
        <WarriorCard key={i} slotIndex={i} slot={slot} />
      ))}
    </div>
  )
}
