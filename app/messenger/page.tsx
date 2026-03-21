"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Moon, Sun } from "lucide-react"
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

export default function MessengerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

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
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(msg => msg.message_id === message.message_id)
        if (exists) return prev
        return [...prev, message]
      })
    },
    onTypingStart: (convId) => {
      console.log('Debug - Typing start for conversation:', convId)
      if (conversationId && convId === conversationId) {
        setIsTyping(true)
      }
    },
    onTypingStop: (convId) => {
      console.log('Debug - Typing stop for conversation:', convId)
      if (conversationId && convId === conversationId) {
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

  useEffect(() => {
    console.log('Debug - useEffect started - calling initializeChat and connectWebSocket')
    const init = async () => {
      console.log('Debug - Starting initialization...')
      await initializeChat()
      console.log('Debug - initializeChat completed')
      
      // Connect WebSocket after chat initialization
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
      if (token) {
        connect(token)
        console.log('Debug - WebSocket connect called')
      }
    }
    init()
  }, []) // Remove connect from dependencies to prevent infinite loop

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


  const initializeChat = async () => {
    console.log('Debug - initializeChat started')
    try {
      setIsLoading(true)
             const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
       console.log('Debug - Token:', token ? 'Token exists' : 'No token found')
       console.log('Debug - Token length:', token ? token.length : 0)
       console.log('Debug - Token preview:', token ? token.substring(0, 20) + '...' : 'No token')
       console.log('Debug - All localStorage keys:', Object.keys(localStorage))
      
             if (!token) {
         toast.error('Please login to use messenger')
         return
       }

       // Get current user ID from token
       let currentUserId = 1 // fallback
       try {
         const payload = JSON.parse(atob(token.split('.')[1]))
         currentUserId = payload.user_id
         console.log('Debug - Current user ID from token:', currentUserId)
       } catch (error) {
         console.error('Error decoding token:', error)
         toast.error('Invalid token')
         return
       }

                       // First, try to find existing conversation for this customer
         console.log('Debug - Checking for existing conversation for customer:', currentUserId)
        const response = await fetch(`/api/messenger?action=get_conversations&customer_id=${currentUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

      console.log('Debug - Response status:', response.status)
      console.log('Debug - Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('Debug - Response data:', data)
        
        if (data.success && data.data && data.data.items && data.data.items.length > 0) {
          console.log('Debug - Found existing conversation:', data.data.items[0])
          const existingConversationId = data.data.items[0].conversation_id
          console.log('Debug - Setting conversationId to:', existingConversationId)
          setConversationId(existingConversationId)
          
          // Note: WebSocket join will be handled by useEffect when ws connects
          loadMessages(existingConversationId)
        } else if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log('Debug - Found existing conversation (array format):', data.data[0])
          const existingConversationId = data.data[0].conversation_id
          console.log('Debug - Setting conversationId to (array format):', existingConversationId)
          setConversationId(existingConversationId)
          
          // Note: WebSocket join will be handled by useEffect when ws connects
          loadMessages(existingConversationId)
        } else {
          console.log('Debug - No conversations found, creating new one...')
                     // Create new conversation
           const createResponse = await fetch('/api/messenger', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
             },
             body: JSON.stringify({
               action: 'create_conversation',
               customer_id: currentUserId
             })
           })

          console.log('Debug - Create response status:', createResponse.status)
          
          if (createResponse.ok) {
            const createData = await createResponse.json()
            console.log('Debug - Created conversation:', createData)
            const newConversationId = createData.data.conversation_id
            console.log('Debug - Setting conversationId to (new conversation):', newConversationId)
            setConversationId(newConversationId)
            
            // Note: WebSocket join will be handled by useEffect when ws connects
          } else {
            console.log('Debug - Failed to create conversation')
            const errorData = await createResponse.json()
            console.log('Debug - Create error:', errorData)
          }
        }
      } else {
        console.log('Debug - Failed to fetch conversations')
        const errorData = await response.json()
        console.log('Debug - Fetch error:', errorData)
      }
    } catch (error) {
      console.error('❌ Error initializing chat:', error)
      console.log('Debug - Error details:', error)
      toast.error('Failed to initialize chat')
         } finally {
       setIsLoading(false)
       console.log('Debug - initializeChat finally block completed')
     }
     console.log('Debug - initializeChat function completed')
   }



  const loadMessages = async (convId: number) => {
         try {
       const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
       console.log('Debug - Loading messages for conversation:', convId)
      
             const response = await fetch(`/api/messenger?action=get_messages&conversation_id=${convId}`, {
         headers: {
           'Authorization': `Bearer ${token}`
         }
       })

      console.log('Debug - Load messages response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Debug - Load messages data:', data)
        if (data.success) {
          const messagesData = data.data && data.data.items ? data.data.items : data.data
          console.log('Debug - Raw messages data:', messagesData)
          console.log('Debug - First message structure:', messagesData[0])
          setMessages(messagesData)
          console.log('Debug - Messages loaded:', messagesData.length, 'messages')
          
          // Note: WebSocket join will be handled by useEffect when ws connects
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
  }

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
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
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
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
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
       const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
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
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
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
       const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
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
    const name =
      (otherMessage
        ? `${otherMessage.first_name || ""} ${otherMessage.last_name || ""}`.trim()
        : "") || "Customer Support"

    return {
      id: conversationId ?? "support",
      name,
      avatar:
        otherMessage?.avatar_url ||
        "https://ui-avatars.com/api/?name=CS&background=0D8ABC&color=fff",
      online: isConnected,
    }
  }, [messages, conversationId, isConnected, isMessageFromCustomer])

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
          
          // Check by MIME type first
          if (mediaType.startsWith("image/")) {
            imageUrl = mediaUrl
          } else if (mediaType.startsWith("video/")) {
            videoUrl = mediaUrl
          } else if (mediaType.startsWith("audio/")) {
            audioUrl = mediaUrl
          }
          // Fallback: check by file extension if no type
          else if (typeof mediaUrl === 'string') {
            const urlLower = mediaUrl.toLowerCase()
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm']
            
            if (imageExtensions.some(ext => urlLower.includes(ext))) {
              imageUrl = mediaUrl
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
      <div className="flex items-center justify-center h-screen">
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

  const handleRecallMessage = async (messageId: string | number) => {
    if (!conversationId) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to recall message');
        return;
      }

      const response = await fetch('/api/messenger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'recall_message',
          message_id: messageId,
          conversation_id: conversationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove message from local state
          setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
          toast.success('Tin nhắn đã được thu hồi');
        } else {
          toast.error(data.message || 'Failed to recall message');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to recall message');
      }
    } catch (error) {
      console.error('Recall message error:', error);
      toast.error('Failed to recall message');
    }
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    if (!conversationId) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to delete message');
        return;
      }

      const response = await fetch('/api/messenger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete_message',
          message_id: messageId,
          conversation_id: conversationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove message from local state (only for sender)
          setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
          toast.success('Tin nhắn đã được xóa');
        } else {
          toast.error(data.message || 'Failed to delete message');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    if (!conversationId) return

    try {
      // Create a file from the blob
      const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' })
      
      const formData = new FormData()
      formData.append('media', audioFile)
      
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
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
    <div className={`flex justify-center items-center min-h-screen py-4 px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`w-full max-w-5xl h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] shadow-xl flex flex-col rounded-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Back Header */}
        <div className={`flex items-center gap-2 px-4 py-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <Link
            href="/"
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </Link>
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Quay lại trang chủ
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
            onRecallMessage={handleRecallMessage}
            onDeleteMessage={handleDeleteMessage}
            isTyping={isTyping}
          />
        </div>
      </div>
    </div>
  )
}
