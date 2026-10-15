import { useEffect, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { fetchCompanyEvents } from '../api/companies'
import { useCampaignGroupStore } from '../store/campaignGroupStore'

// ── Loads a campaign company's activity log from the server ───────────────────
// Sends anything still queued first, so the newest changes are in the log, then reads
// every page. { events: null while loading, error, retry, refresh }.

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

  return {
    events, error,
    retry: () => { setEvents(null); setReload(n => n + 1) },   // after an error: show loading again
    refresh: () => setReload(n => n + 1),                      // after a change: keep the rows on show
  }
}

// ── The other players of a shared campaign, for the log ───────────────────────
// Loads the group of `companyId` (if any), the merged activity of its members, and each
// other active member's company (read-only, for their game cards and their fallen).
// Never needed for your own log: failures only show as a note.
// → { inGroup, status: 'idle' | 'loading' | 'none' | 'ready' | 'error', members, others,
//     events (other members' events, tagged with companyId), companies: { [companyId]:
//     { status: 'loading' | 'ready' | 'error', company } }, error, retry }
export function useGroupLog(companyId, { enabled = true } = {}) {
  const { status, group, members, feed, error: groupError } = useCampaignGroupStore()
  const [feedError, setFeedError] = useState(null)
  const [companies, setCompanies] = useState({})
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!enabled || !companyId) return
    let live = true
    setFeedError(null)
    ;(async () => {
      const store = useCampaignGroupStore.getState
      await store().refresh(companyId) // always: the company may have joined or left since
      if (!live || !store().group) return
      const err = await store().loadFeed()
      if (live && err) setFeedError(err)
    })()
    return () => { live = false }
  }, [companyId, enabled, reload])

  const groupId = group?.id ?? null
  const others = groupId ? members.filter(m => !m.leftAt && m.companyId !== companyId) : []
  const otherIds = others.map(m => m.companyId).join('|')
  useEffect(() => {
    if (!enabled || !groupId || !otherIds) return
    let live = true
    for (const id of otherIds.split('|')) {
      setCompanies(c => ({ ...c, [id]: { status: 'loading', company: c[id]?.company ?? null } }))
      useCampaignGroupStore.getState().loadMember(id)
        .then(res => { if (live) setCompanies(c => ({ ...c, [id]: { status: 'ready', company: res.company } })) })
        .catch(() => { if (live) setCompanies(c => ({ ...c, [id]: { status: 'error', company: c[id]?.company ?? null } })) })
    }
    return () => { live = false }
  }, [enabled, groupId, otherIds, reload])

  const inGroup = enabled && !!groupId && useCampaignGroupStore.getState().companyId === companyId
  const otherSet = new Set(others.map(m => m.companyId))
  return {
    inGroup,
    status: !enabled ? 'idle' : status,
    members: inGroup ? members.filter(m => !m.leftAt) : [],
    others: inGroup ? others : [],
    events: inGroup ? feed.filter(e => otherSet.has(e.companyId)) : [],
    companies,
    error: groupError || feedError,
    retry: () => setReload(n => n + 1),
  }
}
