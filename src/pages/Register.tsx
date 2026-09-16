import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../lib/auth'

export default function Register() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await signUp(
        email.trim(),
        password,
        organizationName.trim()
      )

      setSuccess(
        'Account created successfully. Check your email if confirmation is required.'
      )

      setTimeout(() => {
        navigate('/login')
      }, 2500)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong'
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
          <div style={styles.header}>
            <div style={styles.badge}>
              Get started
            </div>

            <h1 style={styles.title}>
              Create your CRM
            </h1>

            <p style={styles.subtitle}>
              Set up your workspace and start managing
              your business in minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Organization */}
            <div style={styles.field}>
              <label style={styles.label}>
                Organization name
              </label>

              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  ◇
                </span>

                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) =>
                    setOrganizationName(
                      e.target.value
                    )
                  }
                  placeholder="Acme Sales"
                  autoComplete="organization"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label}>
                Work email
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
              <label style={styles.label}>
                Password
              </label>

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
                  placeholder="At least 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  required
                  style={styles.input}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  style={styles.eyeButton}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.error}>
                <span>!</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={styles.success}>
                <span>✓</span>
                <span>{success}</span>
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
                ? 'Creating account...'
                : 'Create account'}
            </button>
          </form>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>
              Already have an account?
            </span>
            <span style={styles.dividerLine} />
          </div>

          <Link
            to="/login"
            style={styles.secondaryButton}
          >
            Sign in instead
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

  header: {
    marginBottom: 28,
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

  success: {
    display: 'flex',
    gap: 9,
    padding: '11px 13px',
    borderRadius: 10,
    background:
      'rgba(34,197,94,0.09)',
    border:
      '1px solid rgba(34,197,94,0.20)',
    color: '#86efac',
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

  dividerLine: {
    flex: 1,
    height: 1,
    background:
      'rgba(148,163,184,0.12)',
  },

  dividerText: {
    color: '#64748b',
    fontSize: 11,
    whiteSpace: 'nowrap',
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