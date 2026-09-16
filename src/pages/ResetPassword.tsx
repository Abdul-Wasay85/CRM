import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError(
          'This password reset link is invalid or has expired. Please request a new one.'
        )
      }

      setCheckingSession(false)
    }

    checkRecoverySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setError('')
          setCheckingSession(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        })

      if (error) {
        throw error
      }

      setSuccess(true)

      setTimeout(() => {
        navigate('/dashboard')
      }, 2500)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reset your password.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner}>•</div>

          <h1 style={styles.title}>
            Verifying reset link
          </h1>

          <p style={styles.subtitle}>
            Please wait while we verify your password
            reset session.
          </p>
        </div>
      </div>
    )
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
                Password recovery
              </div>

              <h1 style={styles.title}>
                Create a new password
              </h1>

              <p style={styles.subtitle}>
                Choose a strong password for your
                CRM account.
              </p>

              {error && (
                <div style={styles.error}>
                  <span>!</span>
                  <span>{error}</span>
                </div>
              )}

              {!error.includes('invalid') &&
                !error.includes('expired') && (
                  <form
                    onSubmit={handleSubmit}
                    style={{ marginTop: 28 }}
                  >
                    <div style={styles.field}>
                      <label style={styles.label}>
                        New password
                      </label>

                      <div style={styles.inputWrapper}>
                        <input
                          type={
                            showPassword
                              ? 'text'
                              : 'password'
                          }
                          value={password}
                          onChange={(e) =>
                            setPassword(
                              e.target.value
                            )
                          }
                          placeholder="At least 6 characters"
                          autoComplete="new-password"
                          minLength={6}
                          required
                          style={styles.input}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              !showPassword
                            )
                          }
                          style={styles.eyeButton}
                        >
                          {showPassword
                            ? 'Hide'
                            : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>
                        Confirm new password
                      </label>

                      <div style={styles.inputWrapper}>
                        <input
                          type={
                            showConfirmPassword
                              ? 'text'
                              : 'password'
                          }
                          value={
                            confirmPassword
                          }
                          onChange={(e) =>
                            setConfirmPassword(
                              e.target.value
                            )
                          }
                          placeholder="Enter password again"
                          autoComplete="new-password"
                          required
                          style={styles.input}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              !showConfirmPassword
                            )
                          }
                          style={styles.eyeButton}
                        >
                          {showConfirmPassword
                            ? 'Hide'
                            : 'Show'}
                        </button>
                      </div>
                    </div>

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
                        ? 'Updating password...'
                        : 'Update password'}
                    </button>
                  </form>
                )}

              {(error.includes('invalid') ||
                error.includes('expired')) && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/forgot-password'
                    )
                  }
                  style={styles.button}
                >
                  Request a new link
                </button>
              )}
            </>
          ) : (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                ✓
              </div>

              <h1 style={styles.title}>
                Password updated
              </h1>

              <p style={styles.subtitle}>
                Your password has been changed
                successfully.
              </p>

              <p style={styles.smallText}>
                Redirecting you to your dashboard...
              </p>
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

  field: {
    marginBottom: 19,
  },

  label: {
    display: 'block',
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
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
  },

  input: {
    flex: 1,
    height: '100%',
    border: 0,
    outline: 0,
    background: 'transparent',
    color: '#f8fafc',
    fontSize: 14,
    padding: '0 12px 0 15px',
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
    marginTop: 6,
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
    marginTop: 22,
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
    marginTop: 18,
  },

  spinner: {
    textAlign: 'center',
    fontSize: 30,
    color: '#a78bfa',
    marginBottom: 15,
  },

  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 22,
  },
}