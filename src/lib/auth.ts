import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'crypto'

// ponytail: stdlib scrypt + HMAC-signed cookie. No session table, no auth lib.
// Upgrade path: swap to a sessions table if you ever need "logout everywhere".

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET missing in .env')
  return s
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 32).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  // ponytail: legacy plaintext rows pass through here once, then get rehashed on login
  if (!stored.startsWith('scrypt:')) return password === stored
  const [, salt, hash] = stored.split(':')
  const check = scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, 'hex')
  return check.length === expected.length && timingSafeEqual(check, expected)
}

// Token format: role|expiresAtMs|hmac
export function signToken(role: string, maxAgeSec: number): string {
  const payload = `${role}|${Date.now() + maxAgeSec * 1000}`
  const sig = createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}|${sig}`
}

/** Returns the role if the token is valid and unexpired, else null. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('|')
  if (parts.length !== 3) return null
  const [role, exp, sig] = parts
  const expected = createHmac('sha256', secret()).update(`${role}|${exp}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Date.now() > Number(exp)) return null
  return role
}
