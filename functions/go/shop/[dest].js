// GET /go/shop/:dest?from=<where in the app> — counts the click, then redirects to a
// buergames.com page (physical, game, home) with tags for their Shopify reports.
// Unknown destinations go to the 1490 DOOM collection; never anywhere off the store.
import { STORE, STORE_PAGES, tagged, placement, logEvent } from '../../lib/metrics.js'

export async function onRequestGet(context) {
  const { dest } = context.params
  const from = new URL(context.request.url).searchParams.get('from')
  const page = STORE_PAGES[dest] || STORE_PAGES.physical
  logEvent(context, 'store_click', { to: STORE_PAGES[dest] ? dest : 'physical', from: placement(from) })
  return new Response(null, {
    status: 302,
    headers: { Location: tagged(`${STORE}${page}`, from), 'Cache-Control': 'no-store' },
  })
}
