// ── Builder Save Persistence ──────────────────────────────────────────────────
// Helpers for reading/writing saved companies to localStorage.

const SAVES_KEY = 'doom_saves'

export function getSaves() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]') } catch { return [] }
}

export function setSaves(saves) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves))
}
