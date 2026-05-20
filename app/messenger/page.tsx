"use client"

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Moon, Sun } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useWebSocket } from "@/hooks/useWebSocket"
import ChatWindow, {
  ChatContact,
  ChatMessage,
} from "@/components/messenger/ChatWindow"

interface Message {
  message_id: number
  conversation_id: number
  sender_id: number
  content: string
  sent_at: string
  is_read: number
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  media: any[]
  is_customer: boolean
  is_link?: boolean
  isUploading?: boolean
}

interface Conversation {
  conversation_id: number
  customer_id: number
  created_at: string
  label: string
  last_updated_at: string
  status: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  last_message: string | null
  last_message_time: string | null
  unread_count: number
}

function extractConversationIdFromResponse(payload: any): number | null {
  const raw =
    payload?.data?.conversation_id ??
    payload?.conversation_id ??
    payload?.data?.conversation?.conversation_id ??
    payload?.data?.items?.[0]?.conversation_id ??
    payload?.data?.[0]?.conversation_id

  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
}

function MessengerContent() {
  const getAuthToken = () =>
    localStorage.getItem('auth_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')

  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const conversationIdRef = useRef<number | null>(null)
  conversationIdRef.current = conversationId
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [recallSelectionMode, setRecallSelectionMode] = useState(false)
  const [selectedRecallMessageIds, setSelectedRecallMessageIds] = useState<number[]>([])
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false)
  const [recallDeleting, setRecallDeleting] = useState(false)
  const orderId = searchParams.get("order_id")
  const shipperId = searchParams.get("shipper_id")
  const shipperName = searchParams.get("shipper_name")
  const isShipperChat = !!shipperId
  const conversationLabel = isShipperChat ? `shipper:${shipperId}:order:${orderId || 0}` : "support"
  const returnToParam = searchParams.get("returnTo")
  const returnHref = returnToParam && returnToParam.startsWith("/") ? returnToParam : "/"

  // WebSocket hook
  const {
    isConnected,
    isConnecting,
    connect,
    joinConversation,
    sendTypingStart,
    sendTypingStop,
    sendMessage: sendMessageViaWebSocket,
  } = useWebSocket({
    onMessage: (message) => {
      console.log('Debug - New message received:', message)
      const activeId = conversationIdRef.current
      if (activeId != null && message?.conversation_id != null && Number(message.conversation_id) !== activeId) {
        return
      }
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(msg => msg.message_id === message.message_id)
        if (exists) return prev
        return [...prev, message]
      })
    },
    onTypingStart: (convId) => {
      console.log('Debug - Typing start for conversation:', convId)
      const activeId = conversationIdRef.current
      if (activeId != null && convId === activeId) {
        setIsTyping(true)
      }
    },
    onTypingStop: (convId) => {
      console.log('Debug - Typing stop for conversation:', convId)
      const activeId = conversationIdRef.current
      if (activeId != null && convId === activeId) {
        setIsTyping(false)
      }
    },
    onConnect: () => {
      console.log('Debug - WebSocket connected')
    },
    onDisconnect: () => {
      console.log('Debug - WebSocket disconnected')
    }
  })

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const token = getAuthToken()
      console.log('Debug - Loading messages for conversation:', convId)

      const response = await fetch(`/api/messenger?action=get_messages&conversation_id=${convId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('Debug - Load messages response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Debug - Load messages data:', data)
        if (data.success) {
          const messagesData = data.data && data.data.items ? data.data.items : data.data
          console.log('Debug - Raw messages data:', messagesData)
          console.log('Debug - First message structure:', messagesData[0])
          setMessages(Array.isArray(messagesData) ? messagesData : [])
          console.log('Debug - Messages loaded:', Array.isArray(messagesData) ? messagesData.length : 0, 'messages')
        }
      } else {
        console.log('Debug - Failed to load messages')
        const errorData = await response.json()
        console.log('Debug - Load messages error:', errorData)
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      toast.error('Failed to load messages')
    }
  }, [])

  const initializeChat = useCallback(async () => {
    console.log('Debug - initializeChat started')
    try {
      setIsLoading(true)
      const token = getAuthToken()
      console.log('Debug - Token:', token ? 'Token exists' : 'No token found')

      if (!token) {
        toast.error('Please login to use messenger')
        return
      }

      let currentUserId = 1
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        currentUserId = payload.user_id
        console.log('Debug - Current user ID from token:', currentUserId)
      } catch (error) {
        console.error('Error decoding token:', error)
        toast.error('Invalid token')
        return
      }

      if (isShipperChat && (!orderId?.trim() || !shipperId?.trim())) {
        console.log('Debug - Shipper chat: waiting for order_id and shipper_id from URL')
        setConversationId(null)
        setMessages([])
        return
      }

      console.log('Debug - Checking for existing conversation for customer:', currentUserId, 'label:', conversationLabel)
      const convQuery = new URLSearchParams({
        action: 'get_conversations',
        customer_id: String(currentUserId),
        label: conversationLabel,
      })
      if (shipperId) convQuery.set('shipper_id', shipperId)
      if (orderId) convQuery.set('order_id', orderId)

      const response = await fetch(`/api/messenger?${convQuery.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('Debug - Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        const existingConversationId = extractConversationIdFromResponse(data)
        if (data?.success && existingConversationId) {
          console.log('Debug - Found existing conversation id:', existingConversationId)
          setConversationId(existingConversationId)
          await loadMessages(existingConversationId)
        } else {
          console.log('Debug - No conversations found, creating new one...')
          const createResponse = await fetch('/api/messenger', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'create_conversation',
              customer_id: currentUserId,
              label: conversationLabel,
              ...(shipperId ? { shipper_id: Number(shipperId) } : {}),
              ...(orderId ? { order_id: Number(orderId) } : {}),
            }),
          })

          const createData = await createResponse.json().catch(() => null)
          const newConversationId = extractConversationIdFromResponse(createData)

          if (createResponse.ok && createData?.success && newConversationId) {
            console.log('Debug - Setting conversationId to (new conversation):', newConversationId)
            setConversationId(newConversationId)
            await loadMessages(newConversationId)
          } else {
            const fallbackMessage = createData?.message || 'Không thể tạo cuộc trò chuyện'
            console.log('Debug - Failed to create conversation', fallbackMessage)
            toast.error(fallbackMessage)
          }
        }
      } else {
        const errorData = await response.json().catch(() => null)
        console.log('Debug - Fetch error:', errorData)
      }
    } catch (error) {
      console.error('❌ Error initializing chat:', error)
      toast.error('Failed to initialize chat')
    } finally {
      setIsLoading(false)
      console.log('Debug - initializeChat finally block completed')
    }
  }, [conversationLabel, orderId, shipperId, isShipperChat, loadMessages])

  useEffect(() => {
    if (isShipperChat && (!orderId?.trim() || !shipperId?.trim())) {
      return
    }

    let cancelled = false
    setMessages([])
    setConversationId(null)

    const run = async () => {
      await initializeChat()
      if (cancelled) return
      const token = getAuthToken()
      if (token) {
        connect(token)
        console.log('Debug - WebSocket connect called')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isShipperChat, orderId, shipperId, conversationLabel, initializeChat, connect])

  // Join conversation when WebSocket connects and conversationId is available
  useEffect(() => {
    console.log('Debug - useEffect triggered - isConnected:', isConnected, 'conversationId:', conversationId)
    if (isConnected && conversationId) {
      console.log('Debug - WebSocket connected, joining conversation:', conversationId)
      joinConversation(conversationId)
      console.log('Debug - Join conversation message sent successfully')
    } else {
      console.log('Debug - Cannot join - isConnected:', isConnected, 'conversationId:', conversationId)
    }
  }, [isConnected, conversationId, joinConversation])

  // Helper functions for link detection and media
  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const isDirectMediaUrl = (url: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    
    const urlLower = url.toLowerCase()
    
    const hasImageExt = imageExtensions.some(ext => urlLower.includes(ext))
    const hasVideoExt = videoExtensions.some(ext => urlLower.includes(ext))
    
    const imageDomains = ['imgur.com', 'i.imgur.com', 'images.unsplash.com', 'picsum.photos', 'via.placeholder.com']
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']
    
    const hasImageDomain = imageDomains.some(domain => urlLower.includes(domain))
    const hasVideoDomain = videoDomains.some(domain => urlLower.includes(domain))
    
    return hasImageExt || hasVideoExt || hasImageDomain || hasVideoDomain
  }

  const getMediaTypeFromUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']
    
    const urlLower = url.toLowerCase()
    const hasVideoExt = videoExtensions.some(ext => urlLower.includes(ext))
    const hasVideoDomain = videoDomains.some(domain => urlLower.includes(domain))
    
    return hasVideoExt || hasVideoDomain ? 'video' : 'image'
  }

  const getDomainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return ''
    }
  }

  // Helper function to determine if a message is from customer
  const isMessageFromCustomer = useMemo(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return (message: Message) => message.is_customer === true
    }
    
    // Get current user ID from token
    const token = getAuthToken()
    if (!token) return (message: Message) => false
    
    try {
      // Decode JWT token to get user_id
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentUserId = payload.user_id
      
      return (message: Message) => {
        // Message is from customer if sender_id matches current user's ID
        return message.sender_id === currentUserId || message.is_customer === true
      }
    } catch (error) {
      console.error('Error decoding token:', error)
      // Fallback to checking is_customer field
      return (message: Message) => message.is_customer === true
    }
  }, [])

  const sendMessage = async (rawContent: string) => {
    console.log('Debug - sendMessage called')
    console.log('Debug - rawContent:', rawContent)
    console.log('Debug - conversationId:', conversationId)
    
    const messageContent = rawContent.trim()
    if (!messageContent || !conversationId) {
      console.log('Debug - Cannot send message - missing content or conversationId')
      return
    }

    // Check if it's a valid URL
    const isValidUrlString = isValidUrl(messageContent)
    const isMediaUrl = isValidUrlString && isDirectMediaUrl(messageContent)
    const mediaType = isMediaUrl ? getMediaTypeFromUrl(messageContent) : null

    // Get current user ID from token
    const token = getAuthToken()
    let currentUserId = 1 // fallback
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        currentUserId = payload.user_id
      } catch (error) {
        console.error('Error decoding token for optimistic message:', error)
      }
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      message_id: Date.now(),
      conversation_id: conversationId,
      sender_id: currentUserId, // Use actual customer ID
      content: messageContent,
      sent_at: new Date().toISOString(),
      is_read: 0,
      first_name: 'You',
      last_name: '',
      email: '',
      avatar_url: null,
      media: isMediaUrl ? [{
        media_id: Date.now(),
        url: messageContent,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        file_name: 'Link media'
      }] : [],
      is_customer: true,
      is_link: isValidUrlString
    }

    setMessages(prev => [...prev, optimisticMessage])

         try {
       const token = getAuthToken()
       console.log('Debug - Sending message to conversation:', conversationId)
      console.log('Debug - Message content:', messageContent)
      
      const requestBody = {
        content: messageContent,
        media: isMediaUrl ? [{
          name: 'Link media',
          type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          size: 0,
          url: messageContent,
          public_id: null
        }] : undefined,
        is_link: isValidUrlString
      }
      
      console.log('Debug - Request body:', requestBody)
      
             const response = await fetch(`/api/messenger`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           action: 'send_message',
           ...requestBody,
           conversation_id: conversationId
         })
       })
      
      console.log('Debug - Send message response status:', response.status)

             if (response.ok) {
        const data = await response.json()
        console.log('Debug - Send message response data:', data)
        const savedMessage =
          data?.data ??
          (data as Record<string, unknown>).message ??
          null
        console.log('Debug - Normalized savedMessage for WS:', savedMessage)
        if (data.success && savedMessage && conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === optimisticMessage.message_id ? savedMessage : msg
            )
          )
          // Luôn gọi — hook chỉ gửi khi socket OPEN (tránh stale isConnected sau await)
          sendMessageViaWebSocket(savedMessage, conversationId)
        }
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
      toast.error('Failed to send message')
    }
  }

  const uploadMedia = async (file: File) => {
    if (!conversationId) return

    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const content = isVideo ? '[Video]' : isAudio ? '' : '[Image]'

    // Get current user ID from token
    const token = getAuthToken()
    let currentUserId = 1 // fallback
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        currentUserId = payload.user_id
      } catch (error) {
        console.error('Error decoding token for media upload:', error)
      }
    }

    const optimisticMessage: Message = {
      message_id: Date.now(),
      conversation_id: conversationId,
      sender_id: currentUserId, // Use actual customer ID
      content: content,
      sent_at: new Date().toISOString(),
      is_read: 0,
      first_name: 'You',
      last_name: '',
      email: '',
      avatar_url: null,
      media: [{
        media_id: Date.now(),
        url: URL.createObjectURL(file),
        type: file.type,
        file_name: file.name
      }],
      is_customer: true,
      isUploading: true
    }

    setMessages(prev => [...prev, optimisticMessage])

    const formData = new FormData()
    formData.append('media', file)
    
    console.log('Debug - Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type)
    console.log('Debug - FormData entries:')
    for (let [key, value] of formData.entries()) {
      console.log('Debug -', key, ':', value)
    }

         try {
       const token = getAuthToken()
       if (!token) {
        toast.error('Please login to upload media')
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        return
      }
      
             const response = await fetch(`/api/messenger`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`
         },
         body: formData
       })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
                     const messageResponse = await fetch(`/api/messenger`, {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
             },
             body: JSON.stringify({
               action: 'send_message',
               conversation_id: conversationId,
               content: content,
               media: [{
                 name: file.name,
                 type: file.type,
                 size: file.size,
                 url: data.data.url,
                 public_id: data.data.public_id
               }]
             })
           })

          if (messageResponse.ok) {
            const messageData = await messageResponse.json()
            const saved = messageData.data
            if (saved) {
              setMessages(prev => {
                const updated = prev.map(msg => 
                  msg.message_id === optimisticMessage.message_id 
                    ? { ...saved, isUploading: false }
                    : msg
                )
                return updated
              })
              if (conversationId && messageData.success !== false) {
                sendMessageViaWebSocket(saved, conversationId)
              }
            }
          } else {
            setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
            toast.error('Failed to send media message')
          }
        } else {
          setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
          toast.error('Failed to upload media: ' + (data.message || 'Unknown error'))
        }
      } else {
        const errorData = await response.json()
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        toast.error('Upload failed: ' + (errorData.message || 'Unknown error'))
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
      toast.error('Failed to upload media')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Build data for new chat UI - MUST be called BEFORE any early return
  const contact: ChatContact = useMemo(() => {
    const otherMessage = messages.find((m) => !isMessageFromCustomer(m))
    const shipperDisplayName =
      (shipperName && shipperName.trim()) || (shipperId ? `Shipper #${shipperId}` : "")
    const name =
      shipperDisplayName ||
      (otherMessage
        ? `${otherMessage.first_name || ""} ${otherMessage.last_name || ""}`.trim()
        : "") || "Customer Support"

    return {
      id: conversationId ?? "support",
      name,
      avatar:
        shipperDisplayName
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(shipperDisplayName)}&background=0D8ABC&color=fff`
          : (
        otherMessage?.avatar_url ||
        "https://ui-avatars.com/api/?name=CS&background=0D8ABC&color=fff"),
      online: isConnected,
    }
  }, [messages, conversationId, isConnected, isMessageFromCustomer, shipperId, shipperName])

  const chatMessages: ChatMessage[] = useMemo(
    () => {
      console.log('Debug - Mapping messages to chatMessages. Total messages:', messages.length)
      const mapped = messages.map((message) => {
        const isMine = isMessageFromCustomer(message)
        const firstMedia = message.media && message.media.length > 0 ? message.media[0] : null
        
        // Improved media URL detection - check type first, then URL extension
        let imageUrl: string | undefined = undefined
        let videoUrl: string | undefined = undefined
        let audioUrl: string | undefined = undefined
        
        if (firstMedia && firstMedia.url) {
          const mediaType = firstMedia.type || ''
          const mediaUrl = firstMedia.url
          const voiceLikeUrl = /voice-message|voice_message/i.test(mediaUrl)
          const voiceLikeContent = message.content === "[Voice Message]"

          // Check by MIME type first
          if (mediaType.startsWith("image/")) {
            imageUrl = mediaUrl
          } else if (mediaType.startsWith("video/")) {
            // Ghi âm gửi lên thường là .webm (MediaRecorder) nhưng CDN/API có thể gắn video/webm
            if (voiceLikeUrl || voiceLikeContent) {
              audioUrl = mediaUrl
            } else {
              videoUrl = mediaUrl
            }
          } else if (mediaType.startsWith("audio/")) {
            audioUrl = mediaUrl
          }
          // Fallback: check by file extension if no type
          else if (typeof mediaUrl === 'string') {
            const urlLower = mediaUrl.toLowerCase()
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
            // Không đưa .webm vào video: tin thoại là voice-message.webm → tránh render <video> cao 150px
            const videoExtensions = ['.mp4', '.ogg', '.mov', '.avi', '.mkv']
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm']

            if (imageExtensions.some(ext => urlLower.includes(ext))) {
              imageUrl = mediaUrl
            } else if (voiceLikeUrl || voiceLikeContent) {
              audioUrl = mediaUrl
            } else if (videoExtensions.some(ext => urlLower.includes(ext))) {
              videoUrl = mediaUrl
            } else if (audioExtensions.some(ext => urlLower.includes(ext))) {
              audioUrl = mediaUrl
            }
          }
        }

        // Show text if it exists and is not a placeholder
        const text = message.content &&
          message.content !== "[Image]" &&
          message.content !== "[Video]" &&
          message.content !== "[Voice Message]" &&
          message.content.trim() !== ""
          ? message.content
          : undefined

        const chatMsg = {
          id: message.message_id,
          senderId: message.sender_id,
          text,
          image: imageUrl,
          video: videoUrl,
          audio: audioUrl,
          timestamp: formatTime(message.sent_at),
          isMine,
        }
        
        console.log('Debug - Mapped message:', {
          id: chatMsg.id,
          text: chatMsg.text?.substring(0, 50),
          image: chatMsg.image ? `has image: ${chatMsg.image.substring(0, 50)}...` : 'no image',
          video: chatMsg.video ? `has video: ${chatMsg.video.substring(0, 50)}...` : 'no video',
          audio: chatMsg.audio ? `has audio: ${chatMsg.audio.substring(0, 50)}...` : 'no audio',
          media: firstMedia ? {
            type: firstMedia.type,
            url: firstMedia.url ? firstMedia.url.substring(0, 50) + '...' : 'no url',
            hasType: !!firstMedia.type,
            hasUrl: !!firstMedia.url
          } : 'no media',
          isMine: chatMsg.isMine,
          timestamp: chatMsg.timestamp
        })
        
        return chatMsg
      })
      
      console.log('Debug - Final chatMessages count:', mapped.length)
      return mapped
    },
    [messages, isMessageFromCustomer]
  )

  // Early return AFTER all hooks have been called
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat...</p>
        </div>
      </div>
    )
  }

  const handleSendFromUI = (text: string) => {
    if (!conversationId) {
      toast.error("Đang kết nối cuộc trò chuyện, vui lòng thử lại sau.")
      return
    }
    sendMessage(text)
  }

  const handleTypingStartFromUI = () => {
    if (!conversationId || !isConnected) return
    sendTypingStart(conversationId)
  }

  const handleTypingStopFromUI = () => {
    if (!conversationId || !isConnected) return
    sendTypingStop(conversationId)
  }

  const recallMessageOnServer = async (messageId: number, quiet?: boolean) => {
      const token = getAuthToken()
    if (!token) {
      if (!quiet) toast.error('Vui lòng đăng nhập để thu hồi tin nhắn')
      return false
    }
    const response = await fetch('/api/messenger', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'recall_message',
        message_id: messageId,
        conversation_id: conversationId,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok && data.success) {
      setMessages((prev) => prev.filter((msg) => msg.message_id !== messageId))
      return true
    }
    if (!quiet) toast.error(data.message || 'Không thu hồi được tin nhắn')
    return false
  }

  const handleEnterRecallSelectionMode = () => {
    setRecallSelectionMode(true)
    setSelectedRecallMessageIds([])
  }

  const handleToggleRecallSelect = (messageId: string | number) => {
    const id = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId
    if (Number.isNaN(id)) return
    setSelectedRecallMessageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleRecallSelectAllMine = () => {
    const fn = isMessageFromCustomer
    const ids = messages.filter((m) => fn(m)).map((m) => m.message_id)
    setSelectedRecallMessageIds(ids)
  }

  const handleRecallDeselectAll = () => setSelectedRecallMessageIds([])

  const handleCancelRecallSelection = () => {
    setRecallSelectionMode(false)
    setSelectedRecallMessageIds([])
  }

  const handleConfirmRecallSelected = () => {
    if (selectedRecallMessageIds.length === 0) {
      toast.error('Chọn ít nhất một tin nhắn')
      return
    }
    setRecallConfirmOpen(true)
  }

  const executeRecallSelected = async () => {
    const ids = [...selectedRecallMessageIds]
    if (ids.length === 0) {
      setRecallConfirmOpen(false)
      return
    }
    setRecallDeleting(true)
    let ok = 0
    try {
      for (const mid of ids) {
        if (await recallMessageOnServer(mid, true)) ok += 1
      }
      const total = ids.length
      if (ok === total) {
        toast.success(
          ok === 1 ? 'Thu hồi được 1 tin nhắn' : `Thu hồi được ${ok} tin nhắn`
        )
      } else if (ok > 0) {
        toast.warning(`Thu hồi được ${ok}/${total} tin — một số tin không thể thu hồi`)
      } else {
        toast.error('Không thu hồi được tin nhắn nào')
      }
    } finally {
      setRecallDeleting(false)
      setRecallConfirmOpen(false)
      setRecallSelectionMode(false)
      setSelectedRecallMessageIds([])
    }
  }

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    if (!conversationId) return

    try {
      // Create a file from the blob
      const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' })
      
      const formData = new FormData()
      formData.append('media', audioFile)
      
      const token = getAuthToken()
      if (!token) {
        toast.error('Please login to send voice message')
        return
      }

      const response = await fetch('/api/messenger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Send message with audio media
          const messageResponse = await fetch('/api/messenger', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'send_message',
              conversation_id: conversationId,
              content: '',
              media: [{
                name: 'voice-message.webm',
                type: 'audio/webm',
                size: audioBlob.size,
                url: data.data.url,
                public_id: data.data.public_id
              }]
            })
          })

          if (messageResponse.ok) {
            const messageData = await messageResponse.json()
            if (messageData.success) {
              setMessages(prev => [...prev, messageData.data])
            } else {
              toast.error(messageData.message || 'Failed to send voice message')
            }
          } else {
            toast.error('Failed to send voice message')
          }
        } else {
          toast.error(data.message || 'Failed to upload voice message')
        }
      } else {
        toast.error('Failed to upload voice message')
      }
    } catch (error) {
      console.error('Voice message error:', error)
      toast.error('Failed to send voice message')
    }
  }

                                  return (
    <div
      className={`flex justify-center items-stretch sm:items-center min-h-[100dvh] min-h-screen py-0 px-0 sm:py-4 sm:px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
    >
      <div
        className={`w-full max-w-none sm:max-w-5xl h-[100dvh] max-h-[100dvh] sm:h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-3rem)] shadow-none sm:shadow-xl flex flex-col rounded-none sm:rounded-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
      >
        {/* Back Header */}
        <div
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b shrink-0 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} pt-[max(0.5rem,env(safe-area-inset-top))]`}
        >
          <Link
            href={returnHref}
            className={`p-2 rounded-full transition-colors shrink-0 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </Link>
          <span
            className={`text-sm font-medium truncate min-w-0 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
          >
            <span className="sm:hidden">Quay lại</span>
            <span className="hidden sm:inline">Quay lại trang trước</span>
            {orderId ? ` • Đơn #${orderId}` : ""}
            {shipperId ? ` • Chat với shipper` : ""}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border ${
                isDarkMode 
                  ? "bg-gray-700 border-gray-600" 
                  : "bg-gray-300 border-gray-400"
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform border ${
                  isDarkMode ? "translate-x-6 border-gray-500" : "translate-x-1 border-gray-300"
                }`}
              >
                {isDarkMode ? (
                  <Moon className="h-full w-full p-0.5 text-gray-200" />
                ) : (
                  <Sun className="h-full w-full p-0.5 text-yellow-600" />
                )}
              </span>
            </button>
          </div>
                                </div>

        {/* New Chat Window UI */}
        <div className="flex-1 min-h-0">
          <ChatWindow
            contact={contact}
            messages={chatMessages}
            onSendMessage={handleSendFromUI}
            onTypingStart={handleTypingStartFromUI}
            onTypingStop={handleTypingStopFromUI}
            onUploadMedia={uploadMedia}
            onVoiceRecordingComplete={handleVoiceRecordingComplete}
            isConnected={isConnected}
            isDarkMode={isDarkMode}
            recallSelectionMode={recallSelectionMode}
            selectedRecallMessageIds={selectedRecallMessageIds}
            onEnterRecallSelectionMode={handleEnterRecallSelectionMode}
            onToggleRecallSelect={handleToggleRecallSelect}
            onRecallSelectAllMine={handleRecallSelectAllMine}
            onRecallDeselectAll={handleRecallDeselectAll}
            onCancelRecallSelection={handleCancelRecallSelection}
            onConfirmRecallSelected={handleConfirmRecallSelected}
            isTyping={isTyping}
          />
        </div>
      </div>

      {recallConfirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!recallDeleting) setRecallConfirmOpen(false)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="messenger-recall-title"
            aria-describedby="messenger-recall-desc"
            className={`w-full max-w-md rounded-2xl p-5 shadow-2xl ring-1 ${
              isDarkMode
                ? "bg-gray-800 text-gray-100 ring-white/10"
                : "bg-white text-gray-900 ring-black/5"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  isDarkMode ? "bg-red-500/20" : "bg-red-50"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="messenger-recall-title" className="text-lg font-semibold tracking-tight">
                  Xác nhận thu hồi
                </h3>
                <p
                  id="messenger-recall-desc"
                  className={`mt-2 text-sm leading-relaxed ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {selectedRecallMessageIds.length === 1 ? (
                    <>
                      Thu hồi tin nhắn đã chọn?{" "}
                      <span className="font-medium text-inherit">Người nhận sẽ không còn thấy tin này.</span>
                    </>
                  ) : (
                    <>
                      Thu hồi{" "}
                      <span className="font-semibold text-inherit">{selectedRecallMessageIds.length}</span> tin nhắn
                      đã chọn?{" "}
                      <span className="font-medium text-inherit">
                        Người nhận sẽ không còn thấy các tin này.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={recallDeleting}
                onClick={() => setRecallConfirmOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  isDarkMode
                    ? "border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10"
                    : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                }`}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={recallDeleting}
                onClick={() => void executeRecallSelected()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {recallDeleting ? "Đang thu hồi…" : "Thu hồi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MessengerPage() {
  return (
    <Suspense>
      <MessengerContent />
    </Suspense>
  )
}
