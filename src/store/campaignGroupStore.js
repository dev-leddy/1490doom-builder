// ── Shared campaign (campaign group) of the open company ──────────────────────
// Server state only: the group, its members and their merged activity feed. Nothing here is
// saved locally (companies and groups are cloud-only). Actions resolve to an error message
// for the player, or null when they worked.

import { useEffect } from 'react'
import { create } from 'zustand'
import * as api from '../api/campaignGroups'

const POLL_MS = 30_000
const MAX_FEED_PAGES = 10 // 200 events each

const EMPTY = { companyId: null, group: null, members: [], feed: [], lastSeq: 0, status: 'idle', error: null }

const message = (err, fallback) => (err?.data?.message || (err?.status ? fallback : "Couldn't reach the server. Check your connection."))

export const useCampaignGroupStore = create((set, get) => ({
  ...EMPTY,
  // status: 'idle' | 'loading' | 'none' (not in a group) | 'ready' | 'error'

  // Loads the group of `companyId` (or the current one). Switching company clears the old group.
  async refresh(companyId = get().companyId) {
    if (!companyId) { set(EMPTY); return null }
    const switching = companyId !== get().companyId
    if (switching) set({ ...EMPTY, companyId, status: 'loading' })
    try {
      const res = await api.fetchGroupForCompany(companyId)
      if (get().companyId !== companyId) return null // the company changed meanwhile
      if (!res) { set({ ...EMPTY, companyId, status: 'none' }); return null }
      const sameGroup = get().group?.id === res.group.id
      set({ group: res.group, members: res.members, status: 'ready', error: null, ...(sameGroup ? {} : { feed: [], lastSeq: 0 }) })
      return null
    } catch (err) {
      if (get().companyId === companyId && switching) set({ status: 'error', error: message(err, "Couldn't load the shared campaign.") })
      return message(err, "Couldn't load the shared campaign.")
    }
  },

  async createGroup(companyId, name) {
    try {
      const res = await api.createGroup(companyId, name)
      set({ ...EMPTY, companyId, group: res.group, members: res.members, status: 'ready' })
      return null
    } catch (err) {
      if (err.code === 'in_group') get().refresh(companyId)
      return message(err, "Couldn't start the shared campaign.")
    }
  },

  // Joins with `companyId`; the store then shows that company's group
  async joinGroup(code, companyId) {
    try {
      const res = await api.joinGroup(code, companyId)
      set({ ...EMPTY, companyId, group: res.group, members: res.members, status: 'ready' })
      return null
    } catch (err) {
      return message(err, "Couldn't join the shared campaign.")
    }
  },

  async leaveGroup() {
    const { group, companyId } = get()
    if (!group) return null
    try {
      await api.leaveGroup(group.id, companyId)
      set({ ...EMPTY, companyId, status: 'none' })
      return null
    } catch (err) {
      if (err.status === 404) { set({ ...EMPTY, companyId, status: 'none' }); return null }
      return message(err, "Couldn't leave the shared campaign.")
    }
  },

  async rotateCode() {
    const { group } = get()
    if (!group) return null
    try {
      const res = await api.rotateCode(group.id)
      set({ group: res.group })
      return null
    } catch (err) {
      if (err.status === 403) get().refresh()
      return message(err, "Couldn't make a new code.")
    }
  },

  // New activity from every member since the last call, appended to feed (oldest first)
  async loadFeed() {
    const { group } = get()
    if (!group) return null
    const groupId = group.id
    try {
      let after = get().lastSeq
      const fresh = []
      for (let page = 0; page < MAX_FEED_PAGES && after != null; page++) {
        const res = await api.fetchGroupActivity(groupId, { after })
        fresh.push(...res.events)
        if (res.events.length) after = res.events.at(-1).seq
        if (res.nextAfter == null) break
      }
      if (get().group?.id !== groupId) return null
      if (fresh.length) {
        const seen = new Set(get().feed.map(e => e.id))
        set({ feed: [...get().feed, ...fresh.filter(e => !seen.has(e.id))], lastSeq: fresh.at(-1).seq })
      }
      return null
    } catch (err) {
      if (err.status === 403) get().refresh()
      return message(err, "Couldn't load the activity.")
    }
  },

  // A member's company, read-only: { member, company } (not kept in the store).
  // Throws with .status (403 when either side has left).
  loadMember(companyId) {
    const { group } = get()
    if (!group) return Promise.reject(Object.assign(new Error('Not in a shared campaign'), { status: 403 }))
    return api.fetchMember(group.id, companyId)
  },

  clear() { set(EMPTY) },
}))

// Keeps the group of `companyId` fresh: loads it now, then every 30 seconds while the page
// is visible (and right away when it becomes visible again). Pass null to stop.
export function useCampaignGroupPolling(companyId, { feed = false } = {}) {
  useEffect(() => {
    if (!companyId) return
    const store = useCampaignGroupStore.getState
    let timer = null
    const tick = async () => {
      await store().refresh(companyId)
      if (feed && store().group) await store().loadFeed()
    }
    const start = () => { clearInterval(timer); timer = setInterval(() => { if (document.visibilityState === 'visible') tick() }, POLL_MS) }
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    tick()
    start()
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [companyId, feed])
}
