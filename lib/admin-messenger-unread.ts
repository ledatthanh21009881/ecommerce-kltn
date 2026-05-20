import { getBackendApiV1Base } from '@/app/api/backend/config'

/**
 * Base URL cho API messenger admin (trùng logic với app/admin/messenger/page.tsx).
 */
export function getAdminMessengerApiBase(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  return getBackendApiV1Base()
}

export const ADMIN_MESSENGER_UNREAD_CHANNEL = 'admin-messenger-unread'

export function sumConversationUnread(
  items: Array<{ unread_count?: number | string }> | undefined | null,
): number {
  if (!items?.length) return 0
  return items.reduce((sum, c) => sum + Number(c.unread_count ?? 0), 0)
}

export async function fetchAdminTotalUnreadCount(token: string): Promise<number> {
  const base = getAdminMessengerApiBase()
  if (!base) return 0

  const response = await fetch(`${base}/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) return 0

  const data = await response.json()
  const items = data?.data?.items
  return sumConversationUnread(items)
}
