// GET /api/auth/me — Return current authenticated user or 401
import { json } from '../../_middleware.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  return json(user)
}
