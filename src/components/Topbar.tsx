import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  ChevronRight,
  ContactRound,
  Handshake,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  Target,
  UsersRound,
  X,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useOrganization } from '../context/OrganizationContext'
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../lib/notifications'

type SearchResult = {
  id: string
  type:
    | 'company'
    | 'contact'
    | 'lead'
    | 'deal'
    | 'employee'
  title: string
  subtitle: string
  route: string
}

type NotificationType =
  | 'team_alert'
  | 'message'
  | 'task'
  | 'activity'
  | 'lead'
  | 'deal'
  | 'company'
  | 'contact'
  | 'employee'
  | 'system'

type Notification = {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType | string
  title: string
  message: string | null
  entity_id: string | null
  entity_type: string | null
  route: string | null
  read_at: string | null
  created_at: string
}

function formatNotificationTime(
  dateString: string
) {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = Date.now()
  const difference =
    now - date.getTime()

  const seconds =
    Math.floor(difference / 1000)

  if (seconds < 10) {
    return 'Just now'
  }

  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes =
    Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours =
    Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days =
    Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d ago`
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  )
}

function getNotificationIcon(
  type: string
) {
  switch (type) {
    case 'team_alert':
      return AlertTriangle

    case 'message':
      return MessageSquare

    case 'task':
      return Check

    case 'activity':
      return LayoutDashboard

    case 'lead':
      return Target

    case 'deal':
      return Handshake

    case 'company':
      return Building2

    case 'contact':
      return ContactRound

    case 'employee':
      return UsersRound

    default:
      return Bell
  }
}

function getNotificationIconColors(
  type: string
) {
  switch (type) {
    case 'team_alert':
      return {
        color: '#fbbf24',
        background:
          'rgba(245,158,11,0.10)',
        border:
          'rgba(245,158,11,0.18)',
      }

    case 'message':
      return {
        color: '#a78bfa',
        background:
          'rgba(124,58,237,0.12)',
        border:
          'rgba(139,92,246,0.20)',
      }

    case 'task':
      return {
        color: '#4ade80',
        background:
          'rgba(34,197,94,0.10)',
        border:
          'rgba(34,197,94,0.18)',
      }

    case 'lead':
      return {
        color: '#60a5fa',
        background:
          'rgba(59,130,246,0.10)',
        border:
          'rgba(59,130,246,0.18)',
      }

    case 'deal':
      return {
        color: '#c084fc',
        background:
          'rgba(168,85,247,0.10)',
        border:
          'rgba(168,85,247,0.18)',
      }

    case 'company':
      return {
        color: '#22d3ee',
        background:
          'rgba(6,182,212,0.10)',
        border:
          'rgba(6,182,212,0.18)',
      }

    case 'contact':
      return {
        color: '#38bdf8',
        background:
          'rgba(14,165,233,0.10)',
        border:
          'rgba(14,165,233,0.18)',
      }

    default:
      return {
        color: '#a78bfa',
        background:
          'rgba(124,58,237,0.10)',
        border:
          'rgba(124,58,237,0.18)',
      }
  }
}

export default function Topbar() {
  const navigate = useNavigate()

  const {
    organizationId,
  } = useOrganization()

  const searchRef =
    useRef<HTMLDivElement>(null)

  const notificationRef =
    useRef<HTMLDivElement>(null)

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false)

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('')

  const [
    searchResults,
    setSearchResults,
  ] = useState<SearchResult[]>([])

  const [
    searching,
    setSearching,
  ] = useState(false)

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false)

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([])

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false)

  const [
    notificationActionId,
    setNotificationActionId,
  ] = useState<string | null>(null)

  const [
    markingAllRead,
    setMarkingAllRead,
  ] = useState(false)

  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState(0)

  /*
   * ============================================================
   * UNIVERSAL SEARCH
   * ============================================================
   */

  async function performSearch(
    query: string
  ) {
    if (!organizationId) {
      setSearchResults([])
      return
    }

    const value = query.trim()

    if (!value) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)

      const search = `%${value}%`

      const [
        companiesResponse,
        contactsResponse,
        leadsResponse,
        dealsResponse,
      ] = await Promise.all([
        supabase
          .from('companies')
          .select(`
            id,
            name,
            website,
            industry,
            email
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .or(
            `name.ilike.${search},website.ilike.${search},industry.ilike.${search},email.ilike.${search}`
          )
          .limit(5),

        supabase
          .from('contacts')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            job_title
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .or(
            `first_name.ilike.${search},last_name.ilike.${search},email.ilike.${search},phone.ilike.${search},job_title.ilike.${search}`
          )
          .limit(5),

        supabase
          .from('leads')
          .select(`
            id,
            status,
            source,
            notes
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .or(
            `status.ilike.${search},source.ilike.${search},notes.ilike.${search}`
          )
          .limit(5),

        supabase
          .from('deals')
          .select(`
            id,
            name,
            stage
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .or(
            `name.ilike.${search},stage.ilike.${search}`
          )
          .limit(5),
      ])

      if (companiesResponse.error) {
        console.error(
          'Company search error:',
          companiesResponse.error
        )
      }

      if (contactsResponse.error) {
        console.error(
          'Contact search error:',
          contactsResponse.error
        )
      }

      if (leadsResponse.error) {
        console.error(
          'Lead search error:',
          leadsResponse.error
        )
      }

      if (dealsResponse.error) {
        console.error(
          'Deal search error:',
          dealsResponse.error
        )
      }

      const results: SearchResult[] = []

      /*
       * Companies
       */

      for (
        const company of
        companiesResponse.data ?? []
      ) {
        results.push({
          id: company.id,
          type: 'company',
          title: company.name,
          subtitle:
            company.industry ||
            company.website ||
            company.email ||
            'Company',
          route: '/companies',
        })
      }

      /*
       * Contacts
       */

      for (
        const contact of
        contactsResponse.data ?? []
      ) {
        const fullName = [
          contact.first_name,
          contact.last_name,
        ]
          .filter(Boolean)
          .join(' ')

        results.push({
          id: contact.id,
          type: 'contact',
          title:
            fullName ||
            'Unnamed Contact',
          subtitle:
            contact.job_title ||
            contact.email ||
            contact.phone ||
            'Contact',
          route: '/contacts',
        })
      }

      /*
       * Leads
       */

      for (
        const lead of
        leadsResponse.data ?? []
      ) {
        results.push({
          id: lead.id,
          type: 'lead',
          title: lead.source
            ? `${lead.source} Lead`
            : 'Lead',
          subtitle:
            lead.status ||
            lead.notes ||
            'Lead',
          route: '/leads',
        })
      }

      /*
       * Deals
       */

      for (
        const deal of
        dealsResponse.data ?? []
      ) {
        results.push({
          id: deal.id,
          type: 'deal',
          title: deal.name,
          subtitle:
            deal.stage ||
            'Deal',
          route: '/deals',
        })
      }

      /*
       * Employees
       */

      const {
        data: members,
        error: membersError,
      } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role
        `)
        .eq(
          'organization_id',
          organizationId
        )

      if (membersError) {
        console.error(
          'Employee search error:',
          membersError
        )
      } else if (members?.length) {
        const userIds =
          members.map(
            member => member.user_id
          )

        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email
          `)
          .in(
            'id',
            userIds
          )

        if (profilesError) {
          console.error(
            'Profile search error:',
            profilesError
          )
        } else {
          for (
            const profile of
            profiles ?? []
          ) {
            const name =
              profile.full_name ||
              ''

            const email =
              profile.email ||
              ''

            const matches =
              name
                .toLowerCase()
                .includes(
                  value.toLowerCase()
                ) ||
              email
                .toLowerCase()
                .includes(
                  value.toLowerCase()
                )

            if (!matches) {
              continue
            }

            const member =
              members.find(
                item =>
                  item.user_id ===
                  profile.id
              )

            results.push({
              id: profile.id,
              type: 'employee',
              title:
                name ||
                email ||
                'Employee',
              subtitle:
                email ||
                member?.role ||
                'Employee',
              route: '/employees',
            })
          }
        }
      }

      setSearchResults(
        results.slice(0, 20)
      )
    } catch (error) {
      console.error(
        'Universal search error:',
        error
      )

      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  /*
   * ============================================================
   * SEARCH DEBOUNCE
   * ============================================================
   */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        performSearch(searchQuery)
      }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    searchQuery,
    organizationId,
  ])

  /*
   * ============================================================
   * LOAD NOTIFICATIONS
   * ============================================================
   */

  const loadNotifications =
    useCallback(
      async () => {
        if (!organizationId) {
          setNotifications([])
          return
        }

        try {
          setNotificationsLoading(true)

          const {
            data: {
              user,
            },
            error: userError,
          } =
            await supabase.auth.getUser()

          if (userError) {
            throw userError
          }

          if (!user) {
            setNotifications([])
            return
          }

          const {
            data,
            error,
          } = await supabase
            .from('notifications')
            .select(`
              id,
              organization_id,
              user_id,
              type,
              title,
              message,
              entity_id,
              entity_type,
              route,
              read_at,
              created_at
            `)
            .eq(
              'organization_id',
              organizationId
            )
            .eq(
              'user_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            )
            .limit(50)

          if (error) {
            throw error
          }

          setNotifications(
            (data ??
              []) as Notification[]
          )
        } catch (error) {
          console.error(
            'Failed to load notifications:',
            error
          )
        } finally {
          setNotificationsLoading(
            false
          )
        }
      },
      [organizationId]
    )

  /*
   * ============================================================
   * LOAD UNREAD MESSAGE COUNT
   * ============================================================
   */

  const loadUnreadMessages =
    useCallback(
      async () => {
        try {
          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser()

          if (!user) {
            setUnreadMessages(0)
            return
          }

          /*
           * Find conversations where
           * the current user is a member.
           */

          const {
            data: memberships,
            error:
              membershipError,
          } =
            await supabase
              .from(
                'conversation_members'
              )
              .select(
                'conversation_id'
              )
              .eq(
                'user_id',
                user.id
              )

          if (membershipError) {
            console.error(
              'Conversation membership error:',
              membershipError
            )

            return
          }

          const conversationIds =
            memberships?.map(
              item =>
                item.conversation_id
            ) ?? []

          if (
            conversationIds.length ===
            0
          ) {
            setUnreadMessages(0)
            return
          }

          const {
            count,
            error,
          } =
            await supabase
              .from('messages')
              .select(
                'id',
                {
                  count: 'exact',
                  head: true,
                }
              )
              .in(
                'conversation_id',
                conversationIds
              )
              .neq(
                'sender_id',
                user.id
              )
              .is(
                'read_at',
                null
              )

          if (error) {
            console.error(
              'Unread message count error:',
              error
            )

            return
          }

          setUnreadMessages(
            count ?? 0
          )
        } catch (error) {
          console.error(
            'Failed to load unread messages:',
            error
          )
        }
      },
      []
    )

  /*
   * ============================================================
   * INITIAL NOTIFICATION LOAD
   * ============================================================
   */

  useEffect(() => {
    loadNotifications()
    loadUnreadMessages()
  }, [
    loadNotifications,
    loadUnreadMessages,
  ])

  /*
   * ============================================================
   * REALTIME NOTIFICATIONS
   * ============================================================
   */

  useEffect(() => {
    if (!organizationId) {
      return
    }

    let cancelled = false

    async function subscribe() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser()

      if (!user || cancelled) {
        return
      }

      const channel =
        supabase
          .channel(
            `topbar-notifications-${user.id}`
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            payload => {
              const notification =
                payload.new as Notification

              setNotifications(
                current => {
                  const exists =
                    current.some(
                      item =>
                        item.id ===
                        notification.id
                    )

                  if (exists) {
                    return current
                  }

                  return [
                    notification,
                    ...current,
                  ].slice(0, 50)
                }
              )
            }
          )
          .subscribe()

      return () => {
        supabase.removeChannel(
          channel
        )
      }
    }

    const cleanupPromise =
      subscribe()

    return () => {
      cancelled = true

      cleanupPromise.then(
        cleanup => {
          if (cleanup) {
            cleanup()
          }
        }
      )
    }
  }, [organizationId])

  /*
   * ============================================================
   * REALTIME MESSAGE UPDATES
   * ============================================================
   */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          'topbar-message-updates'
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            loadUnreadMessages()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          () => {
            loadUnreadMessages()
          }
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [loadUnreadMessages])

  /*
   * ============================================================
   * UNREAD COUNTS
   * ============================================================
   */

  const unreadNotificationCount =
    notifications.filter(
      notification =>
        !notification.read_at
    ).length

  /*
   * ============================================================
   * CTRL + K
   * ============================================================
   */

  useEffect(() => {
    function handleKeyboard(
      event: KeyboardEvent
    ) {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()

        setSearchOpen(true)

        window.setTimeout(() => {
          document
            .getElementById(
              'crm-global-search'
            )
            ?.focus()
        }, 50)
      }

      if (
        event.key === 'Escape'
      ) {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyboard
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyboard
      )
    }
  }, [])

  /*
   * ============================================================
   * OUTSIDE CLICK
   * ============================================================
   */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node

      if (
        searchRef.current &&
        !searchRef.current.contains(
          target
        )
      ) {
        setSearchOpen(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target
        )
      ) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  function openSearchResult(
    result: SearchResult
  ) {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])

    navigate(result.route)
  }

  /*
   * ============================================================
   * OPEN NOTIFICATION
   * ============================================================
   */

  async function openNotification(
    notification: Notification
  ) {
    try {
      setNotificationActionId(
        notification.id
      )

      if (
        !notification.read_at
      ) {
        await markNotificationAsRead(
          notification.id
        )

        setNotifications(
          current =>
            current.map(item =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    read_at:
                      new Date().toISOString(),
                  }
                : item
            )
        )
      }

      setNotificationsOpen(false)

      if (
        notification.route
      ) {
        navigate(
          notification.route
        )
      }
    } catch (error) {
      console.error(
        'Failed to open notification:',
        error
      )
    } finally {
      setNotificationActionId(
        null
      )
    }
  }

  /*
   * ============================================================
   * MARK ALL AS READ
   * ============================================================
   */

  async function handleMarkAllAsRead() {
    if (
      unreadNotificationCount ===
      0
    ) {
      return
    }

    try {
      setMarkingAllRead(true)

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser()

      if (!user) {
        return
      }

      await markAllNotificationsAsRead(
        user.id
      )

      const now =
        new Date().toISOString()

      setNotifications(
        current =>
          current.map(
            notification => ({
              ...notification,
              read_at:
                notification.read_at ||
                now,
            })
          )
      )
    } catch (error) {
      console.error(
        'Failed to mark all notifications as read:',
        error
      )
    } finally {
      setMarkingAllRead(false)
    }
  }

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  /*
   * ============================================================
   * RESULT ICON
   * ============================================================
   */

  function getResultIcon(
    type: SearchResult['type']
  ) {
    switch (type) {
      case 'company':
        return <Building2 size={16} />

      case 'contact':
        return (
          <ContactRound size={16} />
        )

      case 'lead':
        return <Target size={16} />

      case 'deal':
        return (
          <Handshake size={16} />
        )

      case 'employee':
        return (
          <UsersRound size={16} />
        )

      default:
        return <Search size={16} />
    }
  }

  /*
   * ============================================================
   * RESULT LABEL
   * ============================================================
   */

  function getResultLabel(
    type: SearchResult['type']
  ) {
    switch (type) {
      case 'company':
        return 'Company'

      case 'contact':
        return 'Contact'

      case 'lead':
        return 'Lead'

      case 'deal':
        return 'Deal'

      case 'employee':
        return 'Employee'

      default:
        return ''
    }
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <header className="crm-topbar">
      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div
        ref={searchRef}
        className="crm-topbar-search-wrapper"
      >
        <div
          onClick={() =>
            setSearchOpen(true)
          }
          className="crm-search-box"
        >
          <span className="crm-search-icon">
            <Search size={17} />
          </span>

          <input
            id="crm-global-search"
            value={searchQuery}
            onFocus={() =>
              setSearchOpen(true)
            }
            onChange={event =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search your CRM..."
            className="crm-search-input"
          />

          <span className="crm-search-shortcut">
            Ctrl K
          </span>
        </div>

        {/* ====================================================
            SEARCH DROPDOWN
        ==================================================== */}

        {searchOpen &&
          searchQuery.trim() && (
            <div className="crm-search-dropdown">
              {searching && (
                <div className="crm-search-message">
                  Searching...
                </div>
              )}

              {!searching &&
                searchResults.length ===
                  0 && (
                  <div className="crm-search-message">
                    No CRM records found.
                  </div>
                )}

              {!searching &&
                searchResults.map(
                  result => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() =>
                        openSearchResult(
                          result
                        )
                      }
                      className="crm-search-result"
                    >
                      <div className="crm-search-result-icon">
                        {getResultIcon(
                          result.type
                        )}
                      </div>

                      <div className="crm-search-result-content">
                        <div className="crm-search-result-title">
                          {result.title}
                        </div>

                        <div className="crm-search-result-subtitle">
                          {result.subtitle}
                        </div>
                      </div>

                      <span className="crm-search-result-type">
                        {getResultLabel(
                          result.type
                        )}
                      </span>
                    </button>
                  )
                )}
            </div>
          )}
      </div>

      {/* ======================================================
          RIGHT SIDE
      ====================================================== */}

      <div className="crm-topbar-actions">
        {/* ====================================================
            MESSAGES
        ==================================================== */}

        <button
          type="button"
          onClick={() =>
            navigate('/messages')
          }
          title="Messages"
          className="crm-topbar-icon-button"
          style={{
            position: 'relative',
          }}
        >
          <MessageSquare
            size={18}
          />

          {unreadMessages > 0 && (
            <span className="crm-notification-badge">
              {unreadMessages > 99
                ? '99+'
                : unreadMessages}
            </span>
          )}
        </button>

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        <div
          ref={notificationRef}
          className="crm-notification-wrapper"
          style={{
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                current =>
                  !current
              )
            }
            title="Notifications"
            className="crm-topbar-icon-button"
            style={{
              position: 'relative',
            }}
          >
            <Bell size={18} />

            {unreadNotificationCount >
              0 && (
              <span
                style={{
                  position:
                    'absolute',
                  top: '6px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  borderRadius:
                    '999px',
                  background:
                    '#a78bfa',
                  border:
                    '2px solid #070a12',
                  boxShadow:
                    '0 0 10px rgba(167,139,250,0.7)',
                }}
              />
            )}
          </button>

          {notificationsOpen && (
            <div
              style={{
                position:
                  'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width:
                  '390px',
                maxWidth:
                  'calc(100vw - 24px)',
                overflow:
                  'hidden',
                border:
                  '1px solid rgba(255,255,255,0.09)',
                borderRadius:
                  '16px',
                background:
                  'rgba(10,15,29,0.97)',
                boxShadow:
                  '0 25px 70px rgba(0,0,0,0.45), 0 0 35px rgba(124,58,237,0.08)',
                backdropFilter:
                  'blur(24px)',
                WebkitBackdropFilter:
                  'blur(24px)',
                zIndex: 100,
              }}
            >
              {/* Header */}

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  gap: '12px',
                  padding:
                    '16px 17px',
                  borderBottom:
                    '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div>
                  <div
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: '8px',
                      color:
                        '#f8fafc',
                      fontSize:
                        '14px',
                      fontWeight: 700,
                    }}
                  >
                    <Bell
                      size={16}
                      color="#a78bfa"
                    />

                    Notifications

                    {unreadNotificationCount >
                      0 && (
                      <span
                        style={{
                          minWidth:
                            '20px',
                          height:
                            '20px',
                          padding:
                            '0 6px',
                          display:
                            'inline-flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          borderRadius:
                            '999px',
                          background:
                            'rgba(124,58,237,0.16)',
                          border:
                            '1px solid rgba(139,92,246,0.20)',
                          color:
                            '#c4b5fd',
                          fontSize:
                            '10px',
                          fontWeight: 800,
                        }}
                      >
                        {unreadNotificationCount >
                        99
                          ? '99+'
                          : unreadNotificationCount}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop:
                        '4px',
                      color:
                        '#475569',
                      fontSize:
                        '11px',
                    }}
                  >
                    Your latest CRM updates
                  </div>
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    alignItems:
                      'center',
                    gap: '5px',
                  }}
                >
                  {unreadNotificationCount >
                    0 && (
                    <button
                      type="button"
                      disabled={
                        markingAllRead
                      }
                      onClick={
                        handleMarkAllAsRead
                      }
                      style={{
                        height:
                          '30px',
                        padding:
                          '0 9px',
                        border:
                          '1px solid rgba(139,92,246,0.18)',
                        borderRadius:
                          '8px',
                        background:
                          'rgba(124,58,237,0.07)',
                        color:
                          '#a78bfa',
                        fontSize:
                          '10px',
                        fontWeight: 700,
                        cursor:
                          markingAllRead
                            ? 'wait'
                            : 'pointer',
                      }}
                    >
                      {markingAllRead
                        ? 'Saving...'
                        : 'Mark all read'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(
                        false
                      )
                    }
                    style={{
                      width:
                        '30px',
                      height:
                        '30px',
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      border:
                        '1px solid rgba(255,255,255,0.06)',
                      borderRadius:
                        '8px',
                      background:
                        'rgba(255,255,255,0.025)',
                      color:
                        '#64748b',
                      cursor:
                        'pointer',
                    }}
                  >
                    <X
                      size={14}
                    />
                  </button>
                </div>
              </div>

              {/* Notification list */}

              <div
                style={{
                  maxHeight:
                    '440px',
                  overflowY:
                    'auto',
                }}
                className="crm-scrollbar"
              >
                {notificationsLoading ? (
                  <div
                    style={{
                      minHeight:
                        '180px',
                      display:
                        'flex',
                      flexDirection:
                        'column',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      color:
                        '#64748b',
                    }}
                  >
                    <Loader2
                      size={22}
                      color="#a78bfa"
                      style={{
                        animation:
                          'crm-topbar-notification-spin 0.8s linear infinite',
                      }}
                    />

                    <span
                      style={{
                        marginTop:
                          '10px',
                        fontSize:
                          '12px',
                      }}
                    >
                      Loading notifications...
                    </span>
                  </div>
                ) : notifications.length ===
                  0 ? (
                  <div
                    style={{
                      minHeight:
                        '220px',
                      display:
                        'flex',
                      flexDirection:
                        'column',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      padding:
                        '30px',
                      textAlign:
                        'center',
                    }}
                  >
                    <div
                      style={{
                        width:
                          '52px',
                        height:
                          '52px',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        borderRadius:
                          '15px',
                        border:
                          '1px solid rgba(139,92,246,0.15)',
                        background:
                          'rgba(124,58,237,0.08)',
                      }}
                    >
                      <Bell
                        size={23}
                        color="#8b5cf6"
                      />
                    </div>

                    <div
                      style={{
                        marginTop:
                          '14px',
                        color:
                          '#cbd5e1',
                        fontSize:
                          '13px',
                        fontWeight: 600,
                      }}
                    >
                      You're all caught up
                    </div>

                    <div
                      style={{
                        marginTop:
                          '5px',
                        color:
                          '#475569',
                        fontSize:
                          '11px',
                        lineHeight:
                          1.6,
                      }}
                    >
                      New CRM activity will appear here.
                    </div>
                  </div>
                ) : (
                  notifications.map(
                    notification => {
                      const Icon =
                        getNotificationIcon(
                          notification.type
                        )

                      const iconColors =
                        getNotificationIconColors(
                          notification.type
                        )

                      const unread =
                        !notification.read_at

                      const working =
                        notificationActionId ===
                        notification.id

                      return (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          onClick={() =>
                            openNotification(
                              notification
                            )
                          }
                          disabled={
                            working
                          }
                          style={{
                            width:
                              '100%',
                            display:
                              'flex',
                            alignItems:
                              'flex-start',
                            gap:
                              '11px',
                            padding:
                              '13px 16px',
                            border:
                              'none',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.045)',
                            background:
                              unread
                                ? 'rgba(124,58,237,0.055)'
                                : 'transparent',
                            color:
                              'inherit',
                            textAlign:
                              'left',
                            cursor:
                              working
                                ? 'wait'
                                : 'pointer',
                            transition:
                              'background 0.18s ease',
                          }}
                          onMouseEnter={event => {
                            event.currentTarget.style.background =
                              'rgba(255,255,255,0.045)'
                          }}
                          onMouseLeave={event => {
                            event.currentTarget.style.background =
                              unread
                                ? 'rgba(124,58,237,0.055)'
                                : 'transparent'
                          }}
                        >
                          {/* Icon */}

                          <div
                            style={{
                              position:
                                'relative',
                              width:
                                '38px',
                              height:
                                '38px',
                              flexShrink:
                                0,
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              borderRadius:
                                '11px',
                              border:
                                `1px solid ${iconColors.border}`,
                              background:
                                iconColors.background,
                            }}
                          >
                            <Icon
                              size={
                                17
                              }
                              color={
                                iconColors.color
                              }
                            />

                            {unread && (
                              <span
                                style={{
                                  position:
                                    'absolute',
                                  top:
                                    '-2px',
                                  right:
                                    '-2px',
                                  width:
                                    '7px',
                                  height:
                                    '7px',
                                  borderRadius:
                                    '50%',
                                  background:
                                    '#a78bfa',
                                  border:
                                    '1.5px solid #0a0f1d',
                                }}
                              />
                            )}
                          </div>

                          {/* Content */}

                          <div
                            style={{
                              minWidth:
                                0,
                              flex:
                                1,
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
                                gap:
                                  '8px',
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    unread
                                      ? '#f8fafc'
                                      : '#cbd5e1',
                                  fontSize:
                                    '12px',
                                  lineHeight:
                                    1.4,
                                  fontWeight:
                                    unread
                                      ? 700
                                      : 600,
                                }}
                              >
                                {
                                  notification.title
                                }
                              </span>

                              <ChevronRight
                                size={
                                  13
                                }
                                color="#475569"
                                style={{
                                  flexShrink:
                                    0,
                                  marginTop:
                                    '2px',
                                }}
                              />
                            </div>

                            {notification.message && (
                              <div
                                style={{
                                  marginTop:
                                    '4px',
                                  color:
                                    '#64748b',
                                  fontSize:
                                    '11px',
                                  lineHeight:
                                    1.55,
                                  overflow:
                                    'hidden',
                                  display:
                                    '-webkit-box',
                                  WebkitLineClamp:
                                    2,
                                  WebkitBoxOrient:
                                    'vertical',
                                }}
                              >
                                {
                                  notification.message
                                }
                              </div>
                            )}

                            <div
                              style={{
                                marginTop:
                                  '6px',
                                color:
                                  '#475569',
                                fontSize:
                                  '10px',
                                fontWeight:
                                  500,
                              }}
                            >
                              {formatNotificationTime(
                                notification.created_at
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    }
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            LOGOUT
        ==================================================== */}

        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className="crm-user-button"
        >
          <span className="crm-user-avatar">
            W
          </span>

          <span className="crm-user-name">
            Wasay
          </span>

          <LogOut
            size={15}
            style={{
              opacity: 0.55,
            }}
          />
        </button>
      </div>

      <style>{`
        @keyframes crm-topbar-notification-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .crm-notification-wrapper > div {
            right: -55px !important;
          }
        }
      `}</style>
    </header>
  )
}