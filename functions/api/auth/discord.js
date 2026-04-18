// GET /api/auth/discord — Initiate Discord OAuth flow
import { Discord } from 'arctic'
import { randomHex } from '../../_middleware.js'

export async function onRequestGet(context) {
  const { env, request } = context

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return new Response('Discord OAuth not configured (missing env vars)', { status: 500 })
  }

  const discord = new Discord(
    env.DISCORD_CLIENT_ID,
    env.DISCORD_CLIENT_SECRET,
    callbackUrl(request, '/api/auth/discord/callback')
  )

  const state = randomHex(16)
  const url = discord.createAuthorizationURL(state, null, ['identify'])

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
    },
  })
}

function callbackUrl(request, path) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}
