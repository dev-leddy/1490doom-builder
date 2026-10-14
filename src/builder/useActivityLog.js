import { useEffect, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { fetchCompanyEvents } from '../api/companies'

// ── Loads a campaign company's activity log from the server ───────────────────
// Sends anything still queued first, so the newest changes are in the log, then reads
// every page. { events: null while loading, error, retry }.

const MAX_PAGES = 25 // 200 events each

export function useActivityLog(companyId) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    setError(false)
    ;(async () => {
      try {
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

  return { events, error, retry: () => { setEvents(null); setReload(n => n + 1) } }
}
