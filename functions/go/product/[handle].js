// GET /go/product/:handle — redirect to a buergames.com product page, or to the
// 1490 DOOM physical products collection if that product doesn't exist (yet).
// Lets the quiz link to companies before Buer Games lists them; links start
// working on their own once the product is published.

const STORE = 'https://buergames.com'
const FALLBACK = `${STORE}/collections/1490-doom-physical`
const CACHE_SECONDS = 60 * 60 // re-check the store at most once an hour per product

export async function onRequestGet(context) {
  const { handle } = context.params

  // Only plain Shopify product handles — never redirect anywhere else
  if (!/^[a-z0-9-]{1,100}$/.test(handle)) return Response.redirect(FALLBACK, 302)

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

  return new Response(null, {
    status: 302,
    headers: {
      Location: exists ? productUrl : FALLBACK,
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  })
}
