import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter

function redactDiagnostic(value) {
  let message = String(value ?? 'Unknown SMTP error')

  for (const secret of [config.smtpPass, config.smtpUser, config.emailFrom]) {
    if (secret) message = message.split(secret).join('[redacted]')
  }

  return message.replace(/\b\d{6}\b/g, '[redacted-code]').slice(0, 500)
}

function logSmtpFailure(error) {
  const code = redactDiagnostic(error?.code || error?.responseCode || 'UNKNOWN')
  const message = redactDiagnostic(error?.message || error)
  console.error('SMTP transport failure:', { code, message })

  const safeError = new Error(`SMTP transport failed (${code}): ${message}`)
  safeError.name = 'SmtpTransportError'
  safeError.code = code
  return safeError
}

function getTransporter() {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.emailFrom) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.')
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    })
  }

  return transporter
}

export async function verifyEmailTransport() {
  const mailTransporter = getTransporter()

  try {
    await mailTransporter.verify()
  } catch (error) {
    throw logSmtpFailure(error)
  }
}

export async function sendOtpEmail(email, code) {
  const mailTransporter = getTransporter()

  try {
    await mailTransporter.sendMail({
      from: config.emailFrom,
      to: email,
      subject: 'Your SecureID verification code',
      text: `Your SecureID verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this message.`,
    })
  } catch (error) {
    throw logSmtpFailure(error)
  }
}
