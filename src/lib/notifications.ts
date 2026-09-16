import { supabase } from './supabase'

export type NotificationType =
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

type CreateNotificationInput = {
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  message?: string
  entityId?: string
  entityType?: string
  route?: string
}

export async function createNotification(
  input: CreateNotificationInput
) {
  const {
    organizationId,
    userId,
    type,
    title,
    message,
    entityId,
    entityType,
    route,
  } = input

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      type,
      title,
      message:
        message || null,
      entity_id:
        entityId || null,
      entity_type:
        entityType || null,
      route:
        route || null,
    })
    .select()
    .single()

  if (error) {
    console.error(
      'Failed to create notification:',
      error
    )

    throw error
  }

  return data
}


export async function createNotifications(
  notifications: CreateNotificationInput[]
) {
  if (!notifications.length) {
    return []
  }

  const rows = notifications.map(
    notification => ({
      organization_id:
        notification.organizationId,

      user_id:
        notification.userId,

      type:
        notification.type,

      title:
        notification.title,

      message:
        notification.message ||
        null,

      entity_id:
        notification.entityId ||
        null,

      entity_type:
        notification.entityType ||
        null,

      route:
        notification.route ||
        null,
    })
  )

  const {
    data,
    error,
  } = await supabase
    .from('notifications')
    .insert(rows)
    .select()

  if (error) {
    console.error(
      'Failed to create notifications:',
      error
    )

    throw error
  }

  return data ?? []
}


export async function markNotificationAsRead(
  notificationId: string
) {
  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      notificationId
    )

  if (error) {
    console.error(
      'Failed to mark notification as read:',
      error
    )

    throw error
  }
}


export async function markAllNotificationsAsRead(
  userId: string
) {
  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq(
      'user_id',
      userId
    )
    .is(
      'read_at',
      null
    )

  if (error) {
    console.error(
      'Failed to mark all notifications as read:',
      error
    )

    throw error
  }
}


export async function getUnreadNotificationCount(
  userId: string
) {
  const {
    count,
    error,
  } = await supabase
    .from('notifications')
    .select(
      'id',
      {
        count: 'exact',
        head: true,
      }
    )
    .eq(
      'user_id',
      userId
    )
    .is(
      'read_at',
      null
    )

  if (error) {
    console.error(
      'Failed to get unread notification count:',
      error
    )

    throw error
  }

  return count ?? 0
}