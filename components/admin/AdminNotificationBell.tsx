'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { adminNotificationsApi } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAdminNotificationWebSocket } from '@/hooks/useAdminNotificationWebSocket'

type NotifRow = {
  notification_id: number
  type: string
  title: string
  message: string
  related_order_id?: number | null
  is_read: number | boolean
  created_at: string
}

function isUnread(n: NotifRow): boolean {
  return n.is_read === 0 || n.is_read === false
}

function typeBadgeClass(t: string): string {
  switch (t) {
    case 'new_order':
      return 'bg-emerald-100 text-emerald-800'
    case 'payment_update':
      return 'bg-amber-100 text-amber-800'
    case 'order_assigned':
      return 'bg-sky-100 text-sky-800'
    case 'order_rejected':
      return 'bg-orange-100 text-orange-800'
    case 'order_reassigned':
      return 'bg-emerald-100 text-emerald-800'
    case 'order_reassign_failed':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatTime(iso: string, lang: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AdminNotificationBell() {
  const { t, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotifRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminNotificationsApi.list({ limit: 20, page: 1 })
      const data = (res as { data?: { notifications?: NotifRow[]; unread_count?: number } })?.data
      const list = (data?.notifications ?? []) as NotifRow[]
      const unread =
        typeof data?.unread_count === 'number' ? data.unread_count : list.filter(isUnread).length
      setItems(list)
      setUnreadCount(unread)
    } catch {
      // keep previous
    } finally {
      setLoading(false)
    }
  }, [])

  const onWsNotification = useCallback((payload: {
    notification_id: number
    type: string
    title: string
    message: string
    related_order_id?: number | null
    related_shipper_id?: number | null
    is_read: number
    created_at: string
  }) => {
    setItems((prev) => {
      if (prev.some((x) => x.notification_id === payload.notification_id)) {
        return prev
      }
      return [{ ...payload, is_read: payload.is_read }, ...prev]
    })
    if (isUnread({ ...payload, is_read: payload.is_read } as NotifRow)) {
      setUnreadCount((c) => c + 1)
    }

    const toastOpts = { description: payload.message, duration: 10_000 }
    switch (payload.type) {
      case 'order_rejected':
        toast.warning(payload.title, toastOpts)
        break
      case 'order_reassigned':
        toast.success(payload.title, toastOpts)
        break
      case 'order_reassign_failed':
        toast.error(payload.title, toastOpts)
        break
      default:
        break
    }
  }, [])

  useAdminNotificationWebSocket(onWsNotification)

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 120_000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const onMarkAll = async () => {
    if (unreadCount === 0) return
    setMarking(true)
    try {
      await adminNotificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch {
      void load()
    } finally {
      setMarking(false)
    }
  }

  const onItemClick = async (n: NotifRow) => {
    if (!isUnread(n)) return
    try {
      await adminNotificationsApi.markRead(n.notification_id)
      setItems((prev) =>
        prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: 1 } : x))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      void load()
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={t('notifTitle')}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold text-gray-900">{t('notifTitle')}</span>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden />}
              <button
                type="button"
                disabled={unreadCount === 0 || marking}
                onClick={() => void onMarkAll()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
                {t('notifMarkAll')}
              </button>
            </div>
          </div>
          <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
            {items.length === 0 && !loading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">{t('notifEmpty')}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.notification_id}>
                    <button
                      type="button"
                      onClick={() => void onItemClick(n)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 transition-colors hover:bg-gray-50',
                        isUnread(n) && 'bg-blue-50/50'
                      )}
                    >
                      <div className="mb-0.5 flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                            typeBadgeClass(n.type)
                          )}
                        >
                          {n.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatTime(n.created_at, language)}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{n.title}</div>
                      <p className="line-clamp-2 text-xs text-gray-600">{n.message}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-100 px-3 py-2 text-center">
            <Link
              href="/admin/orders"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              {t('notifViewOrders')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
