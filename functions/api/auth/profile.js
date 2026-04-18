// PATCH /api/auth/profile — update current user's profile (avatar)
import { json } from '../../_middleware.js'

const AVATAR_KEYS = [
  'battle','trio','warrior','standoff','eaters','push',
  'choke','choke2','climbing','bridge','bullseye','throne','rest-stop','road-sign',
]
const MAX_DATA_URL_BYTES = 512 * 1024  // 512 KB

export async function onRequestPatch(context) {
  const { env, request } = context
  const user = context.data.user
  if (!user) return json({ error: 'Not authenticated' }, 401)

  // Only email users can change their avatar through this endpoint
  if (user.provider !== 'email') return json({ error: 'Forbidden' }, 403)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { avatar } = body || {}

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
