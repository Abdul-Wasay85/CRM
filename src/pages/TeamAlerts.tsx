import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  Clock,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useOrganization } from '../context/OrganizationContext'

type Priority = 'high' | 'medium' | 'low'

type TeamAlertRow = {
  id: string
  organization_id: string
  created_by: string
  title: string
  message: string
  priority: string | null
  created_at: string
}

type TeamAlert = {
  id: string
  organization_id: string
  created_by: string
  title: string
  message: string
  priority: Priority
  created_at: string
  isRead: boolean
}

type PriorityConfig = {
  label: string
  icon: typeof ShieldAlert
  color: string
  background: string
  border: string
  badgeBackground: string
  badgeText: string
}

const priorityConfig: Record<Priority, PriorityConfig> = {
  high: {
    label: 'High',
    icon: ShieldAlert,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.22)',
    badgeBackground: 'rgba(239, 68, 68, 0.10)',
    badgeText: '#fca5a5',
  },

  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.22)',
    badgeBackground: 'rgba(245, 158, 11, 0.10)',
    badgeText: '#fcd34d',
  },

  low: {
    label: 'Low',
    icon: Bell,
    color: '#60a5fa',
    background: 'rgba(59, 130, 246, 0.10)',
    border: 'rgba(59, 130, 246, 0.22)',
    badgeBackground: 'rgba(59, 130, 246, 0.10)',
    badgeText: '#93c5fd',
  },
}

function normalizePriority(value: string | null | undefined): Priority {
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
    return 'Unknown time'
  }

  const now = new Date()
  const difference = now.getTime() - date.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (difference < minute) {
    return 'Just now'
  }

  if (difference < hour) {
    const minutes = Math.floor(difference / minute)
    return `${minutes}m ago`
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour)
    return `${hours}h ago`
  }

  if (difference < 7 * day) {
    const days = Math.floor(difference / day)
    return `${days}d ago`
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== now.getFullYear()
        ? 'numeric'
        : undefined,
  })
}

function PriorityBadge({
  priority,
}: {
  priority: Priority
}) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 9px',
        borderRadius: '999px',
        border: `1px solid ${config.border}`,
        background: config.badgeBackground,
        color: config.badgeText,
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  )
}

export default function TeamAlerts() {
  const navigate = useNavigate()

  const {
    organizationId,
    role,
  } = useOrganization()

  const [alerts, setAlerts] = useState<TeamAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] =
    useState(false)

  const [creating, setCreating] = useState(false)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] =
    useState<Priority>('medium')

  const canCreateAlert =
    role === 'owner' ||
    role === 'admin'

  /*
   * ---------------------------------------------------------
   * LOAD ALERTS
   * ---------------------------------------------------------
   */

  const loadAlerts = useCallback(async () => {
    if (!organizationId) {
      setAlerts([])
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
        data: alertsData,
        error: alertsError,
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
        .eq(
          'organization_id',
          organizationId,
        )
        .order('created_at', {
          ascending: false,
        })

      if (alertsError) {
        throw alertsError
      }

      const {
        data: readsData,
        error: readsError,
      } = await supabase
        .from('team_alert_reads')
        .select('alert_id')
        .eq('user_id', user.id)

      if (readsError) {
        throw readsError
      }

      const readIds = new Set(
        (readsData ?? []).map(
          (item) => item.alert_id,
        ),
      )

      const normalizedAlerts: TeamAlert[] =
        ((alertsData ?? []) as TeamAlertRow[]).map(
          (row) => ({
            id: row.id,
            organization_id:
              row.organization_id,
            created_by: row.created_by,
            title: row.title || 'Untitled alert',
            message: row.message || '',
            priority:
              normalizePriority(
                row.priority,
              ),
            created_at: row.created_at,
            isRead: readIds.has(row.id),
          }),
        )

      setAlerts(normalizedAlerts)
    } catch (err) {
      console.error(
        'TEAM ALERTS LOAD ERROR:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load team alerts.',
      )

      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  /*
   * ---------------------------------------------------------
   * REALTIME
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!organizationId) {
      return
    }

    const channel = supabase
      .channel(
        `team-alerts-${organizationId}`,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_alerts',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          loadAlerts()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    organizationId,
    loadAlerts,
  ])

  /*
   * ---------------------------------------------------------
   * MARK READ
   * ---------------------------------------------------------
   */

  const markAsRead = async (
    alertId: string,
  ) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        return
      }

      const {
        error: readError,
      } = await supabase
        .from('team_alert_reads')
        .upsert(
          {
            alert_id: alertId,
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
          'MARK READ ERROR:',
          readError,
        )

        return
      }

      setAlerts((current) =>
        current.map((item) =>
          item.id === alertId
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      )
    } catch (err) {
      console.error(
        'MARK READ ERROR:',
        err,
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * OPEN ALERT
   * ---------------------------------------------------------
   */

  const openAlert = async (
    alert: TeamAlert,
  ) => {
    if (!alert.isRead) {
      await markAsRead(alert.id)
    }

    navigate(
      `/team-alerts/${alert.id}`,
    )
  }

  /*
   * ---------------------------------------------------------
   * CREATE ALERT
   * ---------------------------------------------------------
   */

  const handleCreateAlert = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!organizationId) {
      setError(
        'Your organization could not be identified.',
      )

      return
    }

    if (!canCreateAlert) {
      setError(
        'You do not have permission to create team alerts.',
      )

      return
    }

    const cleanTitle = title.trim()
    const cleanMessage = message.trim()

    if (!cleanTitle) {
      setError(
        'Please enter an alert title.',
      )

      return
    }

    if (!cleanMessage) {
      setError(
        'Please enter an alert message.',
      )

      return
    }

    try {
      setCreating(true)
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
        error: insertError,
      } = await supabase
        .from('team_alerts')
        .insert({
          organization_id:
            organizationId,
          created_by: user.id,
          title: cleanTitle,
          message: cleanMessage,
          priority,
        })
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
        .single()

      if (insertError) {
        throw insertError
      }

      if (data) {
        const newAlert: TeamAlert = {
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
          isRead: true,
        }

        setAlerts((current) => [
          newAlert,
          ...current.filter(
            (item) =>
              item.id !== newAlert.id,
          ),
        ])
      }

      setTitle('')
      setMessage('')
      setPriority('medium')
      setShowCreateModal(false)
    } catch (err) {
      console.error(
        'CREATE ALERT ERROR:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create alert.',
      )
    } finally {
      setCreating(false)
    }
  }

  const unreadCount =
    alerts.filter(
      (item) => !item.isRead,
    ).length

  /*
   * ---------------------------------------------------------
   * PAGE
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
          maxWidth: '1450px',
          margin: '0 auto',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  background:
                    'rgba(124, 58, 237, 0.12)',
                  border:
                    '1px solid rgba(124, 58, 237, 0.20)',
                }}
              >
                <BellRing
                  size={18}
                  color="#a78bfa"
                />
              </div>

              <span
                style={{
                  color: '#a78bfa',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing:
                    '0.14em',
                  textTransform:
                    'uppercase',
                }}
              >
                Communication
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: '30px',
                  lineHeight: 1.2,
                  fontWeight: 700,
                  letterSpacing:
                    '-0.025em',
                }}
              >
                Team Alerts
              </h1>

              {unreadCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems:
                      'center',
                    padding:
                      '5px 10px',
                    borderRadius:
                      '999px',
                    background:
                      'rgba(124, 58, 237, 0.12)',
                    border:
                      '1px solid rgba(124, 58, 237, 0.20)',
                    color: '#c4b5fd',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            <p
              style={{
                margin:
                  '8px 0 0',
                color: '#64748b',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Important updates,
              announcements, and alerts
              for your team.
            </p>
          </div>

          {canCreateAlert && (
            <button
              type="button"
              onClick={() => {
                setError('')
                setShowCreateModal(true)
              }}
              style={{
                display: 'inline-flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                gap: '8px',
                height: '44px',
                padding:
                  '0 16px',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius:
                  '12px',
                background:
                  'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow:
                  '0 12px 30px rgba(124, 58, 237, 0.20)',
              }}
            >
              <Plus size={17} />
              New alert
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems:
                'flex-start',
              gap: '12px',
              marginBottom: '20px',
              padding: '14px 16px',
              border:
                '1px solid rgba(239, 68, 68, 0.20)',
              borderRadius:
                '14px',
              background:
                'rgba(239, 68, 68, 0.07)',
            }}
          >
            <AlertTriangle
              size={18}
              color="#f87171"
              style={{
                marginTop: '2px',
                flexShrink: 0,
              }}
            />

            <div
              style={{
                flex: 1,
              }}
            >
              <div
                style={{
                  color: '#fca5a5',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Unable to load Team Alerts
              </div>

              <div
                style={{
                  marginTop: '4px',
                  color:
                    'rgba(252, 165, 165, 0.70)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              style={{
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                width: '28px',
                height: '28px',
                padding: 0,
                border: 0,
                borderRadius: '8px',
                background:
                  'rgba(239, 68, 68, 0.08)',
                color: '#fca5a5',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* MAIN CARD */}
        <div
          style={{
            overflow: 'hidden',
            border:
              '1px solid rgba(255,255,255,0.08)',
            borderRadius:
              '18px',
            background:
              'rgba(15, 23, 42, 0.62)',
            boxShadow:
              '0 20px 50px rgba(0,0,0,0.18)',
            backdropFilter:
              'blur(18px)',
            WebkitBackdropFilter:
              'blur(18px)',
          }}
        >
          {/* CARD HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              padding:
                '18px 22px',
              borderBottom:
                '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <div
                style={{
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                Recent alerts
              </div>

              <div
                style={{
                  marginTop: '4px',
                  color: '#475569',
                  fontSize: '12px',
                }}
              >
                {alerts.length === 0
                  ? 'No alerts yet'
                  : `${alerts.length} ${
                      alerts.length === 1
                        ? 'alert'
                        : 'alerts'
                    }`}
              </div>
            </div>

            {unreadCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '7px',
                  color: '#64748b',
                  fontSize: '12px',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius:
                      '50%',
                    background:
                      '#a78bfa',
                    boxShadow:
                      '0 0 10px rgba(167,139,250,0.8)',
                  }}
                />

                Unread
              </div>
            )}
          </div>

          {/* LOADING */}
          {loading && (
            <div
              style={{
                minHeight:
                  '360px',
                display: 'flex',
                flexDirection:
                  'column',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  borderRadius:
                    '14px',
                  border:
                    '1px solid rgba(124,58,237,0.20)',
                  background:
                    'rgba(124,58,237,0.10)',
                }}
              >
                <Loader2
                  size={21}
                  color="#a78bfa"
                  style={{
                    animation:
                      'team-alert-spin 0.8s linear infinite',
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
                Loading alerts...
              </div>

              <div
                style={{
                  marginTop: '5px',
                  color: '#475569',
                  fontSize: '12px',
                }}
              >
                Getting the latest team updates
              </div>
            </div>
          )}

          {/* EMPTY */}
          {!loading &&
            alerts.length === 0 && (
              <div
                style={{
                  minHeight:
                    '380px',
                  display: 'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  padding: '40px 20px',
                  textAlign:
                    'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    borderRadius:
                      '18px',
                    border:
                      '1px solid rgba(255,255,255,0.08)',
                    background:
                      'rgba(255,255,255,0.025)',
                  }}
                >
                  <Bell
                    size={27}
                    color="#475569"
                  />
                </div>

                <h3
                  style={{
                    margin:
                      '18px 0 0',
                    color: '#f8fafc',
                    fontSize: '15px',
                    fontWeight: 700,
                  }}
                >
                  No team alerts
                </h3>

                <p
                  style={{
                    maxWidth:
                      '400px',
                    margin:
                      '8px 0 0',
                    color: '#64748b',
                    fontSize: '13px',
                    lineHeight: 1.6,
                  }}
                >
                  There are no announcements
                  or alerts for your
                  organization yet.
                </p>

                {canCreateAlert && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setShowCreateModal(
                        true,
                      )
                    }}
                    style={{
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      gap: '8px',
                      marginTop:
                        '18px',
                      padding:
                        '10px 14px',
                      border:
                        '1px solid rgba(124,58,237,0.25)',
                      borderRadius:
                        '11px',
                      background:
                        'rgba(124,58,237,0.10)',
                      color: '#c4b5fd',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor:
                        'pointer',
                    }}
                  >
                    <Plus size={15} />
                    Create your first alert
                  </button>
                )}
              </div>
            )}

          {/* ALERT LIST */}
          {!loading &&
            alerts.length > 0 && (
              <div>
                {alerts.map(
                  (alert, index) => {
                    /*
                     * IMPORTANT:
                     * normalizePriority() guarantees that
                     * this is ALWAYS high, medium, or low.
                     */
                    const config =
                      priorityConfig[
                        alert.priority
                      ]

                    const Icon =
                      config.icon

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() =>
                          openAlert(
                            alert,
                          )
                        }
                        style={{
                          position:
                            'relative',
                          display:
                            'flex',
                          width: '100%',
                          gap: '15px',
                          padding:
                            '20px 22px',
                          border: 0,
                          borderBottom:
                            index <
                            alerts.length -
                              1
                              ? '1px solid rgba(255,255,255,0.055)'
                              : 'none',
                          background:
                            alert.isRead
                              ? 'transparent'
                              : 'rgba(124,58,237,0.025)',
                          color:
                            'inherit',
                          textAlign:
                            'left',
                          cursor:
                            'pointer',
                        }}
                      >
                        {!alert.isRead && (
                          <div
                            style={{
                              position:
                                'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              background:
                                'linear-gradient(to bottom, #8b5cf6, #7c3aed)',
                            }}
                          />
                        )}

                        {/* ICON */}
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            flexShrink: 0,
                            borderRadius:
                              '12px',
                            border: `1px solid ${config.border}`,
                            background:
                              config.background,
                          }}
                        >
                          <Icon
                            size={19}
                            color={
                              config.color
                            }
                          />
                        </div>

                        {/* CONTENT */}
                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'flex-start',
                              justifyContent:
                                'space-between',
                              gap: '15px',
                            }}
                          >
                            <div
                              style={{
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: '8px',
                                }}
                              >
                                {!alert.isRead && (
                                  <span
                                    style={{
                                      width:
                                        '7px',
                                      height:
                                        '7px',
                                      flexShrink: 0,
                                      borderRadius:
                                        '50%',
                                      background:
                                        '#a78bfa',
                                      boxShadow:
                                        '0 0 8px rgba(167,139,250,0.8)',
                                    }}
                                  />
                                )}

                                <h3
                                  style={{
                                    margin: 0,
                                    overflow:
                                      'hidden',
                                    color:
                                      alert.isRead
                                        ? '#cbd5e1'
                                        : '#fff',
                                    fontSize:
                                      '14px',
                                    fontWeight:
                                      alert.isRead
                                        ? 600
                                        : 700,
                                    textOverflow:
                                      'ellipsis',
                                    whiteSpace:
                                      'nowrap',
                                  }}
                                >
                                  {alert.title}
                                </h3>
                              </div>

                              <p
                                style={{
                                  display:
                                    '-webkit-box',
                                  WebkitLineClamp:
                                    2,
                                  WebkitBoxOrient:
                                    'vertical',
                                  overflow:
                                    'hidden',
                                  margin:
                                    '7px 0 0',
                                  color:
                                    '#64748b',
                                  fontSize:
                                    '13px',
                                  lineHeight:
                                    1.6,
                                }}
                              >
                                {alert.message}
                              </p>
                            </div>

                            <div
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap: '10px',
                                flexShrink: 0,
                              }}
                            >
                              <PriorityBadge
                                priority={
                                  alert.priority
                                }
                              />

                              <span
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  gap: '5px',
                                  color:
                                    '#475569',
                                  fontSize:
                                    '11px',
                                }}
                              >
                                <Clock
                                  size={
                                    12
                                  }
                                />

                                {formatDate(
                                  alert.created_at,
                                )}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display:
                                'flex',
                              justifyContent:
                                'flex-end',
                              marginTop:
                                '10px',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  '#475569',
                                fontSize:
                                  '11px',
                                fontWeight:
                                  600,
                              }}
                            >
                              View alert →
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  },
                )}
              </div>
            )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div
          style={{
            position:
              'fixed',
            inset: 0,
            zIndex: 200,
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding: '20px',
            background:
              'rgba(0,0,0,0.72)',
            backdropFilter:
              'blur(8px)',
            WebkitBackdropFilter:
              'blur(8px)',
          }}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              if (!creating) {
                setShowCreateModal(
                  false,
                )
              }
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              overflow:
                'hidden',
              border:
                '1px solid rgba(255,255,255,0.09)',
              borderRadius:
                '18px',
              background:
                '#0b1020',
              boxShadow:
                '0 30px 100px rgba(0,0,0,0.55)',
            }}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                padding:
                  '20px 22px',
                borderBottom:
                  '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  display:
                    'flex',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    flexShrink: 0,
                    borderRadius:
                      '11px',
                    background:
                      'rgba(124,58,237,0.10)',
                    border:
                      '1px solid rgba(124,58,237,0.20)',
                  }}
                >
                  <BellRing
                    size={18}
                    color="#a78bfa"
                  />
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      color:
                        '#fff',
                      fontSize:
                        '15px',
                      fontWeight:
                        700,
                    }}
                  >
                    Create team alert
                  </h2>

                  <p
                    style={{
                      margin:
                        '4px 0 0',
                      color:
                        '#64748b',
                      fontSize:
                        '12px',
                    }}
                  >
                    Send an important
                    update to your
                    team.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!creating) {
                    setShowCreateModal(
                      false,
                    )
                  }
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  border: 0,
                  borderRadius:
                    '9px',
                  background:
                    'rgba(255,255,255,0.03)',
                  color:
                    '#64748b',
                  cursor:
                    'pointer',
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={
                handleCreateAlert
              }
              style={{
                padding:
                  '22px',
              }}
            >
              {/* TITLE */}
              <div
                style={{
                  marginBottom:
                    '18px',
                }}
              >
                <label
                  htmlFor="team-alert-title"
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '8px',
                    color:
                      '#94a3b8',
                    fontSize:
                      '11px',
                    fontWeight:
                      700,
                    letterSpacing:
                      '0.08em',
                    textTransform:
                      'uppercase',
                  }}
                >
                  Title
                </label>

                <input
                  id="team-alert-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Important client update"
                  maxLength={150}
                  disabled={creating}
                  autoFocus
                  style={{
                    width: '100%',
                    height: '44px',
                    padding:
                      '0 13px',
                    border:
                      '1px solid rgba(255,255,255,0.08)',
                    borderRadius:
                      '11px',
                    outline:
                      'none',
                    background:
                      'rgba(255,255,255,0.025)',
                    color:
                      '#fff',
                    fontSize:
                      '13px',
                  }}
                />
              </div>

              {/* MESSAGE */}
              <div
                style={{
                  marginBottom:
                    '18px',
                }}
              >
                <label
                  htmlFor="team-alert-message"
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '8px',
                    color:
                      '#94a3b8',
                    fontSize:
                      '11px',
                    fontWeight:
                      700,
                    letterSpacing:
                      '0.08em',
                    textTransform:
                      'uppercase',
                  }}
                >
                  Message
                </label>

                <textarea
                  id="team-alert-message"
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Write the details your team needs to know..."
                  rows={5}
                  maxLength={2000}
                  disabled={creating}
                  style={{
                    width: '100%',
                    minHeight:
                      '120px',
                    padding:
                      '12px 13px',
                    resize:
                      'vertical',
                    border:
                      '1px solid rgba(255,255,255,0.08)',
                    borderRadius:
                      '11px',
                    outline:
                      'none',
                    background:
                      'rgba(255,255,255,0.025)',
                    color:
                      '#fff',
                    fontSize:
                      '13px',
                    lineHeight:
                      1.6,
                  }}
                />
              </div>

              {/* PRIORITY */}
              <div
                style={{
                  marginBottom:
                    '22px',
                }}
              >
                <label
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '8px',
                    color:
                      '#94a3b8',
                    fontSize:
                      '11px',
                    fontWeight:
                      700,
                    letterSpacing:
                      '0.08em',
                    textTransform:
                      'uppercase',
                  }}
                >
                  Priority
                </label>

                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      'repeat(3, 1fr)',
                    gap: '8px',
                  }}
                >
                  {(
                    [
                      'high',
                      'medium',
                      'low',
                    ] as Priority[]
                  ).map(
                    (value) => {
                      const config =
                        priorityConfig[
                          value
                        ]

                      const Icon =
                        config.icon

                      const selected =
                        priority ===
                        value

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setPriority(
                              value,
                            )
                          }
                          disabled={
                            creating
                          }
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            gap: '7px',
                            height:
                              '42px',
                            border:
                              `1px solid ${
                                selected
                                  ? config.border
                                  : 'rgba(255,255,255,0.07)'
                              }`,
                            borderRadius:
                              '10px',
                            background:
                              selected
                                ? config.background
                                : 'rgba(255,255,255,0.02)',
                            color:
                              selected
                                ? config.badgeText
                                : '#64748b',
                            fontSize:
                              '12px',
                            fontWeight:
                              600,
                            cursor:
                              'pointer',
                            textTransform:
                              'capitalize',
                          }}
                        >
                          <Icon
                            size={14}
                          />

                          {value}
                        </button>
                      )
                    },
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'flex-end',
                  gap: '8px',
                  paddingTop:
                    '18px',
                  borderTop:
                    '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!creating) {
                      setShowCreateModal(
                        false,
                      )
                    }
                  }}
                  disabled={creating}
                  style={{
                    height: '40px',
                    padding:
                      '0 16px',
                    border:
                      '1px solid rgba(255,255,255,0.08)',
                    borderRadius:
                      '10px',
                    background:
                      'rgba(255,255,255,0.025)',
                    color:
                      '#94a3b8',
                    fontSize:
                      '12px',
                    fontWeight:
                      600,
                    cursor:
                      'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creating ||
                    !title.trim() ||
                    !message.trim()
                  }
                  style={{
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    gap: '7px',
                    height: '40px',
                    padding:
                      '0 17px',
                    border:
                      '1px solid rgba(139,92,246,0.35)',
                    borderRadius:
                      '10px',
                    background:
                      'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                    color:
                      '#fff',
                    fontSize:
                      '12px',
                    fontWeight:
                      700,
                    cursor:
                      'pointer',
                    opacity:
                      creating ||
                      !title.trim() ||
                      !message.trim()
                        ? 0.5
                        : 1,
                  }}
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={14}
                        style={{
                          animation:
                            'team-alert-spin 0.8s linear infinite',
                        }}
                      />

                      Creating...
                    </>
                  ) : (
                    <>
                      <Check
                        size={14}
                      />

                      Create alert
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes team-alert-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        #team-alert-title::placeholder,
        #team-alert-message::placeholder {
          color: #475569;
        }

        #team-alert-title:focus,
        #team-alert-message:focus {
          border-color: rgba(139, 92, 246, 0.40);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
        }
      `}</style>
    </div>
  )
}