import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import mongoose from 'mongoose'
import { config } from '../config.js'
import { requireSession } from '../middleware/authenticate.js'
import { AuthChallenge } from '../models/AuthChallenge.js'
import { User } from '../models/User.js'
import { sendOtpEmail } from '../services/email.js'
import {
  createOtp,
  createSessionToken,
  hashOtp,
  hashSessionToken,
  otpMatches,
  sessionCookieOptions,
} from '../services/security.js'

const router = Router()
const maxOtpAttempts = 5
const otpStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many verification requests. Please try again later.' },
})
const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many resend requests. Please try again later.' },
})

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    phone: user.phone || null,
    surname: user.surname,
    passkeyCount: user.passkeys.length,
  }
}

function normalizeIdentifier(identifier) {
  const value = typeof identifier === 'string' ? identifier.trim() : ''
  if (value.includes('@')) return { email: value.toLowerCase() }
  return { phone: value.replace(/[()\s.-]/g, '') }
}

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function validPhone(value) {
  return typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value)
}

function validIdentifier(identifier) {
  return identifier.email ? validEmail(identifier.email) : validPhone(identifier.phone)
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date < new Date()
}

function setSessionCookie(res, token) {
  res.cookie(config.cookieName, token, sessionCookieOptions())
}

async function establishSession(user, res) {
  const token = createSessionToken()
  user.activeSessionHash = hashSessionToken(token)
  user.activeSessionExpiresAt = new Date(Date.now() + config.sessionDurationMs)
  await user.save()
  setSessionCookie(res, token)
  return token
}

function sessionResponse(req, user, token) {
  const response = { user: publicUser(user) }
  if (req.get('X-SecureID-Session')?.toLowerCase() === 'bearer') {
    response.sessionToken = token
  }
  return response
}

function safeErrorCode(error) {
  const value = error?.code || error?.name || 'UNKNOWN'
  return String(value).replace(/[^\w.-]/g, '').slice(0, 80) || 'UNKNOWN'
}

function logOtpOperationFailure(operation, error) {
  console.error(operation, { code: safeErrorCode(error) })
}

async function discardUndeliveredChallenge(challengeId) {
  try {
    await AuthChallenge.deleteOne({ _id: challengeId, consumedAt: null })
  } catch (error) {
    console.error('Unable to invalidate undelivered OTP challenge:', {
      code: safeErrorCode(error),
    })
  }
}

async function issueOtp({ kind, userId, email, signupData }) {
  const code = createOtp()
  const challenge = await AuthChallenge.create({
    kind,
    userId,
    signupData,
    otpHash: 'pending',
    expiresAt: new Date(Date.now() + config.otpDurationMs),
    resendAt: new Date(Date.now() + config.otpResendDelayMs),
  })
  challenge.otpHash = hashOtp(challenge._id.toString(), code)
  await challenge.save()

  try {
    if (email) await sendOtpEmail(email, code)
  } catch (error) {
    await discardUndeliveredChallenge(challenge._id)
    throw error
  }

  return challenge
}

function validChallengeId(id) {
  return typeof id === 'string' && mongoose.isValidObjectId(id)
}

router.get('/me', requireSession, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

router.post('/signup', otpStartLimiter, async (req, res) => {
  const { email, phone, surname, dateOfBirth } = req.body
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const normalizedPhone = typeof phone === 'string' && phone
    ? phone.trim().replace(/[()\s.-]/g, '')
    : ''
  const normalizedSurname = typeof surname === 'string' ? surname.trim() : ''

  if (
    !validEmail(normalizedEmail) ||
    (normalizedPhone && !validPhone(normalizedPhone)) ||
    !normalizedSurname ||
    normalizedSurname.length > 80 ||
    !validDate(dateOfBirth)
  ) {
    return res.status(400).json({ error: 'Enter a valid email, surname, date of birth, and optional phone number.' })
  }

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])],
  })
  if (existing) {
    return res.status(409).json({ error: 'An account already uses that email or phone number.' })
  }

  const signupData = {
    email: normalizedEmail,
    phone: normalizedPhone || undefined,
    surname: normalizedSurname,
    dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
  }

  try {
    const challenge = await issueOtp({ kind: 'signup-otp', email: normalizedEmail, signupData })
    return res.status(202).json({
      challengeId: challenge._id,
      expiresInSeconds: config.otpDurationMs / 1000,
      resendInSeconds: config.otpResendDelayMs / 1000,
      delivery: normalizedEmail,
    })
  } catch (error) {
    if (error.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(503).json({ error: error.message })
    }
    logOtpOperationFailure('Signup OTP operation failed:', error)
    return res.status(502).json({ error: 'We could not deliver your verification email. Please try again.' })
  }
})

router.post('/otp/request', otpStartLimiter, async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier)
  if (!validIdentifier(identifier)) {
    return res.status(400).json({ error: 'Enter a valid email address or phone number.' })
  }
  const isEmail = Boolean(identifier.email)
  const account = await User.findOne(identifier)
  try {
    const challenge = await issueOtp({
      kind: 'login-otp',
      userId: account?._id,
      email: account?.email,
    })
    return res.status(202).json({
      challengeId: challenge._id,
      expiresInSeconds: config.otpDurationMs / 1000,
      resendInSeconds: config.otpResendDelayMs / 1000,
      delivery: account?.email || (isEmail ? identifier.email : 'your email'),
      message: 'If an account exists, a verification code has been sent to its email.',
    })
  } catch (error) {
    if (error.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(503).json({ error: error.message })
    }
    logOtpOperationFailure('Sign-in OTP operation failed:', error)
    return res.status(502).json({ error: 'We could not deliver your verification email. Please try again.' })
  }
})

router.post('/otp/resend', otpResendLimiter, async (req, res) => {
  const { challengeId } = req.body
  if (!validChallengeId(challengeId)) {
    return res.status(400).json({ error: 'This verification request is no longer valid. Start again.' })
  }

  const now = new Date()
  const currentChallenge = await AuthChallenge.findOne({
    _id: challengeId,
    kind: { $in: ['signup-otp', 'login-otp'] },
    consumedAt: null,
    expiresAt: { $gt: now },
  }).select('+otpHash')

  if (!currentChallenge) return res.status(410).json({ error: 'This verification request has expired. Start again.' })
  if (currentChallenge.resendAt && currentChallenge.resendAt > now) {
    return res.status(429).json({ error: 'Please wait before requesting another code.' })
  }

  const email = currentChallenge.signupData?.email || (
    currentChallenge.userId ? (await User.findById(currentChallenge.userId))?.email : null
  )
  if (!email) return res.status(410).json({ error: 'This verification request is no longer valid. Start again.' })

  const code = createOtp()
  const challenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: currentChallenge._id,
      consumedAt: null,
      expiresAt: { $gt: now },
      resendAt: { $lte: now },
    },
    {
      $set: {
        otpHash: hashOtp(currentChallenge._id.toString(), code),
        attempts: 0,
        expiresAt: new Date(Date.now() + config.otpDurationMs),
        resendAt: new Date(Date.now() + config.otpResendDelayMs),
      },
    },
    { new: true },
  )
  if (!challenge) return res.status(429).json({ error: 'Please wait before requesting another code.' })

  try {
    await sendOtpEmail(email, code)
    return res.json({
      expiresInSeconds: config.otpDurationMs / 1000,
      resendInSeconds: config.otpResendDelayMs / 1000,
      delivery: email,
    })
  } catch (error) {
    await discardUndeliveredChallenge(challenge._id)
    if (error.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(503).json({ error: error.message })
    }
    logOtpOperationFailure('OTP resend operation failed:', error)
    return res.status(502).json({ error: 'We could not deliver a new code. Please try again later.' })
  }
})

router.post('/otp/verify', async (req, res) => {
  const { challengeId, code } = req.body
  if (!validChallengeId(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the six-digit verification code.' })
  }

  const challenge = await AuthChallenge.findOne({
    _id: challengeId,
    kind: { $in: ['signup-otp', 'login-otp'] },
    consumedAt: null,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: maxOtpAttempts },
  }).select('+otpHash')

  if (!challenge) {
    return res.status(400).json({ error: 'That code is invalid or expired. Request a new one and try again.' })
  }

  if (!otpMatches(challenge._id.toString(), code, challenge.otpHash)) {
    await AuthChallenge.updateOne({ _id: challenge._id, consumedAt: null }, { $inc: { attempts: 1 } })
    return res.status(400).json({ error: 'That code is incorrect. Check it and try again.' })
  }

  const consumed = await AuthChallenge.findOneAndUpdate(
    { _id: challenge._id, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: maxOtpAttempts } },
    { $set: { consumedAt: new Date() } },
    { new: true },
  )
  if (!consumed) return res.status(400).json({ error: 'That code is invalid or expired. Start again.' })

  let user
  if (challenge.kind === 'signup-otp') {
    try {
      user = await User.create(challenge.signupData)
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'An account already uses that email or phone number.' })
      throw error
    }
  } else if (challenge.userId) {
    user = await User.findById(challenge.userId)
  }

  if (!user) return res.status(400).json({ error: 'That code is invalid or expired. Start again.' })
  const sessionToken = await establishSession(user, res)
  return res.json(sessionResponse(req, user, sessionToken))
})

router.post('/passkey/register/options', requireSession, async (req, res) => {
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userID: Buffer.from(req.user._id.toString()),
    userName: req.user.email,
    userDisplayName: req.user.surname,
    attestationType: 'none',
    excludeCredentials: req.user.passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  })

  const challenge = await AuthChallenge.create({
    kind: 'register-passkey',
    userId: req.user._id,
    webauthnChallenge: options.challenge,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })
  return res.json({ challengeId: challenge._id, options })
})

router.post('/passkey/register/verify', requireSession, async (req, res) => {
  const { challengeId, response } = req.body
  if (!validChallengeId(challengeId) || !response) {
    return res.status(400).json({ error: 'Invalid passkey registration response.' })
  }

  const challenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challengeId,
      kind: 'register-passkey',
      userId: req.user._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { new: true },
  )
  if (!challenge) return res.status(400).json({ error: 'Passkey registration expired. Please try again.' })

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.webauthnChallenge,
    expectedOrigin: config.rpOrigin,
    expectedRPID: config.rpID,
    requireUserVerification: true,
  })
  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'We could not verify this passkey. Please try again.' })
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
  if (req.user.passkeys.some((passkey) => passkey.credentialId === credential.id)) {
    return res.status(409).json({ error: 'This passkey is already registered.' })
  }
  req.user.passkeys.push({
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: credential.transports || [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  })
  await req.user.save()
  return res.json({ user: publicUser(req.user) })
})

router.post('/passkey/authenticate/options', async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier)
  if (!validIdentifier(identifier)) {
    return res.status(400).json({ error: 'Enter a valid email address or phone number.' })
  }
  const account = await User.findOne(identifier)
  if (!account || account.passkeys.length === 0) {
    return res.status(404).json({ error: 'No passkey is registered for that account. Use an email code instead.' })
  }

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    allowCredentials: account.passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports,
    })),
    userVerification: 'required',
  })
  const challenge = await AuthChallenge.create({
    kind: 'authenticate-passkey',
    userId: account._id,
    webauthnChallenge: options.challenge,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })
  return res.json({ challengeId: challenge._id, options })
})

router.post('/passkey/authenticate/verify', async (req, res) => {
  const { challengeId, response } = req.body
  if (!validChallengeId(challengeId) || !response?.id) {
    return res.status(400).json({ error: 'Invalid passkey authentication response.' })
  }

  const challenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challengeId,
      kind: 'authenticate-passkey',
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { new: true },
  )
  if (!challenge) return res.status(400).json({ error: 'Passkey sign-in expired. Please try again.' })

  const user = await User.findById(challenge.userId)
  const passkey = user?.passkeys.find((item) => item.credentialId === response.id)
  if (!user || !passkey) return res.status(400).json({ error: 'This passkey is not registered to the account.' })

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.webauthnChallenge,
    expectedOrigin: config.rpOrigin,
    expectedRPID: config.rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64')),
      counter: passkey.counter,
      transports: passkey.transports,
    },
    requireUserVerification: true,
  })
  if (!verification.verified) {
    return res.status(400).json({ error: 'We could not verify this passkey. Please try again.' })
  }

  passkey.counter = verification.authenticationInfo.newCounter
  const sessionToken = await establishSession(user, res)
  return res.json(sessionResponse(req, user, sessionToken))
})

router.post('/logout', requireSession, async (req, res) => {
  req.user.activeSessionHash = undefined
  req.user.activeSessionExpiresAt = undefined
  await req.user.save()
  res.clearCookie(config.cookieName, { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax', path: '/' })
  return res.status(204).end()
})

export default router
