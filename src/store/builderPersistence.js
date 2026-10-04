// ── Builder Save Persistence ──────────────────────────────────────────────────
// Companies live in the cloud only (/api/companies); nothing is kept in
// localStorage. Edits are queued per company and saved after a short debounce,
// one request at a time, retrying while offline.
//
// Stale-save guard: every save sends the saved_at we last read or wrote for that
// company. If another tab/device saved since, the server answers 409 with its
// copy and we adopt it rather than overwrite it.

import { listCompanies, saveCompany, deleteCompany } from '../api/companies.js'
import { saveGame } from '../api/games.js'

const DEBOUNCE_MS = 1500
const RETRY_MS = 5000

// companyId → saved_at of the copy last read from / written to the server
const baseSavedAt = new Map()

// Builder state → the save entry stored in companies.data
export function snapshotCompany(state) {
  const { mark, companyName, companyAvatar, ipLimit, slots, companyId, companyMode, campaignGame } = state
  return { mark, companyName, companyAvatar, ipLimit, slots, companyId, companyMode, campaignGame }
}

// API row → save entry used by the saved-companies list
function rowToSave(row) {
  return { ...row.data, companyId: row.id, companyName: row.data?.companyName ?? row.name, savedAt: row.saved_at }
}

function payloadFor(snapshot) {
  return {
    id: snapshot.companyId,
    name: snapshot.companyName?.trim() || 'Unnamed Company',
    mode: snapshot.companyMode || 'standard',
    data: snapshot,
    baseSavedAt: baseSavedAt.get(snapshot.companyId) ?? null,
  }
}

export async function fetchCloudSaves() {
  const rows = await listCompanies()
  baseSavedAt.clear()
  for (const row of rows) baseSavedAt.set(row.id, row.saved_at)
  return rows.map(rowToSave)
}

export async function removeCloudCompany(companyId) {
  await deleteCompany(companyId)
  baseSavedAt.delete(companyId)
}

// ── Auto-save queue ───────────────────────────────────────────────────────────
// onStatus('saving' | 'saved' | 'offline')
// onSaved(snapshot, savedAt) — server accepted the save
// onConflict(save)            — server had a newer copy; adopt it
// onForbidden(snapshot)       — id belongs to another account; return a new id
export function createSaver({ onStatus, onSaved, onConflict, onForbidden }) {
  const pending = new Map() // companyId → latest snapshot not yet saved
  let timer = null
  let running = null        // promise of the current flush loop

  function schedule(snapshot) {
    pending.set(snapshot.companyId, snapshot)
    onStatus('saving')
    clearTimeout(timer)
    timer = setTimeout(flush, DEBOUNCE_MS)
  }

  function flush() {
    clearTimeout(timer)
    if (!running) running = run().finally(() => { running = null })
    return running
  }

  async function run() {
    while (pending.size) {
      const [id, snapshot] = pending.entries().next().value
      pending.delete(id)
      try {
        const result = await saveCompany(payloadFor(snapshot))
        if (result.status === 'ok') {
          baseSavedAt.set(id, result.savedAt)
          onSaved(snapshot, result.savedAt)
        } else if (result.status === 'conflict') {
          baseSavedAt.set(id, result.company.saved_at)
          pending.delete(id) // edits made meanwhile were based on the stale copy too
          onConflict(rowToSave(result.company))
        } else if (result.status === 'forbidden') {
          const moved = onForbidden(snapshot)
          if (moved) pending.set(moved.companyId, moved)
        }
      } catch (err) {
        console.warn('[cloud save] failed, will retry:', err)
        if (!pending.has(id)) pending.set(id, snapshot)
        onStatus('offline')
        timer = setTimeout(flush, RETRY_MS)
        return
      }
    }
    onStatus('saved')
  }

  // Page is closing: send whatever is still queued without waiting.
  function flushOnUnload() {
    clearTimeout(timer)
    for (const snapshot of pending.values()) {
      saveCompany(payloadFor(snapshot), { keepalive: true }).catch(() => {})
    }
    pending.clear()
  }

  function cancel() {
    clearTimeout(timer)
    pending.clear()
  }

  return { schedule, flush, flushOnUnload, cancel, hasPending: () => pending.size > 0 || !!running }
}

// ── One-time migration of browser data ────────────────────────────────────────
// Before cloud-only saves, companies and play-mode games lived in localStorage.
// On login, upload whatever is still there (skipping companies whose cloud copy
// is newer), then remove it from the browser. Items that fail to upload stay put
// and are retried on the next login.

const LEGACY_SAVES_KEY = 'doom_saves'
const LEGACY_DRAFT_KEY = 'doom_draft'
const LEGACY_GAME_PREFIX = '1490_tracker_session_'

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export function hasLegacyLocalData() {
  try {
    if (localStorage.getItem(LEGACY_SAVES_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY)) return true
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(LEGACY_GAME_PREFIX)) return true
    }
  } catch { /* storage unavailable */ }
  return false
}

// Returns the number of companies uploaded.
export async function migrateLocalData(cloudSaves) {
  if (!hasLegacyLocalData()) return 0

  const local = readJSON(LEGACY_SAVES_KEY, [])
  const draft = readJSON(LEGACY_DRAFT_KEY, null)
  if (draft?.companyId && !local.some(s => s.companyId === draft.companyId)) local.push(draft)

  const cloudById = new Map(cloudSaves.map(s => [s.companyId, s]))
  const failed = []
  let moved = 0

  for (const save of local) {
    if (!save?.companyId || !save.slots?.some(s => s?.type)) continue // nothing worth keeping
    const cloud = cloudById.get(save.companyId)
    if (cloud && cloud.savedAt >= (save.savedAt || 0)) continue      // cloud copy is newer
    const { cloudSynced: _ignored, savedAt: _localTime, ...data } = save
    try {
      let result = await saveCompany(payloadFor(data))
      if (result.status === 'forbidden') {
        data.companyId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
        result = await saveCompany(payloadFor(data))
      }
      if (result.status === 'ok') moved++
    } catch {
      failed.push(save)
    }
  }

  try {
    if (failed.length) localStorage.setItem(LEGACY_SAVES_KEY, JSON.stringify(failed))
    else localStorage.removeItem(LEGACY_SAVES_KEY)
    localStorage.removeItem(LEGACY_DRAFT_KEY)
  } catch { /* storage unavailable */ }

  // In-progress games (keyed by company name in the old format)
  const gameKeys = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(LEGACY_GAME_PREFIX)) gameKeys.push(key)
    }
  } catch { /* storage unavailable */ }
  for (const key of gameKeys) {
    const game = readJSON(key, null)?.data
    try {
      if (game?.companyId && game.active) await saveGame(game.companyId, game)
      localStorage.removeItem(key)
    } catch { /* keep it for next time */ }
  }

  return moved
}
