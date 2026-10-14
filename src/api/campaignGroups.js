// ── Shared campaigns (campaign groups) API ────────────────────────────────────
// Thin fetch wrappers for /api/campaign-groups. Errors carry .status and .code (the
// server's `error`) plus .message (a sentence for the player when the server sent one).

const BASE = '/api/campaign-groups'
const OPTS = { credentials: 'include' }

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...OPTS,
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `${method} ${path}: ${res.status}`)
    err.status = res.status
    err.code = data.error || null
    err.data = data
    throw err
  }
  return data
}

const enc = encodeURIComponent

// The shared campaign a company is in: { group, members }, or null when it isn't in one
export async function fetchGroupForCompany(companyId) {
  try {
    return await call(`?companyId=${enc(companyId)}`)
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

export const fetchGroup = groupId => call(`/${enc(groupId)}`)
export const createGroup = (companyId, name) => call('', { method: 'POST', body: { companyId, ...(name ? { name } : {}) } })
export const previewGroup = code => call(`/preview/${enc(code)}`)
export const joinGroup = (code, companyId) => call('/join', { method: 'POST', body: { code, companyId } })
export const rotateCode = groupId => call(`/${enc(groupId)}/code`, { method: 'POST' })
export const leaveGroup = (groupId, companyId) => call(`/${enc(groupId)}/members/${enc(companyId)}`, { method: 'DELETE' })
export const fetchMember = (groupId, companyId) => call(`/${enc(groupId)}/members/${enc(companyId)}`)

// A page of the members' merged activity: { events (each with companyId), nextAfter }
export function fetchGroupActivity(groupId, { after = 0, limit = 200, companyId } = {}) {
  const q = `after=${after}&limit=${limit}${companyId ? `&companyId=${enc(companyId)}` : ''}`
  return call(`/${enc(groupId)}/activity?${q}`)
}

// The invite link for a code: https://<host>/j/ABCD-2345
export const inviteLink = codeDisplay => `${window.location.origin}/j/${codeDisplay}`
