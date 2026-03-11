import { useTrackerStore } from '../store/trackerStore'
import { ITEM_ICONS } from '../data/images'

export default function CacheBlock({ wi, warrior: w }) {
  const useCacheItem = useTrackerStore(s => s.useCacheItem)

  return (
    <div className="tk-abilities-block">
      {w.cacheItems.map(item => (
        <div
          key={item.id}
          className="tk-ability"
          style={{ cursor: 'pointer', borderLeftColor: '#4a8a4a' }}
          onClick={() => useCacheItem(wi, item.id)}
        >
          <div className="tk-ability-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {ITEM_ICONS[item.name] && (
                <img src={ITEM_ICONS[item.name]} style={{ width: '1.1rem', height: '1.1rem', filter: 'brightness(0) invert(1)', opacity: 0.9 }} alt="" />
              )}
              <span className="tk-ability-name">{item.name}</span>
            </div>
            <span className="tk-opg-badge" style={{ borderColor: '#2a5a2a', color: '#4a9a4a', background: '#0a1a0a' }}>
              EXPEND
            </span>
          </div>
          <div className="tk-ability-desc">{item.desc}</div>
        </div>
      ))}
    </div>
  )
}
