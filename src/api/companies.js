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

export async function saveCompany({ id, name, mode, data }) {
  const res = await fetch(BASE, {
    ...OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, mode, data }),
  })
  if (!res.ok) throw new Error(`saveCompany: ${res.status}`)
  return res.json()
}

export async function deleteCompany(id) {
  const res = await fetch(`${BASE}/${id}`, { ...OPTS, method: 'DELETE' })
  if (!res.ok) throw new Error(`deleteCompany: ${res.status}`)
  return res.json()
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
