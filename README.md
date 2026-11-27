# SecureID

SecureID is a mobile-first authentication platform with an Expo/React Native Android app, a React/Vite web client, and a Node.js/Express API backed by MongoDB. It supports email one-time passcodes, passkeys, single-session tokens, and secure mobile token storage.

## Download

[Download the SecureID Android APK](https://github.com/sahilllm-cloud/SecureID/releases/download/v1.0.0/SecureID-v1.0.0.apk) or view the [v1.0.0 release](https://github.com/sahilllm-cloud/SecureID/releases/tag/v1.0.0).

## Requirements

- Node.js 20 or newer
- MongoDB (local or hosted)
- An SMTP account for delivering email verification codes

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` plus the SMTP settings for your email provider. Never put these values in the client.
2. Install and start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

3. In a second terminal, start the client from the project root:

   ```powershell
   npm install --prefix client
   npm run dev --prefix client
   ```

The client uses the Vite `/api` proxy to reach `http://localhost:4000`. The API refuses to start without `MONGODB_URI`, and email-code endpoints return a configuration error until valid SMTP settings are provided. No development-only OTP is exposed.

## Environment

See [`server/.env.example`](./server/.env.example) for MongoDB, SMTP, frontend-origin, and WebAuthn relying-party settings. In deployment, set `NODE_ENV=production`, use HTTPS, and set `CLIENT_ORIGIN`, `RP_ORIGIN`, and `RP_ID` to the actual frontend origin and hostname. WebAuthn is restricted to platform authenticators and requires a secure context (HTTPS, or localhost in development).

Phone numbers use E.164 format (for example, `+14155550123`). The account email remains the destination for one-time codes, including when a phone number is used as the sign-in identifier.

Every successful email-code or passkey sign-in replaces the account's active session. The session token is opaque, stored only as a hash in MongoDB, and delivered in an HttpOnly cookie.

## Android registration and email OTP

The mobile app posts registration to `POST /api/auth/signup`; the backend sends the OTP and returns its challenge ID only after email delivery succeeds. Verification and resend use the existing `/api/auth/otp/verify` and `/api/auth/otp/resend` endpoints.

Android sign-in requests an email code through `POST /api/auth/otp/request` and verifies it through the same `/api/auth/otp/verify` endpoint. After verification, the app stores the opaque session token in Expo SecureStore, validates restored sessions with `GET /api/auth/me`, and invalidates the server session when signing out. Protected mobile requests send the token as a Bearer credential; the web client continues to use its HttpOnly cookie.

1. Configure `server/.env` using `server/.env.example`. MongoDB must be reachable and SMTP must have real provider credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`). Without SMTP configuration the API returns an error and does not advance to OTP entry.
2. Find the PC's Wi-Fi IPv4 address with `ipconfig`. Copy `mobile/.env.example` to `mobile/.env.local` and set `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:4000`. For the Android emulator only, use `http://10.0.2.2:4000`; do not use `localhost` on a physical phone. These HTTP URLs are for local Expo development only; production builds require HTTPS. Keep the phone and PC on the same Wi-Fi and allow the server through Windows Firewall if prompted.
3. Start the API in one terminal:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

4. Start Expo in another terminal:

   ```powershell
   cd mobile
   npm install
   npx expo start
   ```

Scan the Expo QR code with Expo Go, submit a new email address, then enter the code actually delivered to that inbox within 10 minutes. Resend becomes available after the backend's 60-second cooldown while the challenge is still active.

## Android APK with EAS

The mobile app's EAS `preview` profile builds an installable APK and sets the public `EXPO_PUBLIC_API_URL` to `https://secureid-iw62.onrender.com`. If the EAS `preview` environment also defines this variable, keep it set to the same URL. EAS release config rejects missing, HTTP, localhost, and emulator API URLs. The ignored `mobile/.env.local` is for local development only and does not configure the APK. SMTP and database credentials belong only in the backend environment, never the mobile app.
