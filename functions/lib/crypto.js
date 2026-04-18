// ── Password Hashing — PBKDF2-SHA256 via Web Crypto ──────────────────────────
// Works natively in Cloudflare Workers runtime. No npm packages needed.
// Format: "pbkdf2:sha256:100000:<base64salt>:<base64hash>"

const ITERATIONS = 100000

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt)
  return `pbkdf2:sha256:${ITERATIONS}:${b64(salt)}:${b64(hash)}`
}

export async function verifyPassword(password, stored) {
  const parts = stored.split(':')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false
  const salt = fromB64(parts[3])
  const expectedHash = parts[4]
  const actualHash = b64(await derive(password, salt))
  // Constant-time compare
  return timingSafeEqual(actualHash, expectedHash)
}

async function derive(password, salt) {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    baseKey, 256
  )
  return new Uint8Array(bits)
}

function b64(buf) {
  return btoa(String.fromCharCode(...buf))
}

function fromB64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

// XOR-based timing-safe string comparison
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
