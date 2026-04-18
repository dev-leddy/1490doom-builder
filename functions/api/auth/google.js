// GET /api/auth/google — Initiate Google OAuth flow
import { Google } from 'arctic'
import { randomHex } from '../../_middleware.js'

export async function onRequestGet(context) {
  const { env, request } = context
  const google = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    callbackUrl(request, '/api/auth/google/callback')
  )

  const state = randomHex(16)
  const codeVerifier = randomHex(32)
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile'])

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': [
        `oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
        `oauth_cv=${codeVerifier}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
      ].join(', '),
    },
  })
}

function callbackUrl(request, path) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}
