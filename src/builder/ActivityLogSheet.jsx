import { useEffect, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { fetchCompanyEvents } from '../api/companies'
import BottomSheet from '../shared/BottomSheet'
import { FILTERS, matchesFilter, undoneIds, groupEvents, describeEvent, eventTime } from './activityLog'
import './styles/activity-log.css'

// ── Campaign activity log ─────────────────────────────────────────────────────
// Everything that happened in a campaign company, as stored on the server: grouped by
// "Before game N" (newest first), with filter chips. Undone entries are struck through,
// and events sent with a save that lost to another device are marked as not saved.

const MAX_PAGES = 25 // 200 events each

// The log itself (filters, groups, rows). Also the "All activity" tab of the campaign log.
export function ActivityLogBody({ companyId }) {
  const [events, setEvents] = useState(null)   // null = loading
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    setError(false)
    ;(async () => {
      try {
        // Send anything still queued first, so the newest changes are in the log
        await useBuilderStore.getState().flushSaves()
        const all = []
        let after = 0
        for (let page = 0; page < MAX_PAGES && after != null; page++) {
          const res = await fetchCompanyEvents(companyId, { after })
          all.push(...res.events)
          after = res.nextAfter
        }
        if (live) setEvents(all)
      } catch {
        if (live) setError(true)
      }
    })()
    return () => { live = false }
  }, [companyId, reload])

  const undone = events ? undoneIds(events) : new Set()
  const groups = events ? groupEvents(events.filter(e => matchesFilter(e, filter))) : []

  return (
    <>
      <div className="al-filters" role="group" aria-label="Show">
        {FILTERS.map(f => (
          <button key={f.id} type="button" className={`al-chip${filter === f.id ? ' is-active' : ''}`}
            aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {error && (
        <p className="al-empty">
          Couldn't load the log. Check your connection.{' '}
          <button type="button" className="al-retry" onClick={() => { setEvents(null); setReload(n => n + 1) }}>Try again</button>
        </p>
      )}
      {!error && events == null && <p className="al-empty">Loading…</p>}
      {!error && events != null && groups.length === 0 && (
        <p className="al-empty">{events.length ? 'Nothing of this kind yet.' : 'Nothing logged yet. Changes to this campaign show up here.'}</p>
      )}

      {groups.map(g => (
        <section key={g.afterGame} className="al-group" data-after-game={g.afterGame}>
          <h3 className="al-group-title">{g.title}</h3>
          <ol className="al-rows">
            {g.events.map(e => {
              const { icon, text, sub } = describeEvent(e)
              const isUndone = undone.has(e.id)
              const rejected = e.status === 'rejected'
              return (
                <li key={e.id} data-type={e.type}
                  className={`al-row${isUndone ? ' is-undone' : ''}${rejected ? ' is-rejected' : ''}`}>
                  <span className="al-icon" aria-hidden="true">{icon}</span>
                  <span className="al-main">
                    <span className="al-text">
                      <span className="al-text-body">{text}</span>
                      {isUndone && <span className="al-tag">Undone</span>}
                    </span>
                    {rejected
                      ? <span className="al-sub al-sub--warn">Not saved: replaced by changes from another device</span>
                      : sub && <span className="al-sub">{sub}</span>}
                  </span>
                  <time className="al-time" dateTime={new Date(e.at || e.serverAt).toISOString()}>{eventTime(e.at || e.serverAt)}</time>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </>
  )
}

export default function ActivityLogSheet({ companyId, onClose }) {
  return (
    <BottomSheet title="ACTIVITY LOG" onClose={onClose} className="al-sheet"
      footer={<button className="co-sheet-done" onClick={onClose}>Done</button>}>
      <ActivityLogBody companyId={companyId} />
    </BottomSheet>
  )
}
