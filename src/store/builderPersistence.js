// ── Builder Save Persistence ──────────────────────────────────────────────────
// Reads/writes saved companies to localStorage.
// When the user is authenticated, changes are also synced to the cloud API.

import { listCompanies, saveCompany, deleteCompany } from '../api/companies.js'

const SAVES_KEY = 'doom_saves'

export function getSaves() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]') } catch { return [] }
}

export function setSaves(saves) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves))
}

// ── Cloud sync helpers ─────────────────────────────────────────────────────────

// Call after saving a company locally to also push it to the cloud.
// getUser() should return the current user from authStore, or null.
export async function syncSaveToCloud(saveEntry, getUser) {
  if (!getUser()) return
  const id = saveEntry.id || saveEntry.companyId
  const name = saveEntry.name || saveEntry.companyName
  try {
    await saveCompany({
      id,
      name,
      mode: saveEntry.companyMode || saveEntry.data?.companyMode || 'standard',
      data: saveEntry,
    })
    // Mark local copy as synced so the upload-prompt doesn't re-trigger
    const saves = getSaves()
    const idx = saves.findIndex(s => (s.companyId || s.id) === id)
    if (idx >= 0) { saves[idx] = { ...saves[idx], cloudSynced: true }; setSaves(saves) }
  } catch (err) {
    console.warn('[cloud sync] save failed:', err)
  }
}

// Call after deleting a company locally to also remove it from the cloud.
export async function syncDeleteFromCloud(companyId, getUser) {
  if (!getUser()) return
  try {
    await deleteCompany(companyId)
  } catch (err) {
    console.warn('[cloud sync] delete failed:', err)
  }
}

// Push all local saves to cloud (called on login if user has local saves).
// Removes each successfully uploaded save from localStorage so the user
// isn't prompted again. Caller should re-run mergeCloudSaves() afterwards
// to pull them back from cloud into the current session.
export async function pushLocalSavesToCloud(getUser) {
  if (!getUser()) return 0
  const local = getSaves()
  if (!local.length) return 0
  let count = 0
  const remaining = []
  for (const save of local) {
    try {
      await saveCompany({
        id: save.companyId || save.id,
        name: save.companyName || save.name,
        mode: save.companyMode || 'standard',
        data: save,
      })
      count++
      // Successfully uploaded — drop from local storage
    } catch (err) {
      console.warn('[cloud sync] push failed for', save.companyName, err)
      remaining.push(save)
    }
  }
  setSaves(remaining)
  return count
}

// Merge cloud saves into localStorage on first authenticated load.
// Cloud wins on same id; unique locals are kept.
// Returns the merged array and writes it to localStorage.
export async function mergeCloudSaves(getUser) {
  if (!getUser()) return getSaves()
  try {
    const cloudSaves = await listCompanies()
    const local = getSaves()
    // Key by companyId OR id — handles both old and new save formats
    const localById = {}
    for (const s of local) {
      const key = s.companyId || s.id
      if (key) localById[key] = s
    }

    for (const cloud of cloudSaves) {
      // cloud.data is the full save entry; fall back to cloud.id as key
      const entry = cloud.data
      const key = (entry?.companyId || entry?.id) || cloud.id
      if (key) {
        // Cloud wins on conflict; mark as synced either way
        localById[key] = { ...(entry || {}), companyId: key, cloudSynced: true }
      }
    }

    const merged = Object.values(localById).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    setSaves(merged)
    return merged
  } catch (err) {
    console.warn('[cloud sync] merge failed:', err)
    return getSaves()
  }
}
