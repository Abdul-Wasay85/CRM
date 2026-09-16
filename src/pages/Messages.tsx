import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string
}

const createIcon = (path: React.ReactNode) => {
  return ({ size = 20, ...props }: IconProps) => (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

const Bell = createIcon(
  <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </>
)

const Check = createIcon(<path d="m5 12 4 4L19 6" />)

const CheckCheck = createIcon(
  <>
    <path d="m5 12 4 4L19 6" />
    <path d="m5 6 4 4" />
  </>
)

const ChevronDown = createIcon(<path d="m6 9 6 6 6-6" />)

const MessageCircle = createIcon(
  <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.8 9.8 0 0 1-4-.8L3 21l1.8-4A8.5 8.5 0 1 1 21 11.5Z" />
)

const MoreHorizontal = createIcon(
  <>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </>
)

const Paperclip = createIcon(
  <path d="m21.4 11.6-8.8 8.8a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
)

const Plus = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
)

const Search = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </>
)

const Send = createIcon(
  <>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </>
)

const ShieldAlert = createIcon(
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>
)

const Users = createIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </>
)

const X = createIcon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
)

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url?: string | null
}

type OrganizationMember = {
  user_id: string
  role: string
  profile?: Profile | null
}

type Conversation = {
  id: string
  organization_id: string
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  delivered_at?: string | null
  read_at: string | null
}

type ConversationItem = {
  conversation: Conversation
  otherUser: Profile
  lastMessage: Message | null
  unreadCount: number
}

type TeamAlert = {
  id: string
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
  created_at: string
  isRead: boolean
}

const CRM = {
  bg: '#0B1120',
  sidebar: '#0F172A',
  panel: '#111827',
  panel2: '#151E2E',
  border: '#243044',
  borderLight: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  purple: '#7C3AED',
  purpleLight: '#A855F7',
  purpleSoft: 'rgba(124, 58, 237, 0.14)',
  green: '#22C55E',
  red: '#EF4444',
  amber: '#F59E0B',
}

function getInitials(profile?: Profile | null) {
  if (!profile) return '?'

  const name = profile.full_name?.trim()

  if (name) {
    const parts = name.split(/\s+/)

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }

    return name.slice(0, 2).toUpperCase()
  }

  return profile.email?.slice(0, 2).toUpperCase() || 'U'
}

function formatTime(dateString?: string | null) {
  if (!dateString) return ''

  const date = new Date(dateString)

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatConversationTime(dateString?: string | null) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()

  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateLabel(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()

  const today =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (today) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function groupMessages(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = []

  for (const message of messages) {
    const label = formatDateLabel(message.created_at)

    const existing = groups.find((group) => group.label === label)

    if (existing) {
      existing.messages.push(message)
    } else {
      groups.push({
        label,
        messages: [message],
      })
    }
  }

  return groups
}

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [messageText, setMessageText] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  const [showNewMessage, setShowNewMessage] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(true)

  const [alerts, setAlerts] = useState<TeamAlert[]>([])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (item) => item.conversation.id === selectedConversationId
      ) || null,
    [conversations, selectedConversationId]
  )

  const filteredConversations = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) return conversations

    return conversations.filter((item) => {
      const name = item.otherUser.full_name?.toLowerCase() || ''
      const email = item.otherUser.email?.toLowerCase() || ''
      const lastMessage = item.lastMessage?.body?.toLowerCase() || ''

      return (
        name.includes(value) ||
        email.includes(value) ||
        lastMessage.includes(value)
      )
    })
  }, [conversations, search])

  const filteredMembers = useMemo(() => {
    const value = search.trim().toLowerCase()

    return members.filter((member) => {
      if (!member.profile) return false

      if (member.user_id === currentUser?.id) return false

      if (!value) return true

      const name = member.profile.full_name?.toLowerCase() || ''
      const email = member.profile.email?.toLowerCase() || ''

      return name.includes(value) || email.includes(value)
    })
  }, [members, search, currentUser?.id])

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0
      ),
    [conversations]
  )

  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !alert.isRead).length,
    [alerts]
  )

  const highPriorityAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.priority === 'high' &&
          !alert.isRead
      ).length,
    [alerts]
  )

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      })
    })
  }, [])

  const loadCurrentUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    const { data: canCreate, error: canCreateError } =
  await supabase.rpc('can_create_conversation', {
    target_organization_id: '2e44cde8-86f6-45aa-9336-2da00c464d26',
  })

console.log('=== CAN CREATE CONVERSATION TEST ===')
console.log('RPC result:', canCreate)
console.log('RPC error:', canCreateError)
console.log('Current user:', user?.id)
console.log('Current email:', user?.email)
console.log('====================================')

    if (error) throw error
    if (!user) throw new Error('You are not logged in.')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    setCurrentUser({
      id: user.id,
      full_name: profile?.full_name || null,
      email: profile?.email || user.email || null,
      avatar_url: profile?.avatar_url || null,
    })

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membershipError) throw membershipError

    if (!membership?.organization_id) {
      throw new Error('You are not a member of an organization.')
    }

    setOrganizationId(membership.organization_id)

    return {
      userId: user.id,
      organizationId: membership.organization_id,
    }
  }, [])

  const loadMembers = useCallback(
    async (orgId: string, userId: string) => {
      const { data: memberRows, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (memberError) throw memberError

      const userIds = (memberRows || []).map(
        (member) => member.user_id
      )

      if (!userIds.length) {
        setMembers([])
        return
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)

      if (profileError) throw profileError

      const profileMap = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
      )

      const mapped = (memberRows || [])
        .filter((member) => member.user_id !== userId)
        .map((member) => ({
          user_id: member.user_id,
          role: member.role,
          profile: profileMap.get(member.user_id) || {
            id: member.user_id,
            full_name: null,
            email: null,
            avatar_url: null,
          },
        }))

      setMembers(mapped)
    },
    []
  )

  const loadAlerts = useCallback(
    async (orgId: string, userId: string) => {
      const { data: alertRows, error: alertError } = await supabase
        .from('team_alerts')
        .select(
          'id, title, message, priority, created_at'
        )
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (alertError) {
        console.error(
          'Could not load team alerts:',
          alertError
        )
        return
      }

      if (!alertRows?.length) {
        setAlerts([])
        return
      }

      const alertIds = alertRows.map(
        (alert) => alert.id
      )

      const { data: readRows, error: readError } =
        await supabase
          .from('team_alert_reads')
          .select('alert_id, user_id, read_at')
          .eq('user_id', userId)
          .in('alert_id', alertIds)

      if (readError) {
        console.error(
          'Could not load alert read states:',
          readError
        )
      }

      const readIds = new Set(
        (readRows || [])
          .filter((row) => row.read_at)
          .map((row) => row.alert_id)
      )

      const mappedAlerts: TeamAlert[] =
        alertRows.map((alert) => ({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          created_at: alert.created_at,
          isRead: readIds.has(alert.id),
        }))

      setAlerts(mappedAlerts)
    },
    []
  )

  const markAlertRead = useCallback(
    async (alertId: string) => {
      if (!currentUser?.id) return

      const { error } = await supabase
        .from('team_alert_reads')
        .upsert(
          {
            alert_id: alertId,
            user_id: currentUser.id,
            read_at: new Date().toISOString(),
          },
          {
            onConflict: 'alert_id,user_id',
          }
        )

      if (error) {
        console.error(
          'Could not mark alert as read:',
          error
        )
        return
      }

      setAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                isRead: true,
              }
            : alert
        )
      )
    },
    [currentUser?.id]
  )

  const loadConversations = useCallback(
    async (orgId: string, userId: string) => {
      const { data: membershipRows, error: membershipError } =
        await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', userId)

      if (membershipError) throw membershipError

      const conversationIds = [
        ...new Set(
          (membershipRows || []).map(
            (row) => row.conversation_id
          )
        ),
      ]

      if (!conversationIds.length) {
        setConversations([])
        return
      }

      const {
        data: conversationRows,
        error: conversationError,
      } = await supabase
        .from('conversations')
        .select(
          'id, organization_id, created_at, updated_at'
        )
        .eq('organization_id', orgId)
        .in('id', conversationIds)
        .order('updated_at', {
          ascending: false,
        })

      if (conversationError) throw conversationError

      if (!conversationRows?.length) {
        setConversations([])
        return
      }

      const {
        data: allMembers,
        error: allMembersError,
      } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .in(
          'conversation_id',
          conversationRows.map(
            (conversation) => conversation.id
          )
        )

      if (allMembersError) throw allMembersError

      const otherUserIds = [
        ...new Set(
          (allMembers || [])
            .filter(
              (member) =>
                member.user_id !== userId
            )
            .map(
              (member) => member.user_id
            )
        ),
      ]

      const {
        data: profiles,
        error: profileError,
      } = otherUserIds.length
        ? await supabase
            .from('profiles')
            .select(
              'id, full_name, email, avatar_url'
            )
            .in('id', otherUserIds)
        : { data: [], error: null }

      if (profileError) throw profileError

      const profileMap = new Map(
        (profiles || []).map((profile) => [
          profile.id,
          profile,
        ])
      )

      const {
        data: messageRows,
        error: messageError,
      } = await supabase
        .from('messages')
        .select(
          'id, conversation_id, sender_id, body, created_at, delivered_at, read_at'
        )
        .in(
          'conversation_id',
          conversationRows.map(
            (conversation) => conversation.id
          )
        )
        .order('created_at', {
          ascending: false,
        })

      if (messageError) throw messageError

      const lastMessageMap = new Map<
        string,
        Message
      >()

      const unreadMap = new Map<
        string,
        number
      >()

      for (const message of messageRows || []) {
        if (
          !lastMessageMap.has(
            message.conversation_id
          )
        ) {
          lastMessageMap.set(
            message.conversation_id,
            message
          )
        }

        if (
          message.sender_id !== userId &&
          !message.read_at
        ) {
          unreadMap.set(
            message.conversation_id,
            (unreadMap.get(
              message.conversation_id
            ) || 0) + 1
          )
        }
      }

      const items: ConversationItem[] = []

      for (const conversation of conversationRows) {
        const otherMember =
          (allMembers || []).find(
            (member) =>
              member.conversation_id ===
                conversation.id &&
              member.user_id !== userId
          )

        if (!otherMember) continue

        const otherUser =
          profileMap.get(
            otherMember.user_id
          ) || {
            id: otherMember.user_id,
            full_name: null,
            email: null,
            avatar_url: null,
          }

        items.push({
          conversation,
          otherUser,
          lastMessage:
            lastMessageMap.get(
              conversation.id
            ) || null,
          unreadCount:
            unreadMap.get(
              conversation.id
            ) || 0,
        })
      }

      setConversations(items)

      if (
        !selectedConversationId &&
        items.length > 0
      ) {
        setSelectedConversationId(
          items[0].conversation.id
        )
      }
    },
    [selectedConversationId]
  )

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true)

      const { data, error } =
        await supabase
          .from('messages')
          .select(
            'id, conversation_id, sender_id, body, created_at, delivered_at, read_at'
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .order('created_at', {
            ascending: true,
          })

      if (error) {
        console.error(
          'Could not load messages:',
          error
        )

        setLoadingMessages(false)
        return
      }

      setMessages(data || [])
      setLoadingMessages(false)

      scrollToBottom(false)
    },
    [scrollToBottom]
  )

  const markMessagesRead = useCallback(
    async (conversationId: string) => {
      if (!currentUser?.id) return

      const unreadIds = messages
        .filter(
          (message) =>
            message.conversation_id ===
              conversationId &&
            message.sender_id !==
              currentUser.id &&
            !message.read_at
        )
        .map(
          (message) => message.id
        )

      if (!unreadIds.length) return

      const readAt =
        new Date().toISOString()

      const { error } =
        await supabase
          .from('messages')
          .update({
            read_at: readAt,
          })
          .in(
            'id',
            unreadIds
          )

      if (error) {
        console.error(
          'Could not mark messages as read:',
          error
        )
        return
      }

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(
            message.id
          )
            ? {
                ...message,
                read_at: readAt,
              }
            : message
        )
      )

      setConversations((current) =>
        current.map((item) =>
          item.conversation.id ===
          conversationId
            ? {
                ...item,
                unreadCount: 0,
              }
            : item
        )
      )
    },
    [currentUser?.id, messages]
  )

const createConversation = async (
  targetUserId: string,
): Promise<string> => {
  if (!organizationId) {
    throw new Error('No organization selected')
  }

  if (!currentUser?.id) {
    throw new Error('No logged-in user')
  }

  if (currentUser.id === targetUserId) {
    throw new Error('You cannot start a conversation with yourself')
  }

  const conversationId = crypto.randomUUID()

  const {
    error: conversationError,
  } = await supabase
    .from('conversations')
    .insert({
      id: conversationId,
      organization_id: organizationId,
    })

  if (conversationError) {
    console.error(
      'Creating conversation failed:',
      conversationError,
    )

    throw conversationError
  }

  const {
    error: membersError,
  } = await supabase
    .from('conversation_members')
    .insert([
      {
        conversation_id: conversationId,
        user_id: currentUser.id,
      },
      {
        conversation_id: conversationId,
        user_id: targetUserId,
      },
    ])

  if (membersError) {
    console.error(
      'Adding conversation members failed:',
      membersError,
    )

    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    throw membersError
  }

  return conversationId
}

  const openConversationWithUser =
    async (
      member: OrganizationMember
    ) => {
      if (!member.profile) return

      try {
        const conversationId =
          await createConversation(
            member.user_id
          )

        if (!conversationId)
          return

        await loadConversations(
          organizationId!,
          currentUser!.id
        )

        setSelectedConversationId(
          conversationId
        )

        setShowNewMessage(false)
        setMobileSidebar(false)
      } catch (error: any) {
        console.error(error)

        alert(
          error?.message ||
            'Could not open conversation.'
        )
      }
    }

  const sendMessage = async () => {
    const body =
      messageText.trim()

    if (
      !body ||
      !selectedConversationId ||
      !currentUser?.id ||
      sending
    ) {
      return
    }

    setSending(true)

    const optimisticId =
      `temp-${Date.now()}`

    const optimisticMessage: Message =
      {
        id: optimisticId,
        conversation_id:
          selectedConversationId,
        sender_id:
          currentUser.id,
        body,
        created_at:
          new Date().toISOString(),
        delivered_at:
          new Date().toISOString(),
        read_at: null,
      }

    setMessages((current) => [
      ...current,
      optimisticMessage,
    ])

    setMessageText('')
    scrollToBottom()

    const {
      data,
      error,
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          selectedConversationId,
        sender_id:
          currentUser.id,
        body,
        delivered_at:
          new Date().toISOString(),
      })
      .select(
        'id, conversation_id, sender_id, body, created_at, delivered_at, read_at'
      )
      .single()

    setSending(false)

    if (error) {
      console.error(
        'SEND MESSAGE ERROR:',
        error
      )

      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !==
            optimisticId
        )
      )

      setMessageText(body)

      alert(
        `Message could not be sent.\n\n${error.message}`
      )

      return
    }

    setMessages((current) =>
      current.map((message) =>
        message.id ===
        optimisticId
          ? data
          : message
      )
    )

    await supabase
      .from('conversations')
      .update({
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        selectedConversationId
      )

    if (
      organizationId &&
      currentUser.id
    ) {
      await loadConversations(
        organizationId,
        currentUser.id
      )
    }

    scrollToBottom()
  }

  const handleComposerKeyDown =
    (
      event: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
      if (
        event.key === 'Enter' &&
        !event.shiftKey
      ) {
        event.preventDefault()
        sendMessage()
      }
    }

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        setLoading(true)

        const result =
          await loadCurrentUser()

        if (!mounted) return

        await Promise.all([
          loadMembers(
            result.organizationId,
            result.userId
          ),
          loadConversations(
            result.organizationId,
            result.userId
          ),
          loadAlerts(
            result.organizationId,
            result.userId
          ),
        ])
      } catch (error: any) {
        console.error(
          'Messages initialization error:',
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [
    loadCurrentUser,
    loadMembers,
    loadConversations,
    loadAlerts,
  ])

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }

    loadMessages(
      selectedConversationId
    )
  }, [
    selectedConversationId,
    loadMessages,
  ])

  useEffect(() => {
    if (!selectedConversationId)
      return

    const timer =
      window.setTimeout(() => {
        markMessagesRead(
          selectedConversationId
        )
      }, 250)

    return () =>
      window.clearTimeout(timer)
  }, [
    selectedConversationId,
    messages,
    markMessagesRead,
  ])

  /*
   * REALTIME MESSAGES
   */
  useEffect(() => {
    if (
      !organizationId ||
      !currentUser?.id
    ) {
      return
    }

    const channel =
      supabase
        .channel(
          `crm-messages-${currentUser.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const incoming =
              payload.new as Message

            if (
              !incoming?.conversation_id
            ) {
              return
            }

            setMessages((current) => {
              if (
                current.some(
                  (message) =>
                    message.id ===
                    incoming.id
                )
              ) {
                return current
              }

              if (
                incoming.conversation_id ===
                selectedConversationId
              ) {
                return [
                  ...current,
                  incoming,
                ]
              }

              return current
            })

            if (
              incoming.conversation_id ===
                selectedConversationId &&
              incoming.sender_id !==
                currentUser.id
            ) {
              await supabase
                .from('messages')
                .update({
                  delivered_at:
                    incoming.delivered_at ||
                    new Date().toISOString(),
                })
                .eq(
                  'id',
                  incoming.id
                )

              setTimeout(() => {
                markMessagesRead(
                  incoming.conversation_id
                )
              }, 200)
            }

            await loadConversations(
              organizationId,
              currentUser.id
            )

            if (
              incoming.conversation_id ===
              selectedConversationId
            ) {
              scrollToBottom()
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const updated =
              payload.new as Message

            if (!updated?.id)
              return

            setMessages((current) =>
              current.map(
                (message) =>
                  message.id ===
                  updated.id
                    ? {
                        ...message,
                        ...updated,
                      }
                    : message
              )
            )
          }
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [
    organizationId,
    currentUser?.id,
    selectedConversationId,
    loadConversations,
    markMessagesRead,
    scrollToBottom,
  ])

  /*
   * REALTIME TEAM ALERTS
   */
  useEffect(() => {
    if (
      !organizationId ||
      !currentUser?.id
    ) {
      return
    }

    const channel =
      supabase
        .channel(
          `crm-team-alerts-${organizationId}-${currentUser.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'team_alerts',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const incoming =
              payload.new as {
                id: string
                organization_id: string
                title: string
                message: string
                priority:
                  | 'high'
                  | 'medium'
                  | 'low'
                created_at: string
              }

            if (!incoming?.id)
              return

            setAlerts((current) => {
              if (
                current.some(
                  (alert) =>
                    alert.id ===
                    incoming.id
                )
              ) {
                return current
              }

              return [
                {
                  id: incoming.id,
                  title:
                    incoming.title,
                  message:
                    incoming.message,
                  priority:
                    incoming.priority,
                  created_at:
                    incoming.created_at,
                  isRead: false,
                },
                ...current,
              ]
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'team_alert_reads',
            filter: `user_id=eq.${currentUser.id}`,
          },
          (payload) => {
            const incoming =
              payload.new as {
                alert_id: string
                user_id: string
                read_at: string
              }

            if (
              !incoming?.alert_id
            ) {
              return
            }

            setAlerts((current) =>
              current.map(
                (alert) =>
                  alert.id ===
                  incoming.alert_id
                    ? {
                        ...alert,
                        isRead: true,
                      }
                    : alert
              )
            )
          }
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [
    organizationId,
    currentUser?.id,
  ])

  const selectConversation = (
    conversationId: string
  ) => {
    setSelectedConversationId(
      conversationId
    )

    setShowNewMessage(false)
    setMobileSidebar(false)
  }

  const selectedMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.conversation_id ===
          selectedConversationId
      ),
    [messages, selectedConversationId]
  )

  const messageGroups = useMemo(
    () =>
      groupMessages(
        selectedMessages
      ),
    [selectedMessages]
  )

  const isCurrentUser = (
    message: Message
  ) =>
    message.sender_id ===
    currentUser?.id

  if (loading) {
    return (
      <div
        style={{
          height: '100%',
          minHeight:
            'calc(100vh - 72px)',
          background: CRM.bg,
          color: CRM.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${CRM.border}`,
              borderTopColor:
                CRM.purpleLight,
              borderRadius: '50%',
              animation:
                'crm-spin 0.8s linear infinite',
              margin:
                '0 auto 14px',
            }}
          />

          <div
            style={{
              fontSize: 14,
              color: CRM.muted,
            }}
          >
            Loading messages...
          </div>
        </div>

        <style>{`
          @keyframes crm-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        height:
          'calc(100vh - 72px)',
        minHeight: 600,
        background: CRM.bg,
        color: CRM.text,
        display: 'flex',
        overflow: 'hidden',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* LEFT SIDEBAR */}

      <aside
        style={{
          width: mobileSidebar
            ? 350
            : 0,
          minWidth:
            mobileSidebar
              ? 350
              : 0,
          background:
            CRM.sidebar,
          borderRight: `1px solid ${CRM.border}`,
          display: 'flex',
          flexDirection:
            'column',
          overflow: 'hidden',
          transition:
            'all 0.2s ease',
          position:
            'relative',
          zIndex: 5,
        }}
      >
        {/* HEADER */}

        <div
          style={{
            height: 72,
            padding:
              '0 18px',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            borderBottom:
              `1px solid ${CRM.border}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing:
                  '-0.02em',
              }}
            >
              Messages
            </div>

            <div
              style={{
                fontSize: 12,
                color: CRM.muted,
                marginTop: 3,
              }}
            >
              Team communication
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: 6,
            }}
          >
            <button
              onClick={() =>
                setShowAlerts(true)
              }
              title="Team alerts"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: `1px solid ${CRM.border}`,
                background:
                  unreadAlerts > 0
                    ? 'rgba(239,68,68,0.10)'
                    : CRM.panel,
                color:
                  unreadAlerts > 0
                    ? CRM.red
                    : CRM.muted,
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                cursor:
                  'pointer',
                position:
                  'relative',
              }}
            >
              <Bell size={17} />

              {unreadAlerts >
                0 && (
                <span
                  style={{
                    position:
                      'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 17,
                    height: 17,
                    padding:
                      '0 4px',
                    borderRadius:
                      999,
                    background:
                      CRM.red,
                    color: '#fff',
                    border: `2px solid ${CRM.sidebar}`,
                    fontSize: 8,
                    fontWeight: 700,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  {unreadAlerts >
                  99
                    ? '99+'
                    : unreadAlerts}
                </span>
              )}
            </button>

            <button
              onClick={() =>
                setShowNewMessage(
                  true
                )
              }
              title="New message"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: 'none',
                background:
                  CRM.purple,
                color: '#fff',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                cursor:
                  'pointer',
                boxShadow:
                  '0 6px 18px rgba(124,58,237,0.25)',
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* SEARCH */}

        <div
          style={{
            padding:
              '14px 14px 10px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: 40,
              display: 'flex',
              alignItems:
                'center',
              gap: 9,
              padding:
                '0 12px',
              background:
                CRM.panel,
              border: `1px solid ${CRM.border}`,
              borderRadius: 9,
            }}
          >
            <Search
              size={16}
              color={CRM.muted}
            />

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search conversations..."
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline:
                  'none',
                background:
                  'transparent',
                color:
                  CRM.text,
                fontSize: 13,
              }}
            />

            {search && (
              <button
                onClick={() =>
                  setSearch('')
                }
                style={{
                  border: 'none',
                  background:
                    'transparent',
                  color:
                    CRM.muted,
                  cursor:
                    'pointer',
                  padding: 0,
                  display:
                    'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* CONVERSATION TITLE */}

        <div
          style={{
            padding:
              '7px 18px 9px',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: CRM.muted,
              textTransform:
                'uppercase',
              letterSpacing:
                '0.08em',
            }}
          >
            Conversations
          </span>

          {unreadTotal >
            0 && (
            <span
              style={{
                fontSize: 11,
                color:
                  CRM.purpleLight,
                fontWeight: 600,
              }}
            >
              {unreadTotal}{' '}
              unread
            </span>
          )}
        </div>

        {/* CONVERSATION LIST */}

        <div
          style={{
            flex: 1,
            overflowY:
              'auto',
            padding:
              '0 8px 12px',
          }}
        >
          {filteredConversations.length ===
          0 ? (
            <div
              style={{
                padding:
                  '40px 20px',
                textAlign:
                  'center',
                color:
                  CRM.muted,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background:
                    CRM.purpleSoft,
                  color:
                    CRM.purpleLight,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  margin:
                    '0 auto 12px',
                }}
              >
                <MessageCircle
                  size={21}
                />
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    CRM.text,
                  marginBottom:
                    5,
                }}
              >
                No conversations
                yet
              </div>

              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Start a
                conversation
                with someone
                from your
                team.
              </div>

              <button
                onClick={() =>
                  setShowNewMessage(
                    true
                  )
                }
                style={{
                  marginTop: 16,
                  border: `1px solid ${CRM.borderLight}`,
                  background:
                    CRM.panel,
                  color:
                    CRM.text,
                  borderRadius: 8,
                  padding:
                    '8px 12px',
                  fontSize: 12,
                  cursor:
                    'pointer',
                }}
              >
                New message
              </button>
            </div>
          ) : (
            filteredConversations.map(
              (item) => {
                const active =
                  item.conversation.id ===
                  selectedConversationId

                return (
                  <button
                    key={
                      item
                        .conversation
                        .id
                    }
                    onClick={() =>
                      selectConversation(
                        item
                          .conversation
                          .id
                      )
                    }
                    style={{
                      width: '100%',
                      border:
                        'none',
                      textAlign:
                        'left',
                      background:
                        active
                          ? CRM.purpleSoft
                          : 'transparent',
                      borderRadius: 10,
                      padding:
                        '11px 10px',
                      display:
                        'flex',
                      gap: 11,
                      cursor:
                        'pointer',
                      color:
                        CRM.text,
                      marginBottom:
                        2,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius:
                          '50%',
                        background:
                          'linear-gradient(135deg, #7C3AED, #A855F7)',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        color:
                          '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(
                        item.otherUser
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight:
                              item.unreadCount >
                              0
                                ? 700
                                : 600,
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {item
                            .otherUser
                            .full_name ||
                            item
                              .otherUser
                              .email ||
                            'Team member'}
                        </span>

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              item.unreadCount >
                              0
                                ? CRM.purpleLight
                                : CRM.muted,
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {formatConversationTime(
                            item
                              .lastMessage
                              ?.created_at ||
                              item
                                .conversation
                                .updated_at
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              item.unreadCount >
                              0
                                ? '#CBD5E1'
                                : CRM.muted,
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace:
                              'nowrap',
                            fontWeight:
                              item.unreadCount >
                              0
                                ? 500
                                : 400,
                          }}
                        >
                          {item
                            .lastMessage
                            ?.body ||
                            'Start a conversation'}
                        </span>

                        {item.unreadCount >
                          0 && (
                          <span
                            style={{
                              minWidth: 18,
                              height: 18,
                              padding:
                                '0 5px',
                              borderRadius:
                                999,
                              background:
                                CRM.purple,
                              color:
                                '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                            }}
                          >
                            {item.unreadCount >
                            99
                              ? '99+'
                              : item.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              }
            )
          )}
        </div>

        {/* BOTTOM USER */}

        <div
          style={{
            padding: 12,
            borderTop:
              `1px solid ${CRM.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap: 10,
              padding:
                '9px 10px',
              background:
                CRM.panel,
              border: `1px solid ${CRM.border}`,
              borderRadius: 9,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius:
                  '50%',
                background:
                  CRM.purpleSoft,
                color:
                  CRM.purpleLight,
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {getInitials(
                currentUser
              )}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  overflow:
                    'hidden',
                  textOverflow:
                    'ellipsis',
                  whiteSpace:
                    'nowrap',
                }}
              >
                {currentUser?.full_name ||
                  currentUser?.email ||
                  'You'}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color:
                    CRM.muted,
                  marginTop: 2,
                }}
              >
                Online
              </div>
            </div>

            <div
              style={{
                width: 7,
                height: 7,
                borderRadius:
                  '50%',
                background:
                  CRM.green,
                boxShadow:
                  '0 0 0 3px rgba(34,197,94,0.12)',
              }}
            />
          </div>
        </div>
      </aside>

      {/* MAIN CHAT */}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection:
            'column',
          background:
            CRM.bg,
        }}
      >
        {!selectedConversation ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              padding: 30,
            }}
          >
            <div
              style={{
                maxWidth: 420,
                textAlign:
                  'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background:
                    CRM.purpleSoft,
                  color:
                    CRM.purpleLight,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  margin:
                    '0 auto 18px',
                  border:
                    '1px solid rgba(124,58,237,0.18)',
                }}
              >
                <MessageCircle
                  size={28}
                />
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Your team
                inbox
              </h2>

              <p
                style={{
                  margin:
                    '8px 0 20px',
                  color:
                    CRM.muted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Select a
                conversation
                or start a new
                message with
                someone from
                your CRM team.
              </p>

              <button
                onClick={() =>
                  setShowNewMessage(
                    true
                  )
                }
                style={{
                  display:
                    'inline-flex',
                  alignItems:
                    'center',
                  gap: 8,
                  border:
                    'none',
                  background:
                    CRM.purple,
                  color:
                    '#fff',
                  padding:
                    '10px 15px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    'pointer',
                }}
              >
                <Plus size={16} />
                New message
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* CHAT HEADER */}

            <header
              style={{
                height: 72,
                minHeight: 72,
                padding:
                  '0 20px',
                display:
                  'flex',
                alignItems:
                  'center',
                gap: 12,
                borderBottom:
                  `1px solid ${CRM.border}`,
                background:
                  CRM.sidebar,
              }}
            >
              {!mobileSidebar && (
                <button
                  onClick={() =>
                    setMobileSidebar(
                      true
                    )
                  }
                  style={{
                    border:
                      'none',
                    background:
                      'transparent',
                    color:
                      CRM.muted,
                    cursor:
                      'pointer',
                  }}
                >
                  <ChevronDown
                    size={18}
                    style={{
                      transform:
                        'rotate(90deg)',
                    }}
                  />
                </button>
              )}

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius:
                    '50%',
                  background:
                    'linear-gradient(135deg, #7C3AED, #A855F7)',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  color:
                    '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {getInitials(
                  selectedConversation.otherUser
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {selectedConversation
                    .otherUser
                    .full_name ||
                    selectedConversation
                      .otherUser
                      .email ||
                    'Team member'}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      CRM.muted,
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      color:
                        CRM.green,
                      marginRight: 5,
                    }}
                  >
                    ●
                  </span>
                  Team member
                </div>
              </div>

              <button
                onClick={() =>
                  setShowAlerts(
                    true
                  )
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${CRM.border}`,
                  background:
                    unreadAlerts >
                    0
                      ? 'rgba(239,68,68,0.10)'
                      : CRM.panel,
                  color:
                    unreadAlerts >
                    0
                      ? CRM.red
                      : CRM.muted,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  cursor:
                    'pointer',
                  position:
                    'relative',
                }}
              >
                <Bell size={16} />

                {unreadAlerts >
                  0 && (
                  <span
                    style={{
                      position:
                        'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 15,
                      height: 15,
                      padding:
                        '0 3px',
                      borderRadius:
                        999,
                      background:
                        CRM.red,
                      color:
                        '#fff',
                      fontSize: 8,
                      fontWeight: 700,
                      display:
                        'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      border: `2px solid ${CRM.sidebar}`,
                    }}
                  >
                    {unreadAlerts >
                    99
                      ? '99+'
                      : unreadAlerts}
                  </span>
                )}
              </button>

              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${CRM.border}`,
                  background:
                    CRM.panel,
                  color:
                    CRM.muted,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  cursor:
                    'pointer',
                }}
              >
                <MoreHorizontal
                  size={17}
                />
              </button>
            </header>

            {/* MESSAGES */}

            <div
              style={{
                flex: 1,
                overflowY:
                  'auto',
                padding:
                  '22px 24px',
                background:
                  CRM.bg,
              }}
            >
              {loadingMessages ? (
                <div
                  style={{
                    height: '100%',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    color:
                      CRM.muted,
                    fontSize: 13,
                  }}
                >
                  Loading
                  conversation...
                </div>
              ) : selectedMessages.length ===
                0 ? (
                <div
                  style={{
                    height:
                      '100%',
                    minHeight: 300,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <div
                    style={{
                      textAlign:
                        'center',
                      color:
                        CRM.muted,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background:
                          CRM.panel,
                        border: `1px solid ${CRM.border}`,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        margin:
                          '0 auto 12px',
                        color:
                          CRM.purpleLight,
                      }}
                    >
                      <MessageCircle
                        size={21}
                      />
                    </div>

                    <div
                      style={{
                        color:
                          CRM.text,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      No messages
                      yet
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      Send the
                      first
                      message to
                      your
                      teammate.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messageGroups.map(
                    (group) => (
                      <div
                        key={
                          group.label
                        }
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: 12,
                            margin:
                              '8px 0 18px',
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 1,
                              background:
                                CRM.border,
                            }}
                          />

                          <span
                            style={{
                              fontSize: 10,
                              color:
                                CRM.muted,
                              fontWeight: 600,
                              padding:
                                '3px 9px',
                              borderRadius:
                                999,
                              background:
                                CRM.panel,
                              border: `1px solid ${CRM.border}`,
                            }}
                          >
                            {group.label}
                          </span>

                          <div
                            style={{
                              flex: 1,
                              height: 1,
                              background:
                                CRM.border,
                            }}
                          />
                        </div>

                        {group.messages.map(
                          (
                            message,
                            index
                          ) => {
                            const mine =
                              isCurrentUser(
                                message
                              )

                            const previous =
                              group
                                .messages[
                                index -
                                  1
                              ]

                            const sameSender =
                              previous &&
                              previous.sender_id ===
                                message.sender_id

                            return (
                              <div
                                key={
                                  message.id
                                }
                                style={{
                                  display:
                                    'flex',
                                  justifyContent:
                                    mine
                                      ? 'flex-end'
                                      : 'flex-start',
                                  marginBottom:
                                    sameSender
                                      ? 4
                                      : 12,
                                }}
                              >
                                {!mine &&
                                  !sameSender && (
                                    <div
                                      style={{
                                        width: 28,
                                        height: 28,
                                        minWidth: 28,
                                        borderRadius:
                                          '50%',
                                        background:
                                          'linear-gradient(135deg, #7C3AED, #A855F7)',
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        justifyContent:
                                          'center',
                                        color:
                                          '#fff',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        marginRight: 8,
                                        marginTop: 2,
                                      }}
                                    >
                                      {getInitials(
                                        selectedConversation.otherUser
                                      )}
                                    </div>
                                  )}

                                {!mine &&
                                  sameSender && (
                                    <div
                                      style={{
                                        width: 36,
                                        minWidth: 36,
                                      }}
                                    />
                                  )}

                                <div
                                  style={{
                                    maxWidth:
                                      'min(680px, 72%)',
                                  }}
                                >
                                  <div
                                    style={{
                                      padding:
                                        '9px 12px',
                                      borderRadius:
                                        mine
                                          ? '12px 12px 4px 12px'
                                          : '12px 12px 12px 4px',
                                      background:
                                        mine
                                          ? CRM.purple
                                          : CRM.panel2,
                                      border:
                                        mine
                                          ? '1px solid rgba(168,85,247,0.45)'
                                          : `1px solid ${CRM.border}`,
                                      color:
                                        CRM.text,
                                      fontSize: 13,
                                      lineHeight: 1.5,
                                      boxShadow:
                                        mine
                                          ? '0 5px 15px rgba(124,58,237,0.14)'
                                          : 'none',
                                      whiteSpace:
                                        'pre-wrap',
                                      overflowWrap:
                                        'anywhere',
                                    }}
                                  >
                                    {
                                      message.body
                                    }
                                  </div>

                                  <div
                                    style={{
                                      display:
                                        'flex',
                                      alignItems:
                                        'center',
                                      justifyContent:
                                        mine
                                          ? 'flex-end'
                                          : 'flex-start',
                                      gap: 5,
                                      marginTop: 4,
                                      padding:
                                        '0 3px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color:
                                          CRM.muted,
                                      }}
                                    >
                                      {formatTime(
                                        message.created_at
                                      )}
                                    </span>

                                    {mine && (
                                      <>
                                        {message.read_at ? (
                                          <CheckCheck
                                            size={
                                              13
                                            }
                                            color={
                                              CRM.purpleLight
                                            }
                                          />
                                        ) : message.delivered_at ? (
                                          <CheckCheck
                                            size={
                                              13
                                            }
                                            color={
                                              CRM.muted
                                            }
                                          />
                                        ) : (
                                          <Check
                                            size={
                                              13
                                            }
                                            color={
                                              CRM.muted
                                            }
                                          />
                                        )}

                                        <span
                                          style={{
                                            fontSize: 9,
                                            color:
                                              message.read_at
                                                ? CRM.purpleLight
                                                : CRM.muted,
                                          }}
                                        >
                                          {message.read_at
                                            ? 'Read'
                                            : message.delivered_at
                                            ? 'Delivered'
                                            : 'Sent'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    )
                  )}

                  <div
                    ref={
                      messagesEndRef
                    }
                  />
                </>
              )}
            </div>

            {/* COMPOSER */}

            <div
              style={{
                padding:
                  '10px 18px 14px',
                background:
                  CRM.sidebar,
                borderTop:
                  `1px solid ${CRM.border}`,
              }}
            >
              <div
                style={{
                  maxWidth: 1100,
                  margin:
                    '0 auto',
                  display:
                    'flex',
                  alignItems:
                    'flex-end',
                  gap: 8,
                  padding:
                    '7px 8px 7px 12px',
                  background:
                    CRM.panel,
                  border: `1px solid ${CRM.borderLight}`,
                  borderRadius: 11,
                  boxShadow:
                    '0 8px 24px rgba(0,0,0,0.15)',
                }}
              >
                <button
                  title="Attach file"
                  style={{
                    width: 34,
                    height: 34,
                    border: 'none',
                    background:
                      'transparent',
                    color:
                      CRM.muted,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    cursor:
                      'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Paperclip
                    size={17}
                  />
                </button>

                <textarea
                  ref={
                    messageInputRef
                  }
                  value={
                    messageText
                  }
                  onChange={(
                    event
                  ) =>
                    setMessageText(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={
                    handleComposerKeyDown
                  }
                  placeholder={`Message ${
                    selectedConversation
                      .otherUser
                      .full_name ||
                    'team member'
                  }...`}
                  rows={1}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    resize:
                      'none',
                    maxHeight: 120,
                    minHeight: 34,
                    padding:
                      '8px 4px',
                    border:
                      'none',
                    outline:
                      'none',
                    background:
                      'transparent',
                    color:
                      CRM.text,
                    fontSize: 13,
                    lineHeight:
                      1.4,
                    fontFamily:
                      'inherit',
                  }}
                />

                <button
                  onClick={
                    sendMessage
                  }
                  disabled={
                    !messageText.trim() ||
                    sending
                  }
                  title="Send message"
                  style={{
                    width: 34,
                    height: 34,
                    border:
                      'none',
                    borderRadius: 8,
                    background:
                      messageText.trim() &&
                      !sending
                        ? CRM.purple
                        : CRM.border,
                    color:
                      messageText.trim() &&
                      !sending
                        ? '#fff'
                        : CRM.muted,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    cursor:
                      messageText.trim() &&
                      !sending
                        ? 'pointer'
                        : 'default',
                    flexShrink: 0,
                  }}
                >
                  <Send
                    size={15}
                  />
                </button>
              </div>

              <div
                style={{
                  maxWidth: 1100,
                  margin:
                    '6px auto 0',
                  paddingLeft: 50,
                  fontSize: 9,
                  color:
                    CRM.muted,
                }}
              >
                Enter to send ·
                Shift + Enter
                for a new line
              </div>
            </div>
          </>
        )}
      </main>

      {/* NEW MESSAGE MODAL */}

      {showNewMessage && (
        <div
          onClick={() =>
            setShowNewMessage(
              false
            )
          }
          style={{
            position:
              'fixed',
            inset: 0,
            background:
              'rgba(2,6,23,0.72)',
            backdropFilter:
              'blur(4px)',
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(440px, 100%)',
              maxHeight:
                '80vh',
              background:
                CRM.panel,
              border: `1px solid ${CRM.borderLight}`,
              borderRadius: 14,
              boxShadow:
                '0 25px 70px rgba(0,0,0,0.45)',
              overflow:
                'hidden',
            }}
          >
            <div
              style={{
                padding:
                  '16px 18px',
                borderBottom:
                  `1px solid ${CRM.border}`,
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  New message
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      CRM.muted,
                    marginTop: 3,
                  }}
                >
                  Choose a
                  team member
                </div>
              </div>

              <button
                onClick={() =>
                  setShowNewMessage(
                    false
                  )
                }
                style={{
                  border:
                    'none',
                  background:
                    'transparent',
                  color:
                    CRM.muted,
                  cursor:
                    'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 12,
                borderBottom:
                  `1px solid ${CRM.border}`,
              }}
            >
              <div
                style={{
                  height: 38,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: 8,
                  padding:
                    '0 10px',
                  background:
                    CRM.bg,
                  border: `1px solid ${CRM.border}`,
                  borderRadius: 8,
                }}
              >
                <Search
                  size={15}
                  color={
                    CRM.muted
                  }
                />

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search team..."
                  style={{
                    flex: 1,
                    border:
                      'none',
                    outline:
                      'none',
                    background:
                      'transparent',
                    color:
                      CRM.text,
                    fontSize: 12,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                maxHeight: 400,
                overflowY:
                  'auto',
                padding: 8,
              }}
            >
              {filteredMembers.length ===
              0 ? (
                <div
                  style={{
                    padding: 35,
                    textAlign:
                      'center',
                    color:
                      CRM.muted,
                    fontSize: 12,
                  }}
                >
                  No team
                  members
                  found.
                </div>
              ) : (
                filteredMembers.map(
                  (member) => (
                    <button
                      key={
                        member.user_id
                      }
                      onClick={() =>
                        openConversationWithUser(
                          member
                        )
                      }
                      style={{
                        width:
                          '100%',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: 11,
                        padding: 10,
                        border:
                          'none',
                        background:
                          'transparent',
                        color:
                          CRM.text,
                        cursor:
                          'pointer',
                        borderRadius: 9,
                        textAlign:
                          'left',
                      }}
                      onMouseEnter={(
                        event
                      ) => {
                        event.currentTarget.style.background =
                          CRM.purpleSoft
                      }}
                      onMouseLeave={(
                        event
                      ) => {
                        event.currentTarget.style.background =
                          'transparent'
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius:
                            '50%',
                          background:
                            'linear-gradient(135deg, #7C3AED, #A855F7)',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          color:
                            '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {getInitials(
                          member.profile
                        )}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {member
                            .profile
                            ?.full_name ||
                            member
                              .profile
                              ?.email ||
                            'Team member'}
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            color:
                              CRM.muted,
                            marginTop: 3,
                          }}
                        >
                          {
                            member.role
                          }
                        </div>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEAM ALERTS */}

      {showAlerts && (
        <div
          onClick={() =>
            setShowAlerts(
              false
            )
          }
          style={{
            position:
              'fixed',
            inset: 0,
            background:
              'rgba(2,6,23,0.55)',
            backdropFilter:
              'blur(3px)',
            zIndex: 90,
          }}
        >
          <div
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            style={{
              position:
                'absolute',
              right: 20,
              top: 80,
              width:
                'min(420px, calc(100vw - 40px))',
              maxHeight:
                'calc(100vh - 110px)',
              overflow:
                'hidden',
              background:
                CRM.panel,
              border: `1px solid ${CRM.borderLight}`,
              borderRadius: 14,
              boxShadow:
                '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* ALERT HEADER */}

            <div
              style={{
                padding:
                  '16px 18px',
                borderBottom:
                  `1px solid ${CRM.border}`,
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'space-between',
              }}
            >
              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background:
                      unreadAlerts >
                      0
                        ? 'rgba(239,68,68,0.10)'
                        : CRM.purpleSoft,
                    color:
                      unreadAlerts >
                      0
                        ? CRM.red
                        : CRM.purpleLight,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <ShieldAlert
                    size={17}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Team alerts
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color:
                        CRM.muted,
                      marginTop: 2,
                    }}
                  >
                    {unreadAlerts >
                    0
                      ? `${unreadAlerts} unread alert${
                          unreadAlerts ===
                          1
                            ? ''
                            : 's'
                        }`
                      : 'All alerts read'}
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setShowAlerts(
                    false
                  )
                }
                style={{
                  border:
                    'none',
                  background:
                    'transparent',
                  color:
                    CRM.muted,
                  cursor:
                    'pointer',
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* ALERT LIST */}

            <div
              style={{
                padding: 10,
                overflowY:
                  'auto',
                maxHeight:
                  'calc(100vh - 190px)',
              }}
            >
              {alerts.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      '42px 20px',
                    textAlign:
                      'center',
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background:
                        CRM.bg,
                      border: `1px solid ${CRM.border}`,
                      color:
                        CRM.muted,
                      display:
                        'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      margin:
                        '0 auto 12px',
                    }}
                  >
                    <Bell
                      size={20}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color:
                        CRM.text,
                      fontWeight: 600,
                    }}
                  >
                    No team
                    alerts
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      color:
                        CRM.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    High-priority
                    alerts will
                    appear here.
                  </div>
                </div>
              ) : (
                alerts.map(
                  (alert) => (
                    <div
                      key={
                        alert.id
                      }
                      onClick={() => {
                        if (
                          !alert.isRead
                        ) {
                          markAlertRead(
                            alert.id
                          )
                        }
                      }}
                      style={{
                        padding: 13,
                        background:
                          !alert.isRead
                            ? alert.priority ===
                              'high'
                              ? 'rgba(239,68,68,0.08)'
                              : CRM.purpleSoft
                            : CRM.panel2,
                        border: `1px solid ${
                          !alert.isRead
                            ? alert.priority ===
                              'high'
                              ? 'rgba(239,68,68,0.20)'
                              : 'rgba(124,58,237,0.25)'
                            : CRM.border
                        }`,
                        borderRadius: 10,
                        marginBottom: 8,
                        cursor:
                          !alert.isRead
                            ? 'pointer'
                            : 'default',
                        transition:
                          'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 12,
                            fontWeight:
                              alert.isRead
                                ? 600
                                : 700,
                          }}
                        >
                          {
                            alert.title
                          }
                        </div>

                        <span
                          style={{
                            fontSize: 9,
                            textTransform:
                              'uppercase',
                            fontWeight: 700,
                            color:
                              alert.priority ===
                              'high'
                                ? CRM.red
                                : alert.priority ===
                                  'medium'
                                ? CRM.amber
                                : CRM.muted,
                          }}
                        >
                          {
                            alert.priority
                          }
                        </span>

                        {!alert.isRead && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius:
                                '50%',
                              background:
                                CRM.purpleLight,
                              flexShrink: 0,
                              boxShadow:
                                `0 0 0 3px rgba(168,85,247,0.10)`,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color:
                            CRM.muted,
                          lineHeight: 1.5,
                          marginTop: 6,
                        }}
                      >
                        {
                          alert.message
                        }
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          marginTop: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            color:
                              CRM.muted,
                          }}
                        >
                          {formatConversationTime(
                            alert.created_at
                          )}
                        </span>

                        {!alert.isRead && (
                          <span
                            style={{
                              fontSize: 9,
                              color:
                                CRM.purpleLight,
                              fontWeight: 600,
                            }}
                          >
                            Click to mark
                            read
                          </span>
                        )}

                        {alert.isRead && (
                          <span
                            style={{
                              fontSize: 9,
                              color:
                                CRM.muted,
                            }}
                          >
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }

        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }

        textarea::placeholder,
        input::placeholder {
          color: #64748B;
        }

        button {
          font-family: inherit;
        }

        @media (max-width: 850px) {
          aside {
            position: absolute !important;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 20;
          }
        }

        @media (max-width: 600px) {
          main header {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          main > div {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
