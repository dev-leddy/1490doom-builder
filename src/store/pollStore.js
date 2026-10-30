import { create } from 'zustand'
import { POLL } from '../../functions/lib/poll.js'

// The in-app poll (questions: functions/lib/poll.js): a card on the landing page and a menu row,
// both only until the player answers. Never a popup.
const OPTS = { credentials: 'include' }

export const usePollStore = create(set => ({
  status: null,          // null (guest, or not loaded) | 'open' | 'answered'
  sheetOpen: false,

  async loadPoll() {
    try {
      const res = await fetch('/api/poll', OPTS)
      if (!res.ok) return set({ status: null })
      const { id, answered } = await res.json()
      set({ status: id !== POLL.id ? null : answered ? 'answered' : 'open' })
    } catch {
      set({ status: null })
    }
  },
  clearPoll() {
    set({ status: null, sheetOpen: false })
  },
  openPoll() {
    set({ sheetOpen: true })
  },
  closePoll() {
    set({ sheetOpen: false })
  },
  // true when saved (or this account had already answered); the sheet then thanks the player
  async sendPoll(answers) {
    try {
      const res = await fetch('/api/poll', {
        ...OPTS,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: POLL.id, answers }),
      })
      if (!res.ok && res.status !== 409) return false
      set({ status: 'answered' })
      return true
    } catch {
      return false
    }
  },
}))

export { POLL }
