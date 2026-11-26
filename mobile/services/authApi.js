import { Platform } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const sessionHeader = 'X-SecureID-Session';

export class AuthApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

function getApiUrl() {
  if (!apiUrl) {
    throw new Error(
      'Backend URL is not configured. Set EXPO_PUBLIC_API_URL in mobile/.env.local and restart Expo.',
    );
  }

  if (!/^https?:\/\/[^/]+/i.test(apiUrl)) {
    throw new Error('EXPO_PUBLIC_API_URL must be an http:// or https:// URL.');
  }

  const hostname = apiUrl.match(/^https?:\/\/([^/:]+)/i)?.[1]?.toLowerCase();
  if (Platform.OS === 'android' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    throw new Error(
      'On Android, localhost points to the phone. Use your PC’s LAN IP, or 10.0.2.2 for the Android emulator.',
    );
  }

  if (!__DEV__) {
    if (!/^https:\/\//i.test(apiUrl)) {
      throw new Error('Use an HTTPS backend URL in production builds.');
    }
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0', '10.0.2.2'].includes(hostname)) {
      throw new Error('Production builds require a deployed API host, not a local or emulator URL.');
    }
  }

  return apiUrl;
}

async function request(path, { method = 'POST', payload, sessionToken, requestMobileSession = false } = {}) {
  const baseUrl = getApiUrl();
  let response;
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  if (requestMobileSession) headers[sessionHeader] = 'bearer';

  try {
    response = await fetch(`${baseUrl}/api/auth${path}`, {
      method,
      credentials: 'include',
      headers,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
  } catch {
    throw new Error(
      `Could not connect to ${baseUrl}. Make sure the API is running, the phone and PC share Wi-Fi, and Windows Firewall allows port 4000.`,
    );
  }

  const responseText = await response.text();
  let body = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      if (response.ok) throw new Error('The API returned an invalid response.');
    }
  }

  if (!response.ok) {
    const message = body?.error || (
      response.status >= 500
        ? 'The SecureID API could not complete the request. Check the backend configuration.'
        : 'The request could not be completed. Please try again.'
    );
    throw new AuthApiError(message, response.status);
  }

  return body;
}

function post(path, payload, options) {
  return request(path, { method: 'POST', payload, ...options });
}

export function registerAccount(details) {
  return post('/signup', details);
}

export function verifyRegistrationOtp(challengeId, code) {
  return post('/otp/verify', { challengeId, code }, { requestMobileSession: true });
}

export function requestLoginOtp(email) {
  return post('/otp/request', { identifier: email });
}

export function verifyLoginOtp(challengeId, code) {
  return post('/otp/verify', { challengeId, code }, { requestMobileSession: true });
}

export function resendOtp(challengeId) {
  return post('/otp/resend', { challengeId });
}

export function getCurrentUser(sessionToken) {
  return request('/me', { method: 'GET', sessionToken });
}

export function logout(sessionToken) {
  return post('/logout', {}, { sessionToken });
}
