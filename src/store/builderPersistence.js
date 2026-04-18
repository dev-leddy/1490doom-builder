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
    // Mark as cloud-synced in localStorage so it's never flagged as local-only
    const saves = getSaves()
    const idx = saves.findIndex(s => s.id === saveEntry.id || s.companyId === saveEntry.id)
    if (idx !== -1 && !saves[idx].cloudSynced) {
      saves[idx] = { ...saves[idx], cloudSynced: true }
      setSaves(saves)
    }
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
// Marks each successfully uploaded save with cloudSynced:true in localStorage
// so the user isn't prompted again on future logins.
export async function pushLocalSavesToCloud(getUser) {
  if (!getUser()) return 0
  const local = getSaves()
  if (!local.length) return 0
  let count = 0
  const updated = local.map(s => ({ ...s }))
  for (let i = 0; i < updated.length; i++) {
    const save = updated[i]
    try {
      await saveCompany({
        id: save.companyId || save.id,
        name: save.companyName || save.name,
        mode: save.companyMode || 'standard',
        data: save,
      })
      updated[i].cloudSynced = true
      count++
    } catch (err) {
      console.warn('[cloud sync] push failed for', save.companyName, err)
    }
  }
  setSaves(updated)
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
