import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Fingerprint,
  KeyRound,
  LaptopMinimal,
  LockKeyhole,
  LogOut,
  Mail,
  ScanFace,
  Shield,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { authApi } from './lib/api'
import { authenticateWithPasskey, registerPasskey, supportsPasskeys } from './lib/passkeys'
import './App.css'

const initialSignup = { surname: '', dateOfBirth: '', email: '', phone: '', signInWith: 'email' }

function App() {
  const [stage, setStage] = useState('signin')
  const [user, setUser] = useState(null)
  const [signup, setSignup] = useState(initialSignup)
  const [identifier, setIdentifier] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [delivery, setDelivery] = useState('')
  const [code, setCode] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const passkeysSupported = supportsPasskeys()

  useEffect(() => {
    let active = true
    authApi.me()
      .then(({ user: currentUser }) => {
        if (active) {
          setUser(currentUser)
          setStage('dashboard')
        }
      })
      .catch((requestError) => {
        if (
          active &&
          requestError.message !== 'Please sign in to continue.' &&
          requestError.message !== 'Your session has expired. Please sign in again.'
        ) {
          setError(requestError.message)
        }
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (resendSeconds <= 0) return undefined
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  function startBusy() {
    setBusy(true)
    setError('')
    setNotice('')
  }

  async function beginSignIn(event) {
    event.preventDefault()
    startBusy()
    try {
      const result = await authApi.requestOtp(identifier.trim())
      setChallengeId(result.challengeId)
      setDelivery(result.delivery)
      setCode('')
      setResendSeconds(result.resendInSeconds)
      setNotice(result.message)
      setStage('otp')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function beginSignUp(event) {
    event.preventDefault()
    startBusy()
    try {
      const result = await authApi.signup({
        surname: signup.surname,
        dateOfBirth: signup.dateOfBirth,
        email: signup.email,
        phone: signup.phone || undefined,
      })
      setChallengeId(result.challengeId)
      setDelivery(result.delivery)
      setIdentifier(signup.signInWith === 'phone' ? signup.phone : signup.email)
      setCode('')
      setResendSeconds(result.resendInSeconds)
      setNotice(`We sent a six-digit code to ${result.delivery}.`)
      setStage('otp')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    startBusy()
    try {
      const result = await authApi.verifyOtp(challengeId, code)
      setUser(result.user)
      setStage('dashboard')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function resendCode() {
    startBusy()
    try {
      const result = await authApi.resendOtp(challengeId)
      setDelivery(result.delivery)
      setResendSeconds(result.resendInSeconds)
      setNotice(`A new code is on its way to ${result.delivery}.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function signInWithPasskey(event) {
    event.preventDefault()
    startBusy()
    try {
      const { challengeId: nextChallengeId, options } = await authApi.authenticationOptions(identifier.trim())
      const response = await authenticateWithPasskey(options)
      const result = await authApi.verifyPasskeyAuthentication(nextChallengeId, response)
      setUser(result.user)
      setStage('dashboard')
    } catch (requestError) {
      setError(requestError.message || 'Passkey sign-in was cancelled or could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  async function addPasskey() {
    startBusy()
    try {
      const { challengeId: nextChallengeId, options } = await authApi.registerPasskeyOptions()
      const response = await registerPasskey(options)
      const result = await authApi.verifyPasskeyRegistration(nextChallengeId, response)
      setUser(result.user)
      setNotice('Your passkey is ready for next time.')
    } catch (requestError) {
      setError(requestError.message || 'Passkey setup was cancelled or could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    startBusy()
    try {
      await authApi.logout()
      setUser(null)
      setIdentifier('')
      setSignup(initialSignup)
      setStage('signin')
      setNotice('You have securely signed out.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  function showSignUp() {
    setError('')
    setNotice('')
    setStage('signup')
  }

  function showSignIn() {
    setError('')
    setNotice('')
    setStage('signin')
  }

  const isDashboard = stage === 'dashboard' && user

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SecureID home">
          <span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.2} /></span>
          <span>secure<span className="brand-light">ID</span></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> Privacy-first identity</div>
      </header>

      <section className={`auth-layout ${isDashboard ? 'auth-layout-dashboard' : ''}`}>
        <div className="auth-column">
          <div className="mobile-trust"><Shield size={15} /> Your identity, protected</div>

          {isDashboard ? (
            <section className="auth-card dashboard-card">
              <div className="success-mark"><CircleCheck size={26} /></div>
              <p className="eyebrow">YOUR SECURE SPACE</p>
              <h1>Welcome, {user.surname}.</h1>
              <p className="card-intro">You’re signed in on this device. Your account is protected with a private session.</p>

              <div className="account-summary">
                <div className="summary-icon"><Mail size={18} /></div>
                <div className="summary-copy"><span>Email</span><strong>{user.email}</strong></div>
                <span className="verified-tag"><Check size={13} /> Verified</span>
              </div>
              {user.phone && (
                <div className="account-summary">
                  <div className="summary-icon"><Smartphone size={18} /></div>
                  <div className="summary-copy"><span>Phone</span><strong>{user.phone}</strong></div>
                </div>
              )}

              <div className="session-note">
                <LockKeyhole size={17} />
                <span>Only one active session is allowed. Signing in elsewhere will end this session.</span>
              </div>

              <div className="security-section">
                <div className="security-heading">
                  <div>
                    <p className="eyebrow">QUICKER, SECURE SIGN-IN</p>
                    <h2>{user.passkeyCount ? 'Passkey enabled' : 'Set up a passkey'}</h2>
                  </div>
                  <div className="passkey-symbol"><Fingerprint size={19} /></div>
                </div>
                {user.passkeyCount ? (
                  <p className="security-description">A passkey is connected to this account. Use Face ID, Touch ID, or Windows Hello next time.</p>
                ) : (
                  <>
                    <p className="security-description">Use Face ID, Touch ID, or Windows Hello to sign in without a code.</p>
                    <button className="secondary-button passkey-setup-button" type="button" onClick={addPasskey} disabled={busy || !passkeysSupported}>
                      <Fingerprint size={18} /> {busy ? 'Setting up…' : 'Add a passkey'} <ChevronRight size={17} />
                    </button>
                    {!passkeysSupported && <p className="inline-hint">Passkeys are not supported in this browser.</p>}
                  </>
                )}
              </div>

              <button className="text-button signout-button" type="button" onClick={signOut} disabled={busy}>
                <LogOut size={16} /> {busy ? 'Signing out…' : 'Sign out'}
              </button>
              <Feedback error={error} notice={notice} />
            </section>
          ) : stage === 'otp' ? (
            <section className="auth-card">
              <button className="back-button" type="button" onClick={showSignIn}><ArrowLeft size={16} /> Back</button>
              <div className="step-icon"><Mail size={20} /></div>
              <p className="eyebrow">EMAIL VERIFICATION</p>
              <h1>Check your inbox.</h1>
              <p className="card-intro">Enter the six-digit code we sent to <strong>{delivery}</strong>. It’s valid for 10 minutes.</p>

              <form onSubmit={verifyCode}>
                <label className="field-label" htmlFor="otp-code">Verification code</label>
                <input
                  autoFocus
                  autoComplete="one-time-code"
                  className="otp-input"
                  id="otp-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="· · · · · ·"
                  value={code}
                />
                <Feedback error={error} notice={notice} />
                <button className="primary-button" type="submit" disabled={busy || code.length !== 6}>
                  {busy ? 'Verifying…' : 'Verify and continue'} <ArrowRight size={17} />
                </button>
              </form>

              <div className="resend-row">
                <span>Didn’t get the email?</span>
                <button className="text-button" type="button" onClick={resendCode} disabled={busy || resendSeconds > 0}>
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Send a new code'}
                </button>
              </div>
              <p className="small-print"><LockKeyhole size={13} /> Your code is private. SecureID will never ask you to share it.</p>
            </section>
          ) : stage === 'signup' ? (
            <section className="auth-card">
              <button className="back-button" type="button" onClick={showSignIn}><ArrowLeft size={16} /> Back to sign in</button>
              <div className="step-icon"><ShieldCheck size={20} /></div>
              <p className="eyebrow">CREATE YOUR SECUREID</p>
              <h1>Start with the essentials.</h1>
              <p className="card-intro">Create your private identity in just a few steps.</p>

              <form className="form-stack" onSubmit={beginSignUp}>
                <div className="field-grid">
                  <div className="form-field">
                    <label className="field-label" htmlFor="surname">Surname</label>
                    <input id="surname" autoComplete="family-name" maxLength={80} onChange={(event) => setSignup({ ...signup, surname: event.target.value })} placeholder="Your surname" required value={signup.surname} />
                  </div>
                  <div className="form-field">
                    <label className="field-label" htmlFor="dob">Date of birth</label>
                    <div className="input-icon-wrap"><CalendarDays size={16} /><input id="dob" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} onChange={(event) => setSignup({ ...signup, dateOfBirth: event.target.value })} required type="date" value={signup.dateOfBirth} /></div>
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="signup-email">Email address <span className="label-note">for your verification code</span></label>
                  <div className="input-icon-wrap"><Mail size={16} /><input id="signup-email" autoComplete="email" onChange={(event) => setSignup({ ...signup, email: event.target.value })} placeholder="you@example.com" required type="email" value={signup.email} /></div>
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="phone">Phone number <span className="label-note">optional, with country code</span></label>
                  <div className="input-icon-wrap"><Smartphone size={16} /><input id="phone" autoComplete="tel" onChange={(event) => setSignup({ ...signup, phone: event.target.value })} placeholder="+1 555 123 4567" required={signup.signInWith === 'phone'} type="tel" value={signup.phone} /></div>
                </div>

                <div className="form-field">
                  <span className="field-label">Use this to sign in</span>
                  <div className="choice-row">
                    <button className={`choice-button ${signup.signInWith === 'email' ? 'selected' : ''}`} onClick={() => setSignup({ ...signup, signInWith: 'email' })} type="button"><Mail size={15} /> Email</button>
                    <button className={`choice-button ${signup.signInWith === 'phone' ? 'selected' : ''}`} disabled={!signup.phone} onClick={() => setSignup({ ...signup, signInWith: 'phone' })} type="button"><Smartphone size={15} /> Phone</button>
                  </div>
                  {signup.signInWith === 'phone' && <p className="inline-hint">We’ll send sign-in codes to your email. Your phone number is your sign-in ID.</p>}
                </div>
                <Feedback error={error} notice={notice} />
                <button className="primary-button" type="submit" disabled={busy}>
                  {busy ? 'Sending code…' : 'Create account'} <ArrowRight size={17} />
                </button>
              </form>
              <p className="small-print"><LockKeyhole size={13} /> Your information is used only to protect your account.</p>
            </section>
          ) : (
            <section className="auth-card">
              <div className="step-icon"><KeyRound size={20} /></div>
              <p className="eyebrow">WELCOME BACK</p>
              <h1>Your identity, <span className="heading-accent">secured.</span></h1>
              <p className="card-intro">Sign in safely with a one-time email code or your device passkey.</p>

              <form onSubmit={beginSignIn}>
                <label className="field-label" htmlFor="identifier">Email or phone number</label>
                <div className="input-icon-wrap"><Mail size={16} /><input autoComplete="username" id="identifier" onChange={(event) => setIdentifier(event.target.value)} placeholder="you@example.com or +1 555…" required value={identifier} /></div>
                <p className="inline-hint">Phone sign-in codes are delivered to the email on your account.</p>
                <Feedback error={error} notice={notice} />
                <button className="primary-button" type="submit" disabled={busy}>
                  {busy ? 'Sending code…' : 'Continue with email code'} <ArrowRight size={17} />
                </button>
              </form>

              {passkeysSupported && (
                <>
                  <div className="separator"><span>OR</span></div>
                  <form onSubmit={signInWithPasskey}>
                    <button className="secondary-button" type="submit" disabled={busy || !identifier.trim()}>
                      <Fingerprint size={18} /> Continue with a passkey
                    </button>
                  </form>
                </>
              )}
              <div className="signup-prompt">New to SecureID? <button className="text-button" type="button" onClick={showSignUp}>Create an account <ChevronRight size={14} /></button></div>
              <p className="small-print"><LockKeyhole size={13} /> Secure, private sign-in. No password to remember.</p>
            </section>
          )}
          <footer className="page-footer"><span>© {new Date().getFullYear()} SecureID</span><span className="footer-links"><a href="mailto:support@secureid.example">Help</a><span>·</span><span>Privacy by design</span></span></footer>
        </div>

        <aside className="trust-panel" aria-label="SecureID security features">
          <div className="panel-orb orb-one" /><div className="panel-orb orb-two" />
          <div className="trust-content">
            <div className="trust-kicker"><span className="trust-line" /> BUILT AROUND YOU</div>
            <h2>Less friction.<br /><span>More peace of mind.</span></h2>
            <p className="trust-description">A thoughtful, private way to access what matters — without the password fatigue.</p>
            <div className="security-visual">
              <div className="visual-ring ring-outer" /><div className="visual-ring ring-inner" />
              <div className="visual-glow" />
              <div className="visual-shield"><ShieldCheck size={38} strokeWidth={1.6} /></div>
              <div className="visual-check"><Check size={14} strokeWidth={2.5} /></div>
              <div className="visual-orbit orbit-top"><ScanFace size={18} /></div>
              <div className="visual-orbit orbit-bottom"><KeyRound size={16} /></div>
            </div>
            <div className="feature-list">
              <div className="feature-item"><span className="feature-icon"><Fingerprint size={16} /></span><span><strong>Passkey ready</strong><small>Face ID, Touch ID &amp; Windows Hello</small></span><Check className="feature-check" size={15} /></div>
              <div className="feature-item"><span className="feature-icon"><Shield size={16} /></span><span><strong>Private by default</strong><small>Your data stays yours</small></span><Check className="feature-check" size={15} /></div>
            </div>
            <div className="panel-footnote"><LaptopMinimal size={15} /> One account. One active session. Your call.</div>
          </div>
          <div className="panel-bottom"><span>SECUREID IDENTITY PLATFORM</span><span>01 — PRIVATE ACCESS</span></div>
        </aside>
      </section>
    </main>
  )
}

function Feedback({ error, notice }) {
  if (error) return <p className="feedback feedback-error" role="alert">{error}</p>
  if (notice) return <p className="feedback feedback-notice" role="status">{notice}</p>
  return null
}

export default App
