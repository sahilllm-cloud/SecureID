import { startAuthentication, startRegistration } from '@simplewebauthn/browser'

export function supportsPasskeys() {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window
}

export async function registerPasskey(options) {
  return startRegistration({ optionsJSON: options })
}

export async function authenticateWithPasskey(options) {
  return startAuthentication({ optionsJSON: options })
}
