// GET /api/auth/discord/callback — Discord OAuth callback
import { Discord } from 'arctic'
import { getCookie, randomHex, json } from '../../_middleware.js'

export async function onRequestGet(context) {
  const { env, request } = context
  const url = new URL(request.url)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = getCookie(request, 'oauth_state')

  if (!code || !state || state !== storedState) {
    return json({ error: 'Invalid OAuth state' }, 400)
  }

  const discord = new Discord(
    env.DISCORD_CLIENT_ID,
    env.DISCORD_CLIENT_SECRET,
    callbackUrl(request, '/api/auth/discord/callback')
  )

  let tokens
  try {
    tokens = await discord.validateAuthorizationCode(code, null)
  } catch {
    return json({ error: 'Failed to exchange code' }, 400)
  }

  // Fetch Discord user profile
  const profileRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
  })
  if (!profileRes.ok) return json({ error: 'Failed to fetch Discord profile' }, 502)
  const profile = await profileRes.json()

  const avatarUrl = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    : null

  // Upsert user
  const userId = await upsertUser(env.DB, {
    provider: 'discord',
    providerId: profile.id,
    username: profile.username,
    avatarUrl,
  })

  // Create session
  const sessionId = randomHex(32)
  const now = Date.now()
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(sessionId, userId, now, expiresAt).run()

  const origin = new URL(request.url)
  const isSecure = origin.protocol === 'https:'
  const cookieFlags = isSecure ? '; Secure' : ''

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': [
        `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${cookieFlags}`,
        `oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      ].join(', '),
    },
  })
}

async function upsertUser(db, { provider, providerId, username, avatarUrl }) {
  const existing = await db.prepare(
    `SELECT id FROM users WHERE provider = ? AND provider_id = ?`
  ).bind(provider, providerId).first()

  if (existing) {
    await db.prepare(
      `UPDATE users SET username = ?, avatar_url = ? WHERE id = ?`
    ).bind(username, avatarUrl, existing.id).run()
    return existing.id
  }

  const id = randomHex(16)
  await db.prepare(
    `INSERT INTO users (id, provider, provider_id, username, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, provider, providerId, username, avatarUrl, Date.now()).run()
  return id
}

function callbackUrl(request, path) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}
