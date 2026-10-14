// ── Builder Save Persistence ──────────────────────────────────────────────────
// Companies live in the cloud only (/api/companies); nothing is kept in
// localStorage. Edits are queued per company and saved after a short debounce,
// one request at a time, retrying while offline.
//
// Stale-save guard: every save sends the saved_at we last read or wrote for that
// company. If another tab/device saved since, the server answers 409 with its
// copy and we adopt it rather than overwrite it.
//
// Campaign activity events (store/campaignEvents.js) ride along with the saves:
// queued per company in order, at most MAX_EVENTS per request, kept (in memory
// only) until the server has them.

import { listCompanies, saveCompany, deleteCompany } from '../api/companies.js'
import { saveGame } from '../api/games.js'
import { coalesce } from './campaignEvents.js'

const DEBOUNCE_MS = 1500
const RETRY_MS = 5000
export const MAX_EVENTS = 50

// companyId → saved_at of the copy last read from / written to the server
const baseSavedAt = new Map()

// Builder state → the save entry stored in companies.data
export function snapshotCompany(state) {
  const { mark, companyName, companyAvatar, ipLimit, slots, companyId, companyMode, campaignGame, campaign = null } = state
  return { mark, companyName, companyAvatar, ipLimit, slots, companyId, companyMode, campaignGame, campaign }
}

// API row → save entry used by the saved-companies list
function rowToSave(row) {
  return { ...row.data, companyId: row.id, companyName: row.data?.companyName ?? row.name, savedAt: row.saved_at }
}

function payloadFor(snapshot, events = []) {
  return {
    id: snapshot.companyId,
    name: snapshot.companyName?.trim() || 'Unnamed Company',
    mode: snapshot.companyMode || 'standard',
    data: snapshot,
    baseSavedAt: baseSavedAt.get(snapshot.companyId) ?? null,
    ...(events.length ? { events } : {}),
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
// save(payload, opts)         — the request (tests pass a fake; defaults to saveCompany)
//
// pending: companyId → { snapshot, events } not yet saved. A request takes the entry
// out; edits made meanwhile start a new one. Events go back in front of newer ones
// if the request fails, so their order never changes.
export function createSaver({ onStatus, onSaved, onConflict, onForbidden, save = saveCompany }) {
  const pending = new Map()
  let timer = null
  let running = null        // promise of the current flush loop

  // Put events back in front of whatever was queued for the company since
  function requeue(id, snapshot, events) {
    const newer = pending.get(id)
    pending.set(id, { snapshot: newer?.snapshot ?? snapshot, events: [...events, ...(newer?.events || [])] })
  }

  function schedule(snapshot, events = []) {
    const entry = pending.get(snapshot.companyId)
    pending.set(snapshot.companyId, { snapshot, events: coalesce([...(entry?.events || []), ...events]) })
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
      const [id, { snapshot, events }] = pending.entries().next().value
      pending.delete(id)
      const sent = events.slice(0, MAX_EVENTS)
      const rest = events.slice(MAX_EVENTS)
      try {
        const result = await save(payloadFor(snapshot, sent))
        if (result.status === 'ok') {
          baseSavedAt.set(id, result.savedAt)
          if (rest.length) requeue(id, snapshot, rest) // the rest go with the next request
          onSaved(snapshot, result.savedAt)
        } else if (result.status === 'conflict') {
          // The server kept the sent events as rejected; the rest and edits made meanwhile
          // were based on the stale copy too
          baseSavedAt.set(id, result.company.saved_at)
          pending.delete(id)
          onConflict(rowToSave(result.company))
        } else if (result.status === 'forbidden') {
          const moved = onForbidden(snapshot)
          if (moved) {
            const newer = pending.get(id)
            pending.delete(id)
            pending.set(moved.companyId, { snapshot: newer ? { ...newer.snapshot, companyId: moved.companyId } : moved, events: [...events, ...(newer?.events || [])] })
          }
        }
      } catch (err) {
        console.warn('[cloud save] failed, will retry:', err)
        requeue(id, snapshot, events)
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
    for (const { snapshot, events } of pending.values()) {
      save(payloadFor(snapshot, events.slice(0, MAX_EVENTS)), { keepalive: true }).catch(() => {})
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
