import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      await signIn(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid email or password'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        {/* Branding */}
        <div style={styles.brand}>
          <div style={styles.logo}>
            W
          </div>

          <span style={styles.brandName}>
            Wasay<span style={styles.brandAccent}>CRM</span>
          </span>
        </div>

        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.badge}>
              Welcome back
            </div>

            <h1 style={styles.title}>
              Sign in to your CRM
            </h1>

            <p style={styles.subtitle}>
              Manage your team, leads, customers and
              sales from one place.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label}>
                Email address
              </label>

              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  @
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.field}>
              <div style={styles.passwordHeader}>
                <label style={styles.label}>
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  style={styles.forgot}
                >
                  Forgot password?
                </Link>
              </div>

              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  •
                </span>

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={styles.input}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  style={styles.eyeButton}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.error}>
                <span>!</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                ...(loading
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </button>
          </form>

          <div style={styles.divider}>
            <span />
            <p>New to CRM?</p>
            <span />
          </div>

          <Link
            to="/register"
            style={styles.secondaryButton}
          >
            Create your account
          </Link>
        </div>

        <p style={styles.footer}>
          © {new Date().getFullYear()} CRM.
          All rights reserved.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 20% 20%, rgba(124,58,237,0.16), transparent 30%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.12), transparent 30%), #070b14',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  glowOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background:
      'rgba(124,58,237,0.13)',
    filter: 'blur(100px)',
    top: -180,
    left: -150,
  },

  glowTwo: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: '50%',
    background:
      'rgba(37,99,235,0.10)',
    filter: 'blur(100px)',
    bottom: -180,
    right: -130,
  },

  container: {
    width: '100%',
    maxWidth: 460,
    position: 'relative',
    zIndex: 1,
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    marginBottom: 28,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background:
      'linear-gradient(135deg, #7c3aed, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    fontWeight: 800,
    boxShadow:
      '0 10px 30px rgba(124,58,237,0.30)',
  },

  brandName: {
    fontSize: 22,
    fontWeight: 750,
    letterSpacing: '-0.5px',
  },

  brandAccent: {
    color: '#a78bfa',
  },

  card: {
    background:
      'rgba(15, 23, 42, 0.78)',
    border:
      '1px solid rgba(148,163,184,0.13)',
    borderRadius: 24,
    padding: '38px 36px',
    boxShadow:
      '0 30px 80px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(20px)',
  },

  header: {
    marginBottom: 30,
  },

  badge: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    background:
      'rgba(124,58,237,0.12)',
    border:
      '1px solid rgba(124,58,237,0.22)',
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: 650,
    marginBottom: 14,
  },

  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.15,
    letterSpacing: '-1px',
  },

  subtitle: {
    margin: '12px 0 0',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1.6,
  },

  field: {
    marginBottom: 21,
  },

  passwordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  label: {
    display: 'block',
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },

  forgot: {
    color: '#a78bfa',
    fontSize: 12,
    textDecoration: 'none',
    fontWeight: 600,
  },

  inputWrapper: {
    height: 52,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 12,
    border:
      '1px solid rgba(148,163,184,0.17)',
    background:
      'rgba(2,6,23,0.48)',
    transition: 'border-color 0.2s',
  },

  inputIcon: {
    width: 42,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 15,
    fontWeight: 700,
  },

  input: {
    flex: 1,
    height: '100%',
    border: 0,
    outline: 0,
    background: 'transparent',
    color: '#f8fafc',
    fontSize: 14,
    padding: '0 10px 0 0',
  },

  eyeButton: {
    border: 0,
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '8px 12px',
  },

  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '11px 13px',
    borderRadius: 10,
    background:
      'rgba(239,68,68,0.09)',
    border:
      '1px solid rgba(239,68,68,0.20)',
    color: '#fca5a5',
    fontSize: 12,
    marginBottom: 18,
  },

  button: {
    width: '100%',
    height: 52,
    border: 0,
    borderRadius: 12,
    background:
      'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow:
      '0 12px 30px rgba(124,58,237,0.24)',
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '25px 0 18px',
  },

  dividerSpan: {
    flex: 1,
  },

  secondaryButton: {
    height: 50,
    borderRadius: 12,
    border:
      '1px solid rgba(148,163,184,0.16)',
    background:
      'rgba(255,255,255,0.025)',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 650,
  },

  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 22,
  },
}