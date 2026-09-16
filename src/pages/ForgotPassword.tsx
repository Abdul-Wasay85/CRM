import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault()

    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo,
          }
        )

      if (error) {
        throw error
      }

      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send reset email'
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
        <div style={styles.brand}>
          <div style={styles.logo}>W</div>

          <span style={styles.brandName}>
            Wasay<span style={styles.brandAccent}>CRM</span>
          </span>
        </div>

        <div style={styles.card}>
          {!success ? (
            <>
              <div style={styles.badge}>
                Account recovery
              </div>

              <h1 style={styles.title}>
                Forgot your password?
              </h1>

              <p style={styles.subtitle}>
                Enter your account email and we'll
                send you a secure link to reset your
                password.
              </p>

              <form
                onSubmit={handleSubmit}
                style={{ marginTop: 28 }}
              >
                <label style={styles.label}>
                  Email address
                </label>

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

                {error && (
                  <div style={styles.error}>
                    <span>!</span>
                    <span>{error}</span>
                  </div>
                )}

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
                    ? 'Sending link...'
                    : 'Send reset link'}
                </button>
              </form>

              <Link
                to="/login"
                style={styles.back}
              >
                ← Back to login
              </Link>
            </>
          ) : (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                ✓
              </div>

              <h1 style={styles.title}>
                Check your email
              </h1>

              <p style={styles.subtitle}>
                If an account exists for{' '}
                <strong style={{ color: '#e2e8f0' }}>
                  {email}
                </strong>
                , we've sent a password reset link.
              </p>

              <p style={styles.smallText}>
                Check your spam or junk folder if you
                don't see it within a few minutes.
              </p>

              <Link
                to="/login"
                style={styles.buttonLink}
              >
                Back to login
              </Link>
            </div>
          )}
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
  },

  brandName: {
    fontSize: 22,
    fontWeight: 750,
  },

  brandAccent: {
    color: '#a78bfa',
  },

  card: {
    background:
      'rgba(15,23,42,0.78)',
    border:
      '1px solid rgba(148,163,184,0.13)',
    borderRadius: 24,
    padding: '38px 36px',
    boxShadow:
      '0 30px 80px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(20px)',
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
    lineHeight: 1.65,
  },

  label: {
    display: 'block',
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },

  input: {
    width: '100%',
    height: 52,
    boxSizing: 'border-box',
    borderRadius: 12,
    border:
      '1px solid rgba(148,163,184,0.17)',
    background:
      'rgba(2,6,23,0.48)',
    color: '#f8fafc',
    outline: 'none',
    padding: '0 15px',
    fontSize: 14,
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
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },

  error: {
    display: 'flex',
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

  back: {
    display: 'block',
    textAlign: 'center',
    marginTop: 22,
    color: '#a78bfa',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
  },

  successContainer: {
    textAlign: 'center',
  },

  successIcon: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'rgba(34,197,94,0.12)',
    border:
      '1px solid rgba(34,197,94,0.25)',
    color: '#86efac',
    fontSize: 26,
    fontWeight: 700,
  },

  smallText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.6,
    margin: '18px 0 25px',
  },

  buttonLink: {
    height: 50,
    borderRadius: 12,
    background:
      'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },

  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 22,
  },
}