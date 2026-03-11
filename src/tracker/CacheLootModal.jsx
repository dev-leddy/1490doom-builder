import { useTrackerStore } from '../store/trackerStore'
import { CACHE_ITEMS } from '../data/items'
import { ITEM_ICONS } from '../data/images'

export default function CacheLootModal({ wi }) {
  const { addCacheItem, closeCacheLoot } = useTrackerStore()

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeCacheLoot()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="tracker-modal-title">RESOURCE CACHE — PICK ITEM</div>
        {CACHE_ITEMS.map(item => (
          <button
            key={item.roll}
            className="cache-item-btn"
            onClick={() => addCacheItem(wi, item.roll)}
          >
            <div className="cache-item-header">
              <span className="cache-item-roll">{item.roll}</span>
              {ITEM_ICONS[item.name] && (
                <img src={ITEM_ICONS[item.name]} style={{ width: '1.2rem', height: '1.2rem', filter: 'brightness(0) invert(1)', opacity: 0.9, flexShrink: 0 }} alt="" />
              )}
              <strong className="cache-item-name">{item.name}</strong>
            </div>
            <div className="cache-item-desc">{item.desc}</div>
          </button>
        ))}
        <button className="btn btn-ghost btn-full" onClick={closeCacheLoot}>CANCEL</button>
      </div>
    </div>
  )
}
