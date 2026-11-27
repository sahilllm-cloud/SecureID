import { Resend } from 'resend'
import { config } from '../config.js'

let resendClient

function redactDiagnostic(value, recipient) {
  let message = String(value ?? 'Unknown Resend API error')
  const senderAddress = config.emailFrom?.match(/<([^>]+)>/)?.[1]

  for (const secret of [config.resendApiKey, config.emailFrom, senderAddress, recipient]) {
    if (secret) message = message.split(secret).join('[redacted]')
  }

  return message
    .replace(/\bre_[A-Za-z0-9_-]+\b/g, '[redacted-key]')
    .replace(/\b\d{6}\b/g, '[redacted-code]')
    .slice(0, 500)
}

function logResendFailure(error, recipient) {
  const code = redactDiagnostic(error?.name || error?.code || 'RESEND_ERROR', recipient)
    .replace(/[^\w.-]/g, '')
    .slice(0, 80) || 'RESEND_ERROR'
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : undefined
  const message = redactDiagnostic(error?.message || error, recipient)
  console.error('Resend email delivery failed:', { code, statusCode, message })

  const safeError = new Error(`Email delivery failed (${code}).`)
  safeError.name = 'EmailDeliveryError'
  safeError.code = 'EMAIL_DELIVERY_FAILED'
  return safeError
}

function getResendClient() {
  if (!config.resendApiKey || !config.emailFrom) {
    const error = new Error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.')
    error.code = 'EMAIL_NOT_CONFIGURED'
    throw error
  }

  if (!resendClient) resendClient = new Resend(config.resendApiKey)
  return resendClient
}

export async function sendOtpEmail(email, code) {
  const client = getResendClient()
  let result

  try {
    result = await client.emails.send({
      from: config.emailFrom,
      to: [email],
      subject: 'Your SecureID verification code',
      text: `Your SecureID verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this message.`,
    })
  } catch (error) {
    throw logResendFailure(error, email)
  }

  if (result.error) throw logResendFailure(result.error, email)
  if (!result.data?.id) throw logResendFailure(new Error('Resend returned no email ID.'), email)
}
