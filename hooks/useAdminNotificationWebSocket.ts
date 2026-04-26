'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { getWebSocketUrl } from '@/app/api/backend/config'
import { getAuthData } from '@/lib/admin-auth'

export type AdminNotifPayload = {
  notification_id: number
  type: string
  title: string
  message: string
  related_order_id?: number | null
  related_shipper_id?: number | null
  is_read: number
  created_at: string
}

/**
 * Kết nối tới cùng Ratchet server (port 8080) — sau auth gửi `join_admin_notifications`.
 */
export function useAdminNotificationWebSocket(onNew: (n: AdminNotifPayload) => void) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew
  const manualClose = useRef(false)

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    const { token } = getAuthData()
    if (!token) {
      return
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    manualClose.current = false
    const ws = new WebSocket(getWebSocketUrl())
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ type: 'auth', token }))
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'join_admin_notifications' }))
        }
      }, 80)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type?: string
          payload?: AdminNotifPayload
        }
        if (data.type === 'admin_notification' && data.payload) {
          onNewRef.current(data.payload)
        }
      } catch {
        // ignore
      }
    }

    ws.onerror = () => {
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      if (manualClose.current) return
      reconnectRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      manualClose.current = true
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { connected }
}
