import 'dotenv/config'

const port = Number(process.env.PORT || 4000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.')
}

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  rpID: process.env.RP_ID || 'localhost',
  rpOrigin: process.env.RP_ORIGIN || 'http://localhost:5173',
  rpName: process.env.RP_NAME || 'SecureID',
  cookieName: 'secureid_session',
  sessionDurationMs: 14 * 24 * 60 * 60 * 1000,
  otpDurationMs: 10 * 60 * 1000,
  otpResendDelayMs: 60 * 1000,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
}

if (!config.mongoUri) {
  throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure it.')
}
