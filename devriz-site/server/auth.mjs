/**
 * Sign-in for /admin.
 *
 * The previous editor authenticated writers through GitHub OAuth, which meant a
 * GitHub account, an org invitation, a fork and a pull request before a word
 * could be published — and on Hostinger it did not work at all, because
 * /api/auth needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET and they were never
 * set there. This replaces all of it with one shared password.
 *
 * Set it once in hPanel → the app's environment variables:
 *
 *   ADMIN_PASSWORD=something-long-and-not-guessable
 *
 * Optionally ADMIN_PASSWORD_HASH instead, in `scrypt:<salt-hex>:<key-hex>`
 * form, if you would rather the plain password not sit in the panel. Generate
 * one with:  node server/auth.mjs "the password"
 *
 * The session cookie is signed with a key derived from the password itself, so
 * there is no second secret to configure and changing the password immediately
 * signs everyone out.
 */
import crypto from 'node:crypto'

const COOKIE = 'dh_admin'
const MAX_AGE_DAYS = 30
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

/* ---------- password ---------- */

export const configured = () =>
  Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH)

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString('hex')
  return `scrypt:${salt}:${key}`
}

/**
 * timingSafeEqual throws on a length mismatch, which would itself leak the
 * length, so both sides are hashed to a fixed 32 bytes before comparing.
 */
const sameSecret = (a, b) => {
  const h = (v) => crypto.createHash('sha256').update(String(v)).digest()
  return crypto.timingSafeEqual(h(a), h(b))
}

export function verifyPassword(password) {
  if (!password) return false

  const stored = process.env.ADMIN_PASSWORD_HASH
  if (stored) {
    const [scheme, salt, key] = stored.split(':')
    if (scheme !== 'scrypt' || !salt || !key) return false
    let derived
    try {
      derived = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString('hex')
    } catch {
      return false
    }
    return sameSecret(derived, key)
  }

  const plain = process.env.ADMIN_PASSWORD
  return plain ? sameSecret(password, plain) : false
}

/* ---------- session cookie ---------- */

const signingKey = () =>
  crypto
    .createHash('sha256')
    .update(`dh-admin-v1|${process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || ''}`)
    .digest()

const b64 = (buf) => Buffer.from(buf).toString('base64url')

function sign(payload) {
  const body = b64(JSON.stringify(payload))
  const mac = b64(crypto.createHmac('sha256', signingKey()).update(body).digest())
  return `${body}.${mac}`
}

function unsign(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  const expected = b64(crypto.createHmac('sha256', signingKey()).update(body).digest())
  if (!mac || !sameSecret(mac, expected)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf('=')
        return i < 0 ? [c, ''] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]
      })
  )

/** Hostinger terminates TLS at its proxy, so req.secure is false behind it. */
const isHttps = (req) =>
  req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'

export function issue(req, res, name) {
  const exp = Date.now() + MAX_AGE_DAYS * 86400_000
  const token = sign({ exp, name: name || 'editor' })
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_DAYS * 86400}`,
  ]
  if (isHttps(req)) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clear(req, res) {
  const parts = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (isHttps(req)) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function session(req) {
  const payload = unsign(parseCookies(req.headers.cookie)[COOKIE])
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
  return payload
}

/** Express middleware for every route under /api/admin except login. */
export function requireAuth(req, res, next) {
  if (!configured()) {
    return res.status(503).json({
      error:
        'No admin password is set on this server. Add ADMIN_PASSWORD in hPanel → the app’s environment variables, then restart the app.',
    })
  }
  if (!session(req)) return res.status(401).json({ error: 'Please sign in again.' })
  next()
}

/* ---------- brute-force throttle ---------- */

/**
 * One shared password is the whole authentication story, so it has to be
 * expensive to guess. In-memory is the right scope: a restart clearing the
 * counters is not a weakness when the window is fifteen minutes.
 */
const attempts = new Map()
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 8

export function throttle(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { first: now, count: 0 })
    return { blocked: false }
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { blocked: true, retryIn: Math.ceil((WINDOW_MS - (now - entry.first)) / 60_000) }
  }
  return { blocked: false }
}

export const recordFailure = (ip) => {
  const entry = attempts.get(ip) || { first: Date.now(), count: 0 }
  entry.count++
  attempts.set(ip, entry)
}

export const recordSuccess = (ip) => attempts.delete(ip)

// node server/auth.mjs "the password"  →  a hash to paste into ADMIN_PASSWORD_HASH
if (process.argv[1] && process.argv[1].endsWith('auth.mjs') && process.argv[2]) {
  console.log(hashPassword(process.argv[2]))
}
