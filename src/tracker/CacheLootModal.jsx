import { useTrackerStore } from '../store/trackerStore'
import { CACHE_ITEMS } from '../data/items'

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
