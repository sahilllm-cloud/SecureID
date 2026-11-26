import { User } from '../models/User.js'
import { config } from '../config.js'
import { hashSessionToken } from '../services/security.js'

export async function requireSession(req, res, next) {
  const bearerToken = req.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]+)$/i)?.[1]
  const token = bearerToken || req.cookies[config.cookieName]
  if (!token) {
    return res.status(401).json({ error: 'Please sign in to continue.' })
  }

  const user = await User.findOne({
    activeSessionHash: hashSessionToken(token),
    activeSessionExpiresAt: { $gt: new Date() },
  })

  if (!user) {
    res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'lax', path: '/' })
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }

  req.user = user
  return next()
}
