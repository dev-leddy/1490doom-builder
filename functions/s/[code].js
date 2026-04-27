// GET /s/:code — resolve a short link
// ?tts=1 → returns JSON payload for tabletop simulator integration
// default  → 302 redirect to /#<encoded> (SPA decodes as normal)
import { decodeCompany } from '../lib/decode.js'

export async function onRequestGet(context) {
  const code = context.params.code
  const url = new URL(context.request.url)
  const isTTS = url.searchParams.get('tts') === '1'

  const row = await context.env.DB.prepare(
    `SELECT encoded FROM short_links WHERE code = ?`
  ).bind(code).first()

  if (!row) {
    return new Response('Not found', { status: 404 })
  }

  if (isTTS) {
    const payload = decodeCompany(row.encoded)
    if (!payload) return new Response('Could not decode company', { status: 500 })
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Fragments (#) are stripped from HTTP redirect Location headers by some
  // intermediaries. Use a client-side redirect instead so the hash is preserved.
  const dest = `${url.origin}/#${row.encoded}`
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<script>location.replace(${JSON.stringify(dest)})</script>` +
    `</head><body></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
