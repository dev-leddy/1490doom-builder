import { useTrackerStore } from '../store/trackerStore'
import { CACHE_ITEMS } from '../data/items'
import { ITEM_ICONS } from '../data/images'
import BottomSheet from '../shared/BottomSheet'

export default function CacheLootModal({ wi }) {
  const { addCacheItem, closeCacheLoot, warriors } = useTrackerStore()

  return (
    <BottomSheet
      title="RESOURCE CACHE"
      onClose={closeCacheLoot}
      className="tk-sheet tk-sheet--cache"
    >
      <p className="tk-sheet-intro">
        <span className="tk-sheet-intro-label">Roll 1D6</span>
        Tap the result to give it to {warriors[wi]?.customName || warriors[wi]?.type}.
      </p>
      <div className="tk-sheet-list">
      {CACHE_ITEMS.map(item => (
        <button
          key={item.roll}
          className="cache-item-btn"
          onClick={() => addCacheItem(wi, item.roll)}
        >
          <span className="cache-item-roll" aria-label={`Roll ${item.roll}`}>{item.roll}</span>
          <span className="cache-item-main">
            <span className="cache-item-header">
              {ITEM_ICONS[item.name] && (
                <img src={ITEM_ICONS[item.name]} className="tk-sheet-item-icon" alt="" />
              )}
              <strong className="cache-item-name">{item.name}</strong>
            </span>
            <span className="cache-item-desc">{item.desc}</span>
          </span>
        </button>
      ))}
      </div>
    </BottomSheet>
  )
}
