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
  try {
    await saveCompany({
      id: saveEntry.id,
      name: saveEntry.name,
      mode: saveEntry.data?.companyMode || 'standard',
      data: saveEntry,
    })
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
    const localById = Object.fromEntries(local.map(s => [s.id, s]))

    for (const cloud of cloudSaves) {
      // cloud.data is the full save entry (we stored the whole saveEntry as data)
      const entry = cloud.data
      if (entry && entry.id) {
        localById[entry.id] = entry
      }
    }

    const merged = Object.values(localById).sort((a, b) => b.savedAt - a.savedAt)
    setSaves(merged)
    return merged
  } catch (err) {
    console.warn('[cloud sync] merge failed:', err)
    return getSaves()
  }
}
