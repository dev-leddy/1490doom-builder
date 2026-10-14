// GET /j/:code — invite link to a shared campaign: sends the player to /?join=<code>, where
// the app asks them to sign in if needed and then shows the join sheet.
// Codes are checked when the app previews them; here only their shape.
import { normalizeCode, formatCode } from '../lib/groups.js'

export async function onRequestGet(context) {
  const code = normalizeCode(context.params.code)
  // Relative, so it stays on whichever host served the link (dev proxy, preview, production)
  const target = code ? `/?join=${formatCode(code)}` : '/'
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } })
}
