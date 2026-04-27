// POST /api/s — generate a short link for a company encoding
import { json } from '../../_middleware.js'

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LEN = 7

function generateCode() {
  const bytes = new Uint8Array(CODE_LEN)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => CHARS[b % CHARS.length]).join('')
}

export async function onRequestPost(context) {
  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { encoded } = body
  if (!encoded || typeof encoded !== 'string') return json({ error: 'Missing encoded' }, 400)

  const origin = new URL(context.request.url).origin

  const existing = await context.env.DB.prepare(
    'SELECT code FROM short_links WHERE encoded = ?'
  ).bind(encoded).first()
  if (existing) return json({ code: existing.code, url: `${origin}/s/${existing.code}` })

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode()
    const result = await context.env.DB.prepare(
      `INSERT OR IGNORE INTO short_links (code, encoded, created_at) VALUES (?, ?, ?)`
    ).bind(code, encoded, Date.now()).run()

    if (result.meta?.changes > 0) {
      return json({ code, url: `${origin}/s/${code}` })
    }
  }

  return json({ error: 'Failed to generate unique code' }, 500)
}
