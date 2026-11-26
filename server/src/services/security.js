import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

export function createOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashOtp(challengeId, code) {
  return createHash('sha256').update(`${challengeId}:${code}`).digest('hex')
}

export function otpMatches(challengeId, code, storedHash) {
  const submittedHash = Buffer.from(hashOtp(challengeId, code), 'hex')
  const expectedHash = Buffer.from(storedHash, 'hex')
  return submittedHash.length === expectedHash.length && timingSafeEqual(submittedHash, expectedHash)
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionDurationMs,
  }
}
