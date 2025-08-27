import { useState, useEffect, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  conversation_id?: number
  message?: any
  token?: string
}

interface UseWebSocketProps {
  onMessage?: (data: any) => void
  onTypingStart?: (conversationId: number) => void
  onTypingStop?: (conversationId: number) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export const useWebSocket = ({
  onMessage,
  onTypingStart,
  onTypingStop,
  onConnect,
  onDisconnect
}: UseWebSocketProps = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({
    onMessage,
    onTypingStart,
    onTypingStop,
    onConnect,
    onDisconnect
  })
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onTypingStart,
      onTypingStop,
      onConnect,
      onDisconnect
    }
  }, [onMessage, onTypingStart, onTypingStop, onConnect, onDisconnect])

  const connect = useCallback((token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    setIsConnecting(true)
    console.log('🔍 Debug - Connecting to WebSocket...')

          try {
        const ws = new WebSocket('ws://localhost:3001')
      
      ws.onopen = () => {
        console.log('🔍 Debug - WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        callbacksRef.current.onConnect?.()

        // Authenticate immediately after connection
        ws.send(JSON.stringify({
          event: 'auth',
          payload: {
            token: token
          }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('🔍 Debug - WebSocket message received:', data)

          switch (data.event) {
            case 'new_message':
              callbacksRef.current.onMessage?.(data.payload.message)
              break
            case 'typing_indicator':
              if (data.payload.type === 'typing_start') {
                callbacksRef.current.onTypingStart?.(data.payload.conversation_id)
              } else if (data.payload.type === 'typing_stop') {
                callbacksRef.current.onTypingStop?.(data.payload.conversation_id)
              }
              break
            default:
              console.log('Unknown event:', data.event)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('🔍 Debug - WebSocket error:', error)
        setIsConnected(false)
        setIsConnecting(false)
      }

      ws.onclose = () => {
        console.log('🔍 Debug - WebSocket disconnected')
        setIsConnected(false)
        setIsConnecting(false)
        callbacksRef.current.onDisconnect?.()

        // Auto reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔍 Debug - Attempting to reconnect...')
          connect(token)
        }, 3000)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('🔍 Debug - Failed to create WebSocket:', error)
      setIsConnecting(false)
    }
  }, []) // Remove all dependencies to prevent infinite re-renders

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  const joinConversation = useCallback((conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 Debug - Joining conversation:', conversationId)
      wsRef.current.send(JSON.stringify({
        event: 'join_conversation',
        payload: {
          conversation_id: conversationId
        }
      }))
    } else {
      console.log('🔍 Debug - Cannot join conversation - WebSocket not connected')
    }
  }, [])

  const leaveConversation = useCallback((conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 Debug - Leaving conversation:', conversationId)
      wsRef.current.send(JSON.stringify({
        event: 'leave_conversation',
        payload: {
          conversation_id: conversationId
        }
      }))
    }
  }, [])

  const sendTypingStart = useCallback((conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 Debug - Sending typing start for conversation:', conversationId)
      wsRef.current.send(JSON.stringify({
        event: 'typing_start',
        payload: {
          conversation_id: conversationId
        }
      }))
    }
  }, [])

  const sendTypingStop = useCallback((conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 Debug - Sending typing stop for conversation:', conversationId)
      wsRef.current.send(JSON.stringify({
        event: 'typing_stop',
        payload: {
          conversation_id: conversationId
        }
      }))
    }
  }, [])

  const sendMessage = useCallback((message: any, conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 Debug - Sending message via WebSocket:', message, 'for conversation:', conversationId)
      wsRef.current.send(JSON.stringify({
        event: 'new_message',
        payload: {
          message: message,
          conversation_id: conversationId
        }
      }))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, []) // Remove disconnect dependency

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    sendMessage
  }
}
