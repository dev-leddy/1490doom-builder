import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet.jsx'
import { useAuthStore } from '../store/authStore.js'

// Provider brand colors
const DISCORD_COLOR = '#5865F2'
const GOOGLE_COLOR = 'var(--dim)'

// states: 'providers' | 'login' | 'register' | 'forgot' | 'reset-sent' | 'reset'
export default function AuthSheet({ onClose, initialState = 'providers', resetToken = null }) {
  const [view, setView] = useState(initialState)
  const { fetchMe } = useAuthStore()

  async function handleAuthSuccess() {
    await fetchMe()
    onClose()
  }

  if (view === 'login') {
    return (
      <BottomSheet title="Sign In" onClose={onClose}>
        <LoginForm
          onSuccess={handleAuthSuccess}
          onForgot={() => setView('forgot')}
          onRegister={() => setView('register')}
          onBack={() => setView('providers')}
        />
      </BottomSheet>
    )
  }

  if (view === 'register') {
    return (
      <BottomSheet title="Create Account" onClose={onClose}>
        <RegisterForm
          onSuccess={handleAuthSuccess}
          onLogin={() => setView('login')}
          onBack={() => setView('providers')}
        />
      </BottomSheet>
    )
  }

  if (view === 'forgot') {
    return (
      <BottomSheet title="Reset Password" onClose={onClose}>
        <ForgotForm
          onSent={() => setView('reset-sent')}
          onBack={() => setView('login')}
        />
      </BottomSheet>
    )
  }

  if (view === 'reset-sent') {
    return (
      <BottomSheet title="Check Your Email" onClose={onClose}>
        <div className="auth-sheet-body">
          <p className="auth-sheet-desc">
            If an account exists for that email, you'll receive a reset link shortly. It expires in 1 hour.
          </p>
          <button className="auth-form-link" onClick={() => setView('login')}>Back to Sign In</button>
        </div>
      </BottomSheet>
    )
  }

  if (view === 'reset') {
    return (
      <BottomSheet title="Set New Password" onClose={onClose}>
        <ResetForm
          token={resetToken}
          onSuccess={handleAuthSuccess}
        />
      </BottomSheet>
    )
  }

  // Default: providers view
  return (
    <BottomSheet title="Sign In" onClose={onClose}>
      <div className="auth-sheet-body">
        <p className="auth-sheet-desc">
          Sign in to sync your doom companies across devices.
        </p>

        <div className="auth-sheet-buttons">
          <a
            className="auth-provider-btn auth-provider-btn--discord"
            href="/api/auth/discord"
            style={{ '--provider-color': DISCORD_COLOR }}
          >
            <DiscordIcon />
            Sign in with Discord
          </a>

          <a
            className="auth-provider-btn auth-provider-btn--google auth-provider-btn--light"
            href="/api/auth/google"
            style={{ '--provider-color': GOOGLE_COLOR }}
          >
            <GoogleIcon />
            Sign in with Google
          </a>

          <button
            className="auth-provider-btn auth-provider-btn--email"
            onClick={() => setView('login')}
          >
            <EmailIcon />
            Sign in with Email
          </button>
        </div>

        <p className="auth-sheet-note">
          Your local saves are never affected.
        </p>
      </div>
    </BottomSheet>
  )
}

/* ── Login Form ──────────────────────────────────────────── */
function LoginForm({ onSuccess, onForgot, onRegister, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Sign in failed'); return }
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-sheet-body">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-field">
          <label className="auth-form-label">Email</label>
          <input
            className="auth-form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="auth-form-field">
          <label className="auth-form-label">Password</label>
          <input
            className="auth-form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="auth-form-error">{error}</p>}
        <button className="auth-form-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <div className="auth-form-links">
        <button className="auth-form-link" onClick={onForgot}>Forgot password?</button>
        <button className="auth-form-link" onClick={onRegister}>No account? Register</button>
        <button className="auth-form-link auth-form-link--back" onClick={onBack}>← Other sign-in options</button>
      </div>
    </div>
  )
}

/* ── Register Form ───────────────────────────────────────── */
function RegisterForm({ onSuccess, onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-sheet-body">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-field">
          <label className="auth-form-label">Email</label>
          <input
            className="auth-form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="auth-form-field">
          <label className="auth-form-label">Username</label>
          <input
            className="auth-form-input"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="auth-form-field">
          <label className="auth-form-label">Password <span className="auth-form-hint">(min 8 characters)</span></label>
          <input
            className="auth-form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {error && <p className="auth-form-error">{error}</p>}
        <button className="auth-form-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <div className="auth-form-links">
        <button className="auth-form-link" onClick={onLogin}>Already have an account? Sign in</button>
        <button className="auth-form-link auth-form-link--back" onClick={onBack}>← Other sign-in options</button>
      </div>
    </div>
  )
}

/* ── Forgot Password Form ────────────────────────────────── */
function ForgotForm({ onSent, onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/email/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
    } catch { /* ignore */ }
    setLoading(false)
    onSent()
  }

  return (
    <div className="auth-sheet-body">
      <p className="auth-sheet-desc">
        Enter your email and we'll send a reset link if an account exists.
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-field">
          <label className="auth-form-label">Email</label>
          <input
            className="auth-form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <button className="auth-form-submit" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
      <div className="auth-form-links">
        <button className="auth-form-link auth-form-link--back" onClick={onBack}>← Back to Sign In</button>
      </div>
    </div>
  )
}

/* ── Reset Password Form ─────────────────────────────────── */
function ResetForm({ token, onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reset failed'); return }
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-sheet-body">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-field">
          <label className="auth-form-label">New Password <span className="auth-form-hint">(min 8 characters)</span></label>
          <input
            className="auth-form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {error && <p className="auth-form-error">{error}</p>}
        <button className="auth-form-submit" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Set New Password'}
        </button>
      </form>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────── */
function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  )
}
