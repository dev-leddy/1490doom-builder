// GET /go/product/:handle — redirect to a buergames.com product page, or to the
// 1490 DOOM physical products collection if that product doesn't exist (yet).
// Lets the quiz link to companies before Buer Games lists them; links start
// working on their own once the product is published.
// Each click is counted (metric_events) and the store URL is tagged for Buer Games' reports;
// ?from= says where in the app it was (the quiz result if not given).
import { STORE, STORE_PAGES, tagged, placement, logEvent } from '../../lib/metrics.js'

const FALLBACK = `${STORE}${STORE_PAGES.physical}`
const CACHE_SECONDS = 60 * 60 // re-check the store at most once an hour per product

export async function onRequestGet(context) {
  const { handle } = context.params
  const from = new URL(context.request.url).searchParams.get('from') || 'quiz-result'

  // Only plain Shopify product handles — never redirect anywhere else
  if (!/^[a-z0-9-]{1,100}$/.test(handle)) return Response.redirect(tagged(FALLBACK, from), 302)

  const productUrl = `${STORE}/products/${handle}`
  let exists = false
  try {
    const res = await fetch(`${productUrl}.json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (1490doom-builder link check)' },
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    })
    exists = res.ok
  } catch {
    // Store unreachable — send them to the product URL and let the store handle it
    exists = true
  }

  logEvent(context, 'store_click', { to: exists ? `product:${handle}` : 'physical', from: placement(from) })
  // Not cached by the browser, so every click is counted (the store check above is cached)
  return new Response(null, {
    status: 302,
    headers: {
      Location: tagged(exists ? productUrl : FALLBACK, from),
      'Cache-Control': 'no-store',
    },
  })
}
