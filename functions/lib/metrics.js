// ── Usage metrics ─────────────────────────────────────────────────────────────
// Rows in metric_events, counted by scripts/metrics.mjs. Logging never fails or slows a
// request: it runs after the response (waitUntil) and errors are swallowed.

export const STORE = 'https://buergames.com'

// Where /go/shop/:dest may send people (never anywhere else)
export const STORE_PAGES = {
  physical: '/collections/1490-doom-physical',
  game: '/pages/1490doom',
  home: '/',
}

// Where in the app the click came from: short slugs only
export const placement = from => (/^[a-z0-9-]{1,40}$/.test(from || '') ? from : 'unknown')

// The store URL with tags, so Buer Games' Shopify reports show visits and orders from the app
export function tagged(url, from) {
  const u = new URL(url)
  u.searchParams.set('utm_source', 'doom-builder')
  u.searchParams.set('utm_medium', 'app')
  u.searchParams.set('utm_campaign', placement(from))
  return u.toString()
}

// What a play mode game was, from its saved tracker state
export function gameProps(data) {
  const warriors = Array.isArray(data?.warriors) ? data.warriors : []
  const s = data?.scenario
  return {
    mode: data?.campaign ? 'campaign' : 'standard',
    scenario: s?.kind && s?.id ? `${s.kind}:${s.id}` : 'skirmish:standard',
    warriors: warriors.map(w => w?.type).filter(Boolean),
    mark: data?.mark || null,
  }
}

// When the game began: the session id is Date.now() in base 36 (see trackerStore openTracker)
export function gameStartedAt(sessionId) {
  if (!/^[0-9a-z]{6,10}$/.test(sessionId || '')) return null
  const t = parseInt(sessionId, 36)
  return t > 1.6e12 && t <= Date.now() + 864e5 ? t : null // a plausible time, not in the future
}

// How a game ended: rounds reached, how long it ran, how many of ours fell
export function gameEndProps(data, savedAt, reason) {
  const warriors = Array.isArray(data?.warriors) ? data.warriors : []
  const started = gameStartedAt(data?.sessionId)
  return {
    ...gameProps(data),
    reason, // 'closed' (left play mode) | 'replaced' (a new game started over it)
    rounds: Number(data?.round) || 1,
    minutes: started && savedAt > started ? Math.round((savedAt - started) / 60000) : null,
    fallen: warriors.filter(w => w?.dead || w?.currentVit === 0).length,
  }
}

// What a new company is: mode, mark and classes (no names)
export function companyProps(data, mode) {
  const slots = Array.isArray(data?.slots) ? data.slots : []
  return {
    mode: mode || data?.companyMode || 'standard',
    mark: data?.mark || null,
    warriors: slots.map(s => s?.type).filter(Boolean),
  }
}

export function logEvent(context, kind, props = {}) {
  const db = context.env?.DB
  if (!db) return
  const userId = context.data?.user?.id || null
  const full = JSON.stringify(props)
  const json = full.length > 2000 ? '{"oversize":true}' : full // stays valid JSON for the report
  const run = db.prepare(`INSERT INTO metric_events (kind, user_id, props, created_at) VALUES (?, ?, ?, ?)`)
    .bind(kind, userId, json, Date.now()).run()
    .catch(err => console.warn('[metrics] not logged:', err?.message))
  if (context.waitUntil) context.waitUntil(run)
  return run
}
