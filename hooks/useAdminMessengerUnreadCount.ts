'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getAuthData } from '@/lib/admin-auth'
import {
  ADMIN_MESSENGER_UNREAD_CHANNEL,
  fetchAdminTotalUnreadCount,
} from '@/lib/admin-messenger-unread'

const POLL_MS = 30_000

/**
 * Tổng số tin chưa đọc (tất cả hội thoại) cho header admin.
 * — Gọi API /conversations, cộng unread_count.
 * — Poll định kỳ + khi focus / đổi route.
 * — BroadcastChannel: khi tab khác mở Messenger và đọc tin, cập nhật ngay.
 */
export function useAdminMessengerUnreadCount() {
  const [count, setCount] = useState(0)
  const pathname = usePathname()

  const refresh = useCallback(async () => {
    const { token } = getAuthData()
    if (!token) {
      setCount(0)
      return
    }
    try {
      const total = await fetchAdminTotalUnreadCount(token)
      setCount(total)
    } catch {
      setCount(0)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, pathname])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onVis)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onVis)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel(ADMIN_MESSENGER_UNREAD_CHANNEL)
      bc.onmessage = (e: MessageEvent) => {
        if (typeof e.data?.total === 'number' && Number.isFinite(e.data.total)) {
          setCount(Math.max(0, e.data.total))
        }
      }
    } catch {
      /* ignore */
    }
    return () => {
      bc?.close()
    }
  }, [])

  return { count, refresh }
}
