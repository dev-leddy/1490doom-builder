// ── Cloud Game Sessions API ───────────────────────────────────────────────────
// In-progress play-mode games, one per company: /api/games/:companyId

const OPTS = { credentials: 'include' }
const url = companyId => `/api/games/${encodeURIComponent(companyId)}`

// Returns { savedAt, data } or null if there's no game in progress.
export async function loadGame(companyId) {
  const res = await fetch(url(companyId), OPTS)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`loadGame: ${res.status}`)
  return res.json()
}

// keepalive lets the request finish while the page is unloading.
export async function saveGame(companyId, data, { keepalive = false } = {}) {
  const res = await fetch(url(companyId), {
    ...OPTS,
    method: keepalive ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
    keepalive,
  })
  if (!res.ok) throw new Error(`saveGame: ${res.status}`)
}

export async function deleteGame(companyId) {
  const res = await fetch(url(companyId), { ...OPTS, method: 'DELETE' })
  if (!res.ok) throw new Error(`deleteGame: ${res.status}`)
}
