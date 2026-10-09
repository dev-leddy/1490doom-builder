// PATCH /api/auth/profile — update current user's profile: { avatar } and/or { displayName }
import { json } from '../../_middleware.js'

const AVATAR_KEYS = [
  'battle','trio','warrior','standoff','eaters','push',
  'choke','choke2','climbing','bridge','bullseye','throne','rest-stop','road-sign',
]
const MAX_DATA_URL_BYTES = 512 * 1024  // 512 KB
const MAX_DISPLAY_NAME = 32

export async function onRequestPatch(context) {
  const { env, request } = context
  const user = context.data.user
  if (!user) return json({ error: 'Not authenticated' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { avatar, displayName } = body || {}
  if (avatar === undefined && displayName === undefined) return json({ error: 'Nothing to update' }, 400)

  // Display name: any account. Stored apart from username, which Discord/Google
  // sign-ins overwrite on every login.
  if (displayName !== undefined) {
    const name = typeof displayName === 'string' ? displayName.replace(/\s+/g, ' ').trim() : ''
    if (!name) return json({ error: 'Name can\'t be empty' }, 400)
    if (name.length > MAX_DISPLAY_NAME) return json({ error: `Name is too long (max ${MAX_DISPLAY_NAME})` }, 400)
    await env.DB.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).bind(name, user.id).run()
    if (avatar === undefined) return json({ ok: true, username: name })
  }

  // Avatar: only email users (Discord/Google sign-ins replace it with the provider's picture)
  if (user.provider !== 'email') return json({ error: 'Forbidden' }, 403)

  // Validate: must be a known key or a data: image URL
  if (avatar !== '' && !AVATAR_KEYS.includes(avatar)) {
    if (!avatar?.startsWith('data:image/')) {
      return json({ error: 'Invalid avatar' }, 400)
    }
    if (avatar.length > MAX_DATA_URL_BYTES) {
      return json({ error: 'Image too large (max 512 KB)' }, 400)
    }
  }

  await env.DB.prepare(
    `UPDATE users SET avatar_url = ? WHERE id = ?`
  ).bind(avatar || null, user.id).run()

  return json({ ok: true })
}
