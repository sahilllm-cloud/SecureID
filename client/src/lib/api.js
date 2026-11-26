async function request(path, options = {}) {
  const response = await fetch(`/api/auth${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (response.status === 204) return null

  const responseText = await response.text()
  let body = null
  if (responseText) {
    try {
      body = JSON.parse(responseText)
    } catch {
      if (response.ok) throw new Error('The server returned an invalid response.')
    }
  }
  if (!response.ok) {
    throw new Error(body?.error || (response.status >= 500
      ? 'SecureID is temporarily unavailable. Please try again.'
      : 'Something went wrong. Please try again.'))
  }
  return body
}

export const authApi = {
  me: () => request('/me'),
  signup: (data) => request('/signup', { method: 'POST', body: JSON.stringify(data) }),
  requestOtp: (identifier) => request('/otp/request', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resendOtp: (challengeId) => request('/otp/resend', { method: 'POST', body: JSON.stringify({ challengeId }) }),
  verifyOtp: (challengeId, code) => request('/otp/verify', { method: 'POST', body: JSON.stringify({ challengeId, code }) }),
  registerPasskeyOptions: () => request('/passkey/register/options', { method: 'POST', body: '{}' }),
  verifyPasskeyRegistration: (challengeId, response) => request('/passkey/register/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, response }),
  }),
  authenticationOptions: (identifier) => request('/passkey/authenticate/options', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  }),
  verifyPasskeyAuthentication: (challengeId, response) => request('/passkey/authenticate/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, response }),
  }),
  logout: () => request('/logout', { method: 'POST' }),
}
