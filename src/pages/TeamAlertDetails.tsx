import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  Clock,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useOrganization } from '../context/OrganizationContext'

type Priority = 'high' | 'medium' | 'low'

type TeamAlert = {
  id: string
  organization_id: string
  created_by: string
  title: string
  message: string
  priority: Priority
  created_at: string
}

type PriorityConfig = {
  label: string
  color: string
  background: string
  border: string
  badgeText: string
  icon: typeof ShieldAlert
}

const priorityConfig: Record<Priority, PriorityConfig> = {
  high: {
    label: 'High Priority',
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.25)',
    badgeText: '#fca5a5',
    icon: ShieldAlert,
  },

  medium: {
    label: 'Medium Priority',
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.25)',
    badgeText: '#fcd34d',
    icon: AlertTriangle,
  },

  low: {
    label: 'Low Priority',
    color: '#60a5fa',
    background: 'rgba(59, 130, 246, 0.10)',
    border: 'rgba(59, 130, 246, 0.25)',
    badgeText: '#93c5fd',
    icon: Bell,
  },
}

function normalizePriority(
  value: string | null | undefined,
): Priority {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (normalized === 'high') {
    return 'high'
  }

  if (normalized === 'low') {
    return 'low'
  }

  return 'medium'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TeamAlertDetails() {
  const navigate = useNavigate()
  const { alertId } = useParams()

  const { organizationId } = useOrganization()

  const [alert, setAlert] =
    useState<TeamAlert | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const loadAlert = useCallback(async () => {
    if (!alertId) {
      setError('No alert was specified.')
      setAlert(null)
      setLoading(false)
      return
    }

    if (!organizationId) {
      setError(
        'Your organization could not be identified.',
      )
      setAlert(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'You are not authenticated.',
        )
      }

      const {
        data,
        error: fetchError,
      } = await supabase
        .from('team_alerts')
        .select(
          `
            id,
            organization_id,
            created_by,
            title,
            message,
            priority,
            created_at
          `,
        )
        .eq('id', alertId)
        .eq(
          'organization_id',
          organizationId,
        )
        .maybeSingle()

      if (fetchError) {
        throw fetchError
      }

      if (!data) {
        setAlert(null)
        setError(
          'This alert could not be found or you do not have access to it.',
        )
        return
      }

      const normalizedAlert: TeamAlert = {
        id: data.id,
        organization_id:
          data.organization_id,
        created_by: data.created_by,
        title:
          data.title ||
          'Untitled alert',
        message:
          data.message || '',
        priority:
          normalizePriority(
            data.priority,
          ),
        created_at:
          data.created_at,
      }

      setAlert(normalizedAlert)

      /*
       * Mark alert as read.
       */
      const {
        error: readError,
      } = await supabase
        .from('team_alert_reads')
        .upsert(
          {
            alert_id: data.id,
            user_id: user.id,
            read_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              'alert_id,user_id',
          },
        )

      if (readError) {
        console.error(
          'Failed to mark alert as read:',
          readError,
        )
      }
    } catch (err) {
      console.error(
        'Alert loading error:',
        err,
      )

      setAlert(null)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load this team alert.',
      )
    } finally {
      setLoading(false)
    }
  }, [
    alertId,
    organizationId,
  ])

  useEffect(() => {
    loadAlert()
  }, [loadAlert])

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            'calc(100vh - var(--crm-topbar-height, 72px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '14px',
              border:
                '1px solid rgba(124, 58, 237, 0.20)',
              background:
                'rgba(124, 58, 237, 0.10)',
            }}
          >
            <Loader2
              size={21}
              color="#a78bfa"
              style={{
                animation:
                  'team-alert-details-spin 0.8s linear infinite',
              }}
            />
          </div>

          <div
            style={{
              marginTop: '14px',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Loading alert...
          </div>

          <div
            style={{
              marginTop: '5px',
              color: '#475569',
              fontSize: '12px',
            }}
          >
            Getting the alert details
          </div>
        </div>
      </div>
    )
  }

  /*
   * ---------------------------------------------------------
   * NOT FOUND
   * ---------------------------------------------------------
   */

  if (!alert) {
    return (
      <div
        style={{
          minHeight:
            'calc(100vh - var(--crm-topbar-height, 72px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '36px',
            border:
              '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            background:
              'rgba(15, 23, 42, 0.72)',
            boxShadow:
              '0 20px 60px rgba(0,0,0,0.25)',
            backdropFilter:
              'blur(18px)',
            WebkitBackdropFilter:
              'blur(18px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '16px',
              border:
                '1px solid rgba(239,68,68,0.20)',
              background:
                'rgba(239,68,68,0.10)',
            }}
          >
            <AlertTriangle
              size={27}
              color="#f87171"
            />
          </div>

          <h1
            style={{
              margin:
                '18px 0 0',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            Alert not found
          </h1>

          <p
            style={{
              margin:
                '8px 0 0',
              color: '#64748b',
              fontSize: '13px',
              lineHeight: 1.7,
            }}
          >
            {error ||
              'The alert may have been deleted or you may not have access to it.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/team-alerts')
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '42px',
              marginTop: '22px',
              padding:
                '0 17px',
              border:
                '1px solid rgba(139,92,246,0.30)',
              borderRadius: '11px',
              background:
                'linear-gradient(135deg,#7c3aed,#8b5cf6)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow:
                '0 12px 30px rgba(124,58,237,0.18)',
            }}
          >
            <ArrowLeft size={15} />
            Back to Team Alerts
          </button>
        </div>
      </div>
    )
  }

  const config =
    priorityConfig[alert.priority]

  const PriorityIcon =
    config.icon

  /*
   * ---------------------------------------------------------
   * DETAILS PAGE
   * ---------------------------------------------------------
   */

  return (
    <div
      style={{
        width: '100%',
        minHeight:
          'calc(100vh - var(--crm-topbar-height, 72px))',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        {/* ---------------------------------------------------
            TOP NAVIGATION
        --------------------------------------------------- */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate('/team-alerts')
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '40px',
              padding:
                '0 14px',
              border:
                '1px solid rgba(255,255,255,0.08)',
              borderRadius: '11px',
              background:
                'rgba(255,255,255,0.025)',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={15} />
            Team Alerts
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <Bell size={14} />
            Team Alert
          </div>
        </div>

        {/* ---------------------------------------------------
            MAIN ALERT CARD
        --------------------------------------------------- */}

        <article
          style={{
            position: 'relative',
            overflow: 'hidden',
            border:
              '1px solid rgba(255,255,255,0.08)',
            borderRadius: '22px',
            background:
              'rgba(15,23,42,0.68)',
            boxShadow:
              '0 25px 70px rgba(0,0,0,0.25)',
            backdropFilter:
              'blur(20px)',
            WebkitBackdropFilter:
              'blur(20px)',
          }}
        >
          {/* Purple ambient glow */}
          <div
            style={{
              position: 'absolute',
              width: '420px',
              height: '420px',
              top: '-220px',
              right: '-160px',
              borderRadius: '50%',
              background:
                'rgba(124,58,237,0.10)',
              filter: 'blur(80px)',
              pointerEvents: 'none',
            }}
          />

          {/* -------------------------------------------------
              ALERT HEADER
          ------------------------------------------------- */}

          <div
            style={{
              position: 'relative',
              padding:
                '38px 42px',
              borderBottom:
                '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
              }}
            >
              {/* Priority icon */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderRadius: '17px',
                  border:
                    `1px solid ${config.border}`,
                  background:
                    config.background,
                  boxShadow:
                    `0 12px 35px ${config.background}`,
                }}
              >
                <PriorityIcon
                  size={29}
                  color={config.color}
                />
              </div>

              {/* Header content */}
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {/* Badges */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '13px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding:
                        '6px 10px',
                      borderRadius: '999px',
                      border:
                        `1px solid ${config.border}`,
                      background:
                        config.background,
                      color:
                        config.badgeText,
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <PriorityIcon
                      size={12}
                    />

                    {config.label}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding:
                        '6px 10px',
                      borderRadius: '999px',
                      border:
                        '1px solid rgba(34,197,94,0.20)',
                      background:
                        'rgba(34,197,94,0.08)',
                      color: '#86efac',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    <Check
                      size={12}
                    />

                    Read
                  </span>
                </div>

                {/* Title */}
                <h1
                  style={{
                    margin: 0,
                    maxWidth: '800px',
                    color: '#f8fafc',
                    fontSize:
                      'clamp(24px, 4vw, 38px)',
                    lineHeight: 1.15,
                    fontWeight: 750,
                    letterSpacing:
                      '-0.03em',
                  }}
                >
                  {alert.title}
                </h1>

                {/* Date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    marginTop: '14px',
                    color: '#64748b',
                    fontSize: '12px',
                  }}
                >
                  <Clock size={14} />

                  {formatDate(
                    alert.created_at,
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------
              MESSAGE
          ------------------------------------------------- */}

          <div
            style={{
              position: 'relative',
              padding:
                '42px',
            }}
          >
            <div
              style={{
                maxWidth: '820px',
              }}
            >
              <div
                style={{
                  marginBottom:
                    '14px',
                  color: '#475569',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing:
                    '0.14em',
                  textTransform:
                    'uppercase',
                }}
              >
                Message
              </div>

              <div
                style={{
                  color: '#cbd5e1',
                  fontSize: '16px',
                  lineHeight: 1.9,
                  whiteSpace:
                    'pre-wrap',
                  overflowWrap:
                    'break-word',
                }}
              >
                {alert.message}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------
              FOOTER
          ------------------------------------------------- */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: '20px',
              padding:
                '20px 42px',
              borderTop:
                '1px solid rgba(255,255,255,0.06)',
              background:
                'rgba(2,6,23,0.28)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                color: '#64748b',
                fontSize: '12px',
              }}
            >
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9px',
                  background:
                    'rgba(34,197,94,0.08)',
                  border:
                    '1px solid rgba(34,197,94,0.15)',
                }}
              >
                <Check
                  size={14}
                  color="#4ade80"
                />
              </span>

              You have viewed this alert.
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/team-alerts')
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '40px',
                padding:
                  '0 15px',
                border:
                  '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                background:
                  'rgba(255,255,255,0.025)',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={15} />
              Back to all alerts
            </button>
          </div>
        </article>
      </div>

      <style>{`
        @keyframes team-alert-details-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .team-alert-details-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}