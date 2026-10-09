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

  // Resolves to null on success, or an error message to show
  updateDisplayName: async (displayName) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return data.error || 'Could not save the name'
      set(state => ({ user: state.user ? { ...state.user, username: data.username } : state.user }))
      return null
    } catch {
      return 'Could not save the name (offline?)'
    }
  },

  updateAvatar: async (avatarKey) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatar: avatarKey }),
      })
      if (res.ok) {
        set(state => ({ user: state.user ? { ...state.user, avatar_url: avatarKey } : state.user }))
      }
    } catch { /* ignore */ }
  },
}))
