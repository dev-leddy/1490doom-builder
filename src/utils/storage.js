const SESSION_PREFIX = '1490_tracker_session_'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function saveTrackerSession(state, companyId) {
  if (!companyId) return
  try {
    const key = SESSION_PREFIX + companyId
    const payload = {
      data: state,
      savedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save tracker session:', e)
  }
}

export function loadTrackerSession(companyId) {
  if (!companyId) return null
  try {
    const key = SESSION_PREFIX + companyId
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const { data, savedAt } = JSON.parse(raw)
    const age = Date.now() - savedAt

    if (age > SESSION_TTL_MS) {
      clearTrackerSession(companyId)
      return null
    }

    return data
  } catch (e) {
    console.warn('Failed to load tracker session:', e)
    return null
  }
}

export function clearTrackerSession(companyId) {
  if (!companyId) return
  try {
    const key = SESSION_PREFIX + companyId
    localStorage.removeItem(key)
  } catch (e) {
    console.warn('Failed to clear tracker session:', e)
  }
}

export function getSessionAge(companyId) {
  if (!companyId) return null
  try {
    const key = companyId.startsWith(SESSION_PREFIX) ? companyId : SESSION_PREFIX + companyId
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { savedAt } = JSON.parse(raw)
    return Date.now() - savedAt
  } catch (e) {
    return null
  }
}

export function hasStoredSession(companyId) {
  if (!companyId) return false
  const key = SESSION_PREFIX + companyId
  return localStorage.getItem(key) !== null
}

export function getStoredCompanyName() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(SESSION_PREFIX)) {
      return key.replace(SESSION_PREFIX, '')
    }
  }
  return null
}
