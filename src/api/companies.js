// ── Cloud Companies API ───────────────────────────────────────────────────────
// Thin fetch wrappers for the /api/companies endpoints.

const BASE = '/api/companies'
const OPTS = { credentials: 'include' }

export async function listCompanies() {
  const res = await fetch(BASE, OPTS)
  if (!res.ok) throw new Error(`listCompanies: ${res.status}`)
  const { companies } = await res.json()
  return companies  // [{ id, name, mode, saved_at, data }]
}

// Returns { status: 'ok', savedAt } | { status: 'conflict', company } | { status: 'forbidden' }.
// Throws on network errors and unexpected responses (caller retries).
// keepalive lets the request finish while the page is unloading.
// events: campaign activity events to store with this save (see store/campaignEvents.js).
export async function saveCompany({ id, name, mode, data, baseSavedAt, events }, { keepalive = false } = {}) {
  const res = await fetch(BASE, {
    ...OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, mode, data, baseSavedAt, ...(events?.length ? { events } : {}) }),
    keepalive,
  })
  if (res.status === 409) return { status: 'conflict', company: (await res.json()).company }
  if (res.status === 403) return { status: 'forbidden' }
  if (!res.ok) throw new Error(`saveCompany: ${res.status}`)
  const { savedAt } = await res.json()
  return { status: 'ok', savedAt }
}

// A page of a company's campaign activity log, oldest first: { events, nextAfter }.
// Pass nextAfter back as `after` for the next page (null when there are no more).
export async function fetchCompanyEvents(id, { after = 0, limit = 200 } = {}) {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}/events?after=${after}&limit=${limit}`, OPTS)
  if (!res.ok) throw new Error(`fetchCompanyEvents: ${res.status}`)
  return res.json()
}

export async function deleteCompany(id) {
  const res = await fetch(`${BASE}/${id}`, { ...OPTS, method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`deleteCompany: ${res.status}`)
}

export async function createShortLink(encoded) {
  const res = await fetch('/api/s', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encoded }),
  })
  if (!res.ok) throw new Error(`createShortLink: ${res.status}`)
  return res.json() // { code, url }
}
