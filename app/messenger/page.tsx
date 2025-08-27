"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Paperclip, Image as ImageIcon, Video, MessageCircle, User, ArrowLeft, Mic, Smile } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import EmojiPicker from 'emoji-picker-react'
import { useWebSocket } from "@/hooks/useWebSocket"


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
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [activeTab, setActiveTab] = useState('media')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebSocket hook
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop
  } = useWebSocket({
    onMessage: (message) => {
      console.log('🔍 Debug - New message received:', message)
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(msg => msg.message_id === message.message_id)
        if (exists) return prev
        return [...prev, message]
      })
    },
    onTypingStart: (conversationId) => {
      console.log('🔍 Debug - Typing start for conversation:', conversationId)
      setIsTyping(true)
    },
    onTypingStop: (conversationId) => {
      console.log('🔍 Debug - Typing stop for conversation:', conversationId)
      setIsTyping(false)
    },
    onConnect: () => {
      console.log('🔍 Debug - WebSocket connected')
      toast.success('Connected to chat server')
    },
    onDisconnect: () => {
      console.log('🔍 Debug - WebSocket disconnected')
      toast.error('Disconnected from chat server')
    }
  })

  useEffect(() => {
    console.log('🔍 Debug - useEffect started - calling initializeChat and connectWebSocket')
    const init = async () => {
      console.log('🔍 Debug - Starting initialization...')
      await initializeChat()
      console.log('🔍 Debug - initializeChat completed')
      
      // Connect WebSocket after chat initialization
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
      if (token) {
        connect(token)
        console.log('🔍 Debug - WebSocket connect called')
      }
    }
    init()
  }, []) // Remove connect from dependencies to prevent infinite loop

  // Join conversation when WebSocket connects and conversationId is available
  useEffect(() => {
    console.log('🔍 Debug - useEffect triggered - isConnected:', isConnected, 'conversationId:', conversationId)
    if (isConnected && conversationId) {
      console.log('🔍 Debug - WebSocket connected, joining conversation:', conversationId)
      joinConversation(conversationId)
      console.log('🔍 Debug - Join conversation message sent successfully')
    } else {
      console.log('🔍 Debug - Cannot join - isConnected:', isConnected, 'conversationId:', conversationId)
    }
  }, [isConnected, conversationId, joinConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
    }
  }, [typingTimeout])

  const initializeChat = async () => {
    console.log('🔍 Debug - initializeChat started')
    try {
      setIsLoading(true)
             const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
       console.log('🔍 Debug - Token:', token ? 'Token exists' : 'No token found')
       console.log('🔍 Debug - Token length:', token ? token.length : 0)
       console.log('🔍 Debug - Token preview:', token ? token.substring(0, 20) + '...' : 'No token')
       console.log('🔍 Debug - All localStorage keys:', Object.keys(localStorage))
      
             if (!token) {
         toast.error('Please login to use messenger')
         return
       }

       // Get current user ID from token
       let currentUserId = 1 // fallback
       try {
         const payload = JSON.parse(atob(token.split('.')[1]))
         currentUserId = payload.user_id
         console.log('🔍 Debug - Current user ID from token:', currentUserId)
       } catch (error) {
         console.error('Error decoding token:', error)
         toast.error('Invalid token')
         return
       }

                       // First, try to find existing conversation for this customer
         console.log('🔍 Debug - Checking for existing conversation for customer:', currentUserId)
        const response = await fetch(`/api/messenger?action=get_conversations&customer_id=${currentUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

      console.log('🔍 Debug - Response status:', response.status)
      console.log('🔍 Debug - Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Debug - Response data:', data)
        
        if (data.success && data.data && data.data.items && data.data.items.length > 0) {
          console.log('🔍 Debug - Found existing conversation:', data.data.items[0])
          const existingConversationId = data.data.items[0].conversation_id
          console.log('🔍 Debug - Setting conversationId to:', existingConversationId)
          setConversationId(existingConversationId)
          
          // Note: WebSocket join will be handled by useEffect when ws connects
          loadMessages(existingConversationId)
        } else if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log('🔍 Debug - Found existing conversation (array format):', data.data[0])
          const existingConversationId = data.data[0].conversation_id
          console.log('🔍 Debug - Setting conversationId to (array format):', existingConversationId)
          setConversationId(existingConversationId)
          
          // Note: WebSocket join will be handled by useEffect when ws connects
          loadMessages(existingConversationId)
        } else {
          console.log('🔍 Debug - No conversations found, creating new one...')
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

          console.log('🔍 Debug - Create response status:', createResponse.status)
          
          if (createResponse.ok) {
            const createData = await createResponse.json()
            console.log('🔍 Debug - Created conversation:', createData)
            const newConversationId = createData.data.conversation_id
            console.log('🔍 Debug - Setting conversationId to (new conversation):', newConversationId)
            setConversationId(newConversationId)
            
            // Note: WebSocket join will be handled by useEffect when ws connects
          } else {
            console.log('🔍 Debug - Failed to create conversation')
            const errorData = await createResponse.json()
            console.log('🔍 Debug - Create error:', errorData)
          }
        }
      } else {
        console.log('🔍 Debug - Failed to fetch conversations')
        const errorData = await response.json()
        console.log('🔍 Debug - Fetch error:', errorData)
      }
    } catch (error) {
      console.error('❌ Error initializing chat:', error)
      console.log('🔍 Debug - Error details:', error)
      toast.error('Failed to initialize chat')
         } finally {
       setIsLoading(false)
       console.log('🔍 Debug - initializeChat finally block completed')
     }
     console.log('🔍 Debug - initializeChat function completed')
   }



  const loadMessages = async (convId: number) => {
         try {
       const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
       console.log('🔍 Debug - Loading messages for conversation:', convId)
      
             const response = await fetch(`/api/messenger?action=get_messages&conversation_id=${convId}`, {
         headers: {
           'Authorization': `Bearer ${token}`
         }
       })

      console.log('🔍 Debug - Load messages response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Debug - Load messages data:', data)
        if (data.success) {
          const messagesData = data.data && data.data.items ? data.data.items : data.data
          console.log('🔍 Debug - Raw messages data:', messagesData)
          console.log('🔍 Debug - First message structure:', messagesData[0])
          setMessages(messagesData)
          console.log('🔍 Debug - Messages loaded:', messagesData.length, 'messages')
          
          // Note: WebSocket join will be handled by useEffect when ws connects
        }
      } else {
        console.log('🔍 Debug - Failed to load messages')
        const errorData = await response.json()
        console.log('🔍 Debug - Load messages error:', errorData)
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

  const sendMessage = async () => {
    console.log('🔍 Debug - sendMessage called')
    console.log('🔍 Debug - newMessage:', newMessage)
    console.log('🔍 Debug - conversationId:', conversationId)
    
    if (!newMessage.trim() || !conversationId) {
      console.log('🔍 Debug - Cannot send message - missing content or conversationId')
      return
    }

    const messageContent = newMessage.trim()
    setNewMessage("")

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
       console.log('🔍 Debug - Sending message to conversation:', conversationId)
      console.log('🔍 Debug - Message content:', messageContent)
      
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
      
      console.log('🔍 Debug - Request body:', requestBody)
      
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
      
      console.log('🔍 Debug - Send message response status:', response.status)

             if (response.ok) {
         const data = await response.json()
         console.log('🔍 Debug - Send message response data:', data)
         console.log('🔍 Debug - Response message structure:', data.data)
                if (data.success) {
         setMessages(prev => {
           const updated = prev.map(msg => 
             msg.message_id === optimisticMessage.message_id 
               ? data.data 
               : msg
           )
           return updated
         })
         
         // Message will be sent via WebSocket automatically by backend
         console.log('🔍 Debug - Message sent successfully, backend will broadcast via WebSocket')
       }
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        setNewMessage(messageContent)
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
      setNewMessage(messageContent)
      toast.error('Failed to send message')
    }
  }

  const uploadMedia = async (file: File) => {
    if (!conversationId) return

    const isVideo = file.type.startsWith('video/')
    const content = isVideo ? '[Video]' : '[Image]'

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
    
    console.log('🔍 Debug - Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type)
    console.log('🔍 Debug - FormData entries:')
    for (let [key, value] of formData.entries()) {
      console.log('🔍 Debug -', key, ':', value)
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
            setMessages(prev => {
              const updated = prev.map(msg => 
                msg.message_id === optimisticMessage.message_id 
                  ? { ...messageData.data, isUploading: false }
                  : msg
              )
              return updated
            })
            toast.success('Media sent successfully')
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    const shouldShow = !isNearBottom && scrollHeight > clientHeight
    setShowScrollToBottom(shouldShow)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
  }

     // Handle typing indicator
   const handleTyping = () => {
     console.log('🔍 Debug - handleTyping called')
     console.log('🔍 Debug - WebSocket connected:', isConnected)
     console.log('🔍 Debug - Conversation ID:', conversationId)
     
     // Send typing start
     if (isConnected && conversationId) {
       console.log('🔍 Debug - Sending typing_start event')
       sendTypingStart(conversationId)
     } else {
       console.log('🔍 Debug - Cannot send typing_start - WebSocket not connected or no conversation')
     }

     // Clear existing timeout
     if (typingTimeout) {
       clearTimeout(typingTimeout)
     }

     // Set new timeout to stop typing indicator
     const timeout = setTimeout(() => {
       if (isConnected && conversationId) {
         console.log('🔍 Debug - Sending typing_stop event')
         sendTypingStop(conversationId)
       }
     }, 2000) // Stop typing indicator after 2 seconds of no input

     setTypingTimeout(timeout)
   }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadMedia(file)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // TODO: Implement file upload to server
      console.log('File selected:', file)
      toast.info('File upload feature coming soon!')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center min-h-screen bg-gray-50">
      <div className="relative h-screen w-full max-w-4xl bg-white shadow-lg">
        {/* Main Chat Area - Fixed width */}
        <div className="flex flex-col h-screen w-full max-w-4xl">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </Link>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                                 <div>
                   <h1 className="text-sm font-semibold text-gray-900">Customer Support</h1>
                   <p className="text-xs text-gray-500">
                     {isConnecting ? 'Connecting...' : isConnected ? 'Online' : 'Offline'} {conversationId ? `(ID: ${conversationId})` : '(No conversation)'}
                   </p>
                 </div>
              </div>
              
              {/* 3-dot Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-8 w-8 rounded-full hover:bg-gray-100"
                onClick={() => setShowSidebar(!showSidebar)}
                title="More options"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-5 space-y-3 relative"
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base font-medium text-gray-900 mb-2">Welcome to Customer Support</h3>
                <p className="text-sm text-gray-500">Start a conversation with our support team. We're here to help!</p>
              </div>
            ) : (
                             messages.map((message) => {
                 const isCustomer = isMessageFromCustomer(message)
                 return (
                   <div
                     key={message.message_id}
                     className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                   >
                     <div className={`flex items-end space-x-2 max-w-md ${isCustomer ? 'flex-row-reverse space-x-reverse' : ''}`}>
                       <Avatar className="w-8 h-8">
                         <AvatarImage src={message.avatar_url || undefined} />
                         <AvatarFallback className="text-xs">
                           {isCustomer ? 'You' : 'Support'}
                         </AvatarFallback>
                       </Avatar>
                       <div className={`px-3 py-2 rounded-2xl ${
                         isCustomer 
                           ? 'bg-blue-500 text-white' 
                           : 'bg-gray-200 text-gray-900'
                       }`}>
                      {/* Message Content */}
                      {message.content && message.is_link ? (
                        <div className="space-y-2">
                          {/* If it's a direct media link, show media directly */}
                          {isDirectMediaUrl(message.content) ? (
                            <div>
                              {(() => {
                                const mediaType = getMediaTypeFromUrl(message.content);
                                if (mediaType === 'image') {
                                  return (
                                    <img
                                      src={message.content}
                                      alt="Link media"
                                      className="max-w-[350px] max-h-[250px] rounded cursor-pointer hover:opacity-90 transition-opacity object-cover"
                                      onClick={() => setSelectedImage(message.content)}
                                    />
                                  );
                                } else if (mediaType === 'video') {
                                  return (
                                    <video
                                      src={message.content}
                                      controls
                                      className="max-w-[500px] max-h-[400px] rounded object-contain"
                                      preload="metadata"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            /* If it's a regular link, show link preview card */
                            <div className="space-y-2">
                              <p className="text-sm">{message.content}</p>
                              <a
                                href={message.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                                      {getDomainFromUrl(message.content)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {message.content}
                                    </p>
                                  </div>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </a>
                            </div>
                          )}
                        </div>
                      ) : message.content && message.content !== '[Image]' && message.content !== '[Video]' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : null}
                      
                      {/* Only show media for uploaded files, not for link media */}
                      {message.media && message.media.length > 0 && !message.is_link && (message.content === '[Image]' || message.content === '[Video]' || !message.content) && (
                        <div className="mt-2 space-y-2">
                          {message.media.map((media) => (
                            <div key={media.media_id} className="relative">
                              {message.isUploading && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center z-10">
                                  <div className="text-white text-center">
                                    {media.type.startsWith('video/') ? (
                                      <div className="w-48">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                        <p className="text-sm mb-2">Đang tải video...</p>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                          <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                                        </div>
                                        <p className="text-xs mt-1">60%</p>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                        <p className="text-sm">Đang tải lên...</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {(() => {
                                const getMediaType = (url: string, type?: string) => {
                                  if (type && type.startsWith('image/')) return 'image';
                                  if (type && type.startsWith('video/')) return 'video';
                                  
                                  const urlLower = url.toLowerCase();
                                  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
                                      urlLower.includes('.png') || urlLower.includes('.gif') || 
                                      urlLower.includes('.webp') || urlLower.includes('.bmp')) {
                                    return 'image';
                                  }
                                  if (urlLower.includes('.mp4') || urlLower.includes('.avi') || 
                                      urlLower.includes('.mov') || urlLower.includes('.wmv') || 
                                      urlLower.includes('.flv') || urlLower.includes('.webm')) {
                                    return 'video';
                                  }
                                  return 'file';
                                };
                                
                                const mediaType = getMediaType(media.url, media.type);
                                
                                if (mediaType === 'image') {
                                  return (
                                    <img
                                      src={media.url}
                                      alt="Media"
                                      className="max-w-[350px] max-h-[250px] rounded cursor-pointer hover:opacity-90 transition-opacity object-cover"
                                      onClick={() => setSelectedImage(media.url)}
                                    />
                                  );
                                } else if (mediaType === 'video') {
                                  return (
                                    <video
                                      src={media.url}
                                      controls
                                      className="max-w-[500px] max-h-[400px] rounded object-contain"
                                      preload="metadata"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  );
                                } else {
                                  return (
                                    <a
                                      href={media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 underline hover:text-blue-700"
                                    >
                                      {media.file_name || 'Download file'}
                                    </a>
                                  );
                                }
                              })()}
                            </div>
                          ))}
                        </div>
                      )}
                                             <p className={`text-xs mt-1 ${
                         isCustomer ? 'text-blue-100' : 'text-gray-500'
                       }`}>
                         {formatTime(message.sent_at)}
                       </p>
                     </div>
                   </div>
                 </div>
               )
             })
                         )}
             
             {/* Typing Indicator */}
             {isTyping && (
               <div className="flex justify-start">
                 <div className="flex items-end space-x-2 max-w-md">
                   <Avatar className="w-8 h-8">
                     <AvatarFallback className="text-xs">Support</AvatarFallback>
                   </Avatar>
                   <div className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-900">
                     <div className="flex space-x-1">
                       <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                       <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
             
             <div ref={messagesEndRef} />
            
            {/* Scroll to Bottom Button */}
            {showScrollToBottom && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-20 right-8 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50 bg-white text-gray-600 hover:bg-gray-100"
                title="Cuộn xuống tin nhắn gần nhất"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}
          </div>

          {/* Message Input - Facebook Messenger Style */}
          <div className="bg-white border-t border-gray-200 p-3">
            <div className="flex items-center space-x-2">
              {/* Microphone Button */}
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200"
                title="Voice Message"
              >
                <Mic className="w-5 h-5 text-gray-600" />
              </Button>
              
               {/* Image/Video Button */}
               <div className="relative">
                 <input
                   type="file"
                   accept="image/*,video/*"
                   onChange={handleImageUpload}
                   className="hidden"
                   id="image-upload"
                 />
                 <Button
                   variant="ghost"
                   size="sm"
                   className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200"
                   title="Send Photo/Video"
                   onClick={() => document.getElementById('image-upload')?.click()}
                 >
                   <ImageIcon className="w-5 h-5 text-gray-600" />
                 </Button>
               </div>
               
               {/* File Button */}
               <div className="relative">
                 <input
                   type="file"
                   onChange={handleFileUpload}
                   className="hidden"
                   id="file-upload"
                 />
                 <Button
                   variant="ghost"
                   size="sm"
                   className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200"
                   title="Send File"
                   onClick={() => document.getElementById('file-upload')?.click()}
                 >
                   <Paperclip className="w-5 h-5 text-gray-600" />
                 </Button>
               </div>
               
               {/* Emoji Button */}
               <Button
                 variant="ghost"
                 size="sm"
                 className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 relative"
                 title="Emoji"
                 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
               >
                 <Smile className="w-5 h-5 text-gray-600" />
                 
                 {/* Emoji Picker */}
                 {showEmojiPicker && (
                   <div className="absolute bottom-full right-0 mb-2 z-50 emoji-picker-container">
                     <EmojiPicker
                       onEmojiClick={onEmojiClick}
                       width={300}
                       height={400}
                     />
                   </div>
                 )}
               </Button>

                             {/* Message Input */}
                               <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={conversationId ? (isConnected ? "Aa" : "Connecting...") : "Connecting..."}
                  className="flex-1 text-sm py-2 px-3 rounded-full bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  disabled={!conversationId || !isConnected}
                />
              
              {/* Send Button */}
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !conversationId || !isConnected}
                className="p-2 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={!isConnected ? "Connecting..." : "Send Message"}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Absolute positioned */}
        {showSidebar && (
          <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-gray-200 flex flex-col shadow-lg">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Chat Info</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-8 w-8"
                  onClick={() => setShowSidebar(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 px-6 py-4 text-base font-medium ${
                  activeTab === 'media'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                File phương tiện
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 px-6 py-4 text-base font-medium ${
                  activeTab === 'files'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                File
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'media' ? (
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">Media Files</h3>
                  <div className="space-y-3">
                    {messages.filter(msg => msg.media && msg.media.length > 0).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {messages
                          .filter(msg => msg.media && msg.media.length > 0)
                          .flatMap(msg => msg.media)
                          .filter(media => media.type && (media.type.startsWith('image/') || media.type.startsWith('video/')))
                          .slice(0, 10)
                          .map((media, index) => (
                            <div key={index} className="relative group">
                              {media.type.startsWith('image/') ? (
                                <img
                                  src={media.url}
                                  alt="Shared media"
                                  className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedImage(media.url)}
                                />
                              ) : media.type.startsWith('video/') ? (
                                <div className="relative w-full h-24 rounded cursor-pointer hover:opacity-90 transition-opacity overflow-hidden">
                                  <video
                                    src={media.url}
                                    className="w-full h-full object-contain"
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white bg-black bg-opacity-50 rounded-full p-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-base">No media files yet</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">Files</h3>
                  <div className="space-y-3">
                    <div className="text-center py-12 text-gray-500">
                      <Paperclip className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-base">No files shared yet</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-[85vw] max-h-[85vh]">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-8 right-0 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={selectedImage}
                alt="Fullscreen"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: 'calc(85vh - 2rem)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
