/**
 * Base URL cho API messenger admin (trùng logic với app/admin/messenger/page.tsx).
 */
export function getAdminMessengerApiBase(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_URL
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, '')}/api/backend/v1`
  }
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api/backend/v1'
    : `${window.location.protocol}//${window.location.hostname}/api/backend/v1`
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
