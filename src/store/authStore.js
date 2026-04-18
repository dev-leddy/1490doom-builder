// ── Auth Store ────────────────────────────────────────────────────────────────
// Tracks the current authenticated user.
// status: 'loading' | 'authed' | 'guest'

import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  status: 'loading',

  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const user = await res.json()
        set({ user, status: 'authed' })
      } else {
        set({ user: null, status: 'guest' })
      }
    } catch {
      set({ user: null, status: 'guest' })
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    set({ user: null, status: 'guest' })
  },
}))
