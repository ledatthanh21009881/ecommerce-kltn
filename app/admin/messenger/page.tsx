'use client'

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Send, Image, Video, Search, MoreVertical, FileText, Link, Phone, Video as VideoCall, UserPlus, Archive, Trash2, Mic, Smile, Sun, Moon, ArrowLeft, Reply, Forward, AlertTriangle } from 'lucide-react'
import { VoiceRecorder } from "@/components/VoiceRecorder"
import { AudioPlayer } from "@/components/AudioPlayer"
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import { useWebSocket } from "@/hooks/useWebSocket"
import {
  ADMIN_MESSENGER_UNREAD_CHANNEL,
  sumConversationUnread,
} from '@/lib/admin-messenger-unread'
import { cn } from '@/lib/utils'
import { getBackendApiV1Base } from '@/app/api/backend/config'

interface Conversation {
  conversation_id: number
  customer_id: number
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  status: string
  user_role: 'customer' | 'staff' | 'shipper'
}

interface MessageReplyTo {
  message_id: number
  content: string
  sender_id: number
  first_name?: string
  last_name?: string
  is_link?: boolean | number
  media?: MessageMedia[]
}

interface Message {
  message_id: number
  sender_id: number
  content: string
  sent_at: string
  is_read: boolean
  media?: MessageMedia[]
  isUploading?: boolean
  is_link?: boolean
  /** Từ API join users (getMessages) */
  first_name?: string
  last_name?: string
  reply_to_message_id?: number | null
  reply_to?: MessageReplyTo | null
}

interface MessageActions {
  messageId: number
  showMenu: boolean
  showReply: boolean
}

interface MessageMedia {
  media_id: number
  url: string
  type: string
  file_name?: string
}

/** Chỉ cho phép quay lại trong admin — tránh open redirect. */
function resolveMessengerReturnPath(raw: string | null): string {
  const fallback = '/admin/dashboard'
  if (!raw?.trim()) return fallback
  let decoded = raw.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return fallback
  }
  if (!decoded.startsWith('/admin/')) return fallback
  if (decoded.includes('..')) return fallback
  return decoded
}

function AdminMessengerPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  // WebSocket hook
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    sendMessage: sendMessageViaWebSocket
  } = useWebSocket({
    onMessage: (message) => {
      console.log('🔍 Debug - New message received:', message)
      const incomingConversationId = Number(message?.conversation_id)
      const isCurrentConversation =
        !!selectedConversation &&
        Number(selectedConversation.conversation_id) === incomingConversationId

      // Chỉ append vào khung chat khi tin thuộc hội thoại đang mở.
      if (isCurrentConversation) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.message_id === message.message_id)
          if (exists) return prev
          return [...prev, message]
        })
      }
      setConversations(prev => {
        const preview = (message.content && message.content.trim() !== '')
          ? message.content
          : (message.media && message.media.length > 0 ? '[Media]' : '')
        const isSelected = isCurrentConversation
        let matched = false
        const updated = prev.map(conv =>
          Number(conv.conversation_id) === incomingConversationId
            ? (() => {
                matched = true
                return {
                  ...conv,
                  last_message: preview,
                  last_message_time: message.sent_at,
                  unread_count: isSelected ? 0 : (conv.unread_count || 0) + 1,
                }
              })()
            : conv
        )
        const next = matched ? updated : [
          {
            conversation_id: incomingConversationId,
            customer_id: message.sender_id,
            first_name: message.first_name || 'User',
            last_name: message.last_name || '',
            email: message.email || '',
            avatar_url: message.avatar_url,
            last_message: preview,
            last_message_time: message.sent_at,
            unread_count: isSelected ? 0 : 1,
            status: 'open',
          },
          ...updated,
        ]
        return next.sort((a, b) => {
          const aTime = new Date(a.last_message_time || 0).getTime()
          const bTime = new Date(b.last_message_time || 0).getTime()
          return bTime - aTime
        })
      })
      // Đảm bảo danh sách bên trái luôn đồng bộ dữ liệu chuẩn từ server
      // (đặc biệt khi payload WS thiếu first_name/last_name hoặc conversation chưa có trong list cục bộ).
      void fetchConversations()
    },
    onTypingStart: (conversationId) => {
      console.log('🔍 Debug - Typing start for conversation:', conversationId)
      if (selectedConversation && conversationId === selectedConversation.conversation_id) {
        setIsTyping(true)
      }
    },
    onTypingStop: (conversationId) => {
      console.log('🔍 Debug - Typing stop for conversation:', conversationId)
      if (selectedConversation && conversationId === selectedConversation.conversation_id) {
        setIsTyping(false)
      }
    },
    onConnect: () => {
      console.log('🔍 Debug - WebSocket connected')
    },
    onDisconnect: () => {
      console.log('🔍 Debug - WebSocket disconnected')
    }
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'customers' | 'staff' | 'shippers'>('all')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'media' | 'files' | 'links'>('media')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [messageActions, setMessageActions] = useState<MessageActions[]>([])
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<number[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  /** Nhấn preview reply: cuộn tới tin gốc + nháy viền */
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null)
  const [forwardSourceMessage, setForwardSourceMessage] = useState<Message | null>(null)
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false)
  const [forwardRecipientSearch, setForwardRecipientSearch] = useState('')
  const [forwardSelectedConversation, setForwardSelectedConversation] =
    useState<Conversation | null>(null)
  const [forwardSending, setForwardSending] = useState(false)
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false)
  const [recallDeleting, setRecallDeleting] = useState(false)
  const [deleteConvPending, setDeleteConvPending] = useState<Conversation | null>(null)
  const [deleteConvLoading, setDeleteConvLoading] = useState(false)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const unreadBroadcastRef = useRef<BroadcastChannel | null>(null)
  const conversationsFetchInFlightRef = useRef<Promise<void> | null>(null)
  const lastConversationsFetchAtRef = useRef(0)
  const CONVERSATIONS_DEBOUNCE_MS = 1500

  const getAdminToken = () => {
    return localStorage.getItem('adminToken')
  }
  const API_BASE = getBackendApiV1Base()

  const forwardPickConversations = useMemo(() => {
    const q = forwardRecipientSearch.trim().toLowerCase()
    return conversations.filter((c) => {
      if (!q) return true
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase()
      const mail = (c.email || '').toLowerCase()
      return name.includes(q) || mail.includes(q)
    })
  }, [conversations, forwardRecipientSearch])

  const returnToParam = searchParams.get('returnTo')
  const messengerReturnTo = useMemo(
    () => resolveMessengerReturnPath(returnToParam),
    [returnToParam],
  )
  const deepLinkCustomerIdParam = searchParams.get('customer_id')
  const messengerMissingCustomerToastRef = useRef<number | null>(null)

  useEffect(() => {
    if (!deepLinkCustomerIdParam) {
      messengerMissingCustomerToastRef.current = null
      return
    }
    const id = Number(deepLinkCustomerIdParam)
    if (!Number.isFinite(id)) return
    if (conversations.length === 0) return

    const conv = conversations.find((c) => Number(c.customer_id) === id)
    if (conv) {
      setSelectedConversation(conv)
      if (conv.user_role === 'customer') setActiveFilter('customers')
      messengerMissingCustomerToastRef.current = null
      return
    }
    if (messengerMissingCustomerToastRef.current !== id) {
      messengerMissingCustomerToastRef.current = id
      toast.info(t('trackingMessengerNoConversation'))
    }
  }, [conversations, deepLinkCustomerIdParam, t])

  useEffect(() => {
    void fetchConversations({ force: true })
    connectWebSocket()
    
    // Cleanup timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  // Poll danh sách hội thoại để bắt được tin mới khi chưa join room của hội thoại đó.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchConversations()
      }
    }, 8000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  /**
   * Chỉ sơn nền html/body trong lúc ở Messenger — không đổi theme toàn app (tránh viền/tông sai ở Dashboard).
   */
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const bg = isDarkMode ? '#18191a' : '#f0f2f5'
    html.style.backgroundColor = bg
    body.style.backgroundColor = bg
    html.style.colorScheme = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('background-color')
      document.documentElement.style.removeProperty('color-scheme')
      document.body.style.removeProperty('background-color')
    }
  }, [])

  /** Đồng bộ tổng tin chưa đọc sang các tab admin khác (badge trên icon Messenger). */
  useEffect(() => {
    try {
      unreadBroadcastRef.current = new BroadcastChannel(ADMIN_MESSENGER_UNREAD_CHANNEL)
    } catch {
      unreadBroadcastRef.current = null
    }
    return () => {
      unreadBroadcastRef.current?.close()
      unreadBroadcastRef.current = null
    }
  }, [])

  useEffect(() => {
    const total = sumConversationUnread(conversations)
    unreadBroadcastRef.current?.postMessage({ total })
  }, [conversations])

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev)
  }

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.conversation_id)
      joinConversation(selectedConversation.conversation_id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (selectedConversation) {
      // Đảm bảo cuộn xuống tin nhắn gần nhất khi chọn conversation mới
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [selectedConversation])

     useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       const target = event.target as Element
       if (!target.closest('.more-menu-container')) {
         setShowMoreMenu(false)
       }
       if (!target.closest('.emoji-picker-container')) {
         setShowEmojiPicker(false)
       }
       // Đóng message menu khi click ra ngoài
       if (!target.closest('.message-menu-container')) {
         setMessageActions(prev => prev.map(action => ({ ...action, showMenu: false })))
       }
     }

     if (showMoreMenu || showEmojiPicker || messageActions.some(action => action.showMenu)) {
       document.addEventListener('mousedown', handleClickOutside)
     }

     return () => {
       document.removeEventListener('mousedown', handleClickOutside)
     }
   }, [showMoreMenu, showEmojiPicker, messageActions])

  const connectWebSocket = () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    connect(token)
  }

  const handleNewMessage = (message: Message) => {
    setMessages(prev => {
      // Check if message already exists
      const exists = prev.some(msg => msg.message_id === message.message_id)
      if (exists) return prev
      return [...prev, message]
    })
  }

  // Handle typing indicator
  const handleTyping = () => {
    if (isConnected && selectedConversation) {
      console.log('🔍 Debug - Sending typing_start for conversation:', selectedConversation.conversation_id)
      sendTypingStart(selectedConversation.conversation_id)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop()
      }, 2000)
    }
  }

  // Handle typing stop
  const handleTypingStop = () => {
    if (isConnected && selectedConversation) {
      console.log('🔍 Debug - Sending typing_stop for conversation:', selectedConversation.conversation_id)
      sendTypingStop(selectedConversation.conversation_id)
    }
  }

  const toggleMessageMenu = (messageId: number) => {
    setMessageActions(prev => {
      const existing = prev.find(action => action.messageId === messageId)
      if (existing) {
        return prev.map(action => 
          action.messageId === messageId 
            ? { ...action, showMenu: !action.showMenu }
            : { ...action, showMenu: false }
        )
      } else {
        return [...prev, { messageId, showMenu: true, showReply: false }]
      }
    })
  }

  const closeAllMessageMenus = () => {
    setMessageActions((prev) => prev.map((a) => ({ ...a, showMenu: false })))
  }

  const closeForwardDialog = () => {
    setForwardDialogOpen(false)
    setForwardSourceMessage(null)
    setForwardRecipientSearch('')
    setForwardSelectedConversation(null)
  }

  const openForwardPicker = (message: Message) => {
    closeAllMessageMenus()
    setForwardSourceMessage(message)
    setForwardRecipientSearch('')
    setForwardSelectedConversation(null)
    setForwardDialogOpen(true)
  }

  const handleConfirmForward = () => {
    if (!forwardSelectedConversation) {
      toast.info('Chọn cuộc trò chuyện nhận tin')
      return
    }
    void forwardMessageTo(forwardSelectedConversation)
  }

  const deleteMessage = async (messageId: number) => {
    try {
      const token = getAdminToken()
      if (!token) {
        toast.error('Please login to delete message')
        return
      }

      const response = await fetch(`${API_BASE}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.message_id !== messageId))
        toast.success('Message deleted successfully')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }

  const deleteMultipleMessages = async (messageIds: number[]) => {
    try {
      const token = getAdminToken()
      if (!token) {
        toast.error('Please login to delete messages')
        return false
      }

      // Xóa từng tin nhắn một
      const deletePromises = messageIds.map(messageId =>
        fetch(`${API_BASE}/messages/${messageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      )

      const responses = await Promise.all(deletePromises)
      const successCount = responses.filter(response => response.ok).length

      if (successCount === messageIds.length) {
        setMessages(prev => prev.filter(msg => !messageIds.includes(msg.message_id)))
        setSelectedMessages([])
        setIsSelectionMode(false)
        toast.success(`${successCount} messages deleted successfully`)
        return true
      } else {
        toast.error(`Failed to delete ${messageIds.length - successCount} messages`)
        return false
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
      toast.error('Failed to delete messages')
      return false
    }
  }

  const openRecallConfirm = () => {
    if (selectedMessages.length === 0) return
    setRecallConfirmOpen(true)
  }

  const handleConfirmRecall = async () => {
    if (selectedMessages.length === 0) return
    setRecallDeleting(true)
    try {
      const ok = await deleteMultipleMessages(selectedMessages)
      if (ok) setRecallConfirmOpen(false)
    } finally {
      setRecallDeleting(false)
    }
  }

  const toggleMessageSelection = (messageId: number) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId)
      } else {
        return [...prev, messageId]
      }
    })
  }

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setRecallConfirmOpen(false)
      setSelectedMessages([])
    }
    setIsSelectionMode(!isSelectionMode)
  }

  const startDeleteSelection = () => {
    setIsSelectionMode(true)
    setSelectedMessages([])
  }

  const selectAllMessages = () => {
    const adminMessageIds = messages
      .filter(msg => msg.sender_id === 1)
      .map(msg => msg.message_id)
    setSelectedMessages(adminMessageIds)
  }

  const deselectAllMessages = () => {
    setSelectedMessages([])
  }

  const setReplyTo = (message: Message) => {
    setReplyToMessage(message)
    const input = document.getElementById('message-input') as HTMLInputElement
    if (input) {
      input.focus()
    }
  }

  const scrollToMessageById = (targetId: number) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
      highlightTimeoutRef.current = null
    }
    const el = document.querySelector<HTMLElement>(
      `[data-chat-message-id="${targetId}"]`,
    )
    if (!el) {
      toast.info('Không tìm thấy tin nhắn gốc trong cuộc trò chuyện')
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightMessageId(targetId)
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightMessageId(null)
      highlightTimeoutRef.current = null
    }, 2200)
  }

  const fetchConversations = async ({ force = false }: { force?: boolean } = {}) => {
    const now = Date.now()
    if (!force && now - lastConversationsFetchAtRef.current < CONVERSATIONS_DEBOUNCE_MS) {
      return
    }
    if (conversationsFetchInFlightRef.current) {
      return conversationsFetchInFlightRef.current
    }

    const run = (async () => {
      lastConversationsFetchAtRef.current = Date.now()
      try {
        const token = localStorage.getItem('adminToken')
        if (!token) {
          toast.error('Please login to access messenger')
          return
        }

        const response = await fetch(`${API_BASE}/conversations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setConversations(data.data.items || [])
        }
      } catch (error) {
        toast.error('Failed to fetch conversations')
      }
    })()

    conversationsFetchInFlightRef.current = run
    try {
      await run
    } finally {
      conversationsFetchInFlightRef.current = null
    }
  }

  const fetchMessages = async (conversationId: number) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.items || [])
        // Cập nhật UI ngay — trước đây chỉ gọi API mark-read, state conversations không đổi nên badge vẫn hiện.
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c,
          ),
        )
        void markAsRead(conversationId)
      }
    } catch (error) {
      toast.error('Failed to fetch messages')
    } finally {
      setLoading(false)
    }
  }

  // Hàm kiểm tra xem có phải là URL hợp lệ không
  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // Hàm kiểm tra xem URL có phải là ảnh/video trực tiếp không
  const isDirectMediaUrl = (url: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    
    const urlLower = url.toLowerCase()
    
    // Kiểm tra extension
    const hasImageExt = imageExtensions.some(ext => urlLower.includes(ext))
    const hasVideoExt = videoExtensions.some(ext => urlLower.includes(ext))
    
    // Kiểm tra các domain phổ biến cho media
    const imageDomains = ['imgur.com', 'i.imgur.com', 'images.unsplash.com', 'picsum.photos', 'via.placeholder.com']
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']
    
    const hasImageDomain = imageDomains.some(domain => urlLower.includes(domain))
    const hasVideoDomain = videoDomains.some(domain => urlLower.includes(domain))
    
    return hasImageExt || hasVideoExt || hasImageDomain || hasVideoDomain
  }

  // Hàm lấy loại media từ URL
  const getMediaTypeFromUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']
    
    const urlLower = url.toLowerCase()
    const hasVideoExt = videoExtensions.some(ext => urlLower.includes(ext))
    const hasVideoDomain = videoDomains.some(domain => urlLower.includes(domain))
    
    return hasVideoExt || hasVideoDomain ? 'video' : 'image'
  }

  // Hàm trích xuất domain từ URL
  const getDomainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return ''
    }
  }

  /** Preview giống Facebook: tên người bị trả lời + dòng trích (mờ) + thumbnail ảnh nếu có. */
  const getReplyPreviewInfo = (msg: Message, conv: Conversation | null) => {
    let authorLabel = 'Khách hàng'
    if (msg.sender_id === 1) {
      authorLabel = 'Bạn'
    } else if (msg.first_name || msg.last_name) {
      authorLabel = `${msg.first_name || ''} ${msg.last_name || ''}`.trim()
    } else if (conv) {
      authorLabel = `${conv.first_name} ${conv.last_name}`.trim()
    }

    const content = (msg.content || '').trim()
    let quotedLine = ''
    let thumbUrl: string | null = null
    let kind: 'image' | 'video' | 'audio' | 'text' | 'link' = 'text'

    if (msg.media && msg.media.length > 0) {
      const m0 = msg.media[0]
      const t = (m0.type || '').toLowerCase()
      if (t.startsWith('image/')) {
        kind = 'image'
        thumbUrl = m0.url
        quotedLine = m0.file_name ? `Ảnh · ${m0.file_name}` : 'Ảnh'
      } else if (t.startsWith('video/')) {
        kind = 'video'
        quotedLine = m0.file_name ? `Video · ${m0.file_name}` : 'Video'
      } else if (t.startsWith('audio/')) {
        kind = 'audio'
        quotedLine = 'Tin nhắn thoại'
      } else {
        quotedLine = content || 'Tệp đính kèm'
      }
    } else if (content === '[Image]') {
      kind = 'image'
      quotedLine = 'Ảnh'
    } else if (content === '[Video]') {
      kind = 'video'
      quotedLine = 'Video'
    } else if (content === '[Voice Message]') {
      kind = 'audio'
      quotedLine = 'Tin nhắn thoại'
    } else if (msg.is_link && content && isDirectMediaUrl(content)) {
      kind = getMediaTypeFromUrl(content) === 'video' ? 'video' : 'image'
      thumbUrl = kind === 'image' ? content : null
      quotedLine = kind === 'video' ? 'Video' : 'Ảnh'
    } else if (msg.is_link && content) {
      kind = 'link'
      quotedLine = content.length > 80 ? content.slice(0, 80) + '…' : content
    } else if (content) {
      quotedLine = content.length > 120 ? content.slice(0, 120) + '…' : content
    } else {
      quotedLine = 'Tin nhắn'
    }

    return { authorLabel, quotedLine, thumbUrl, kind }
  }

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    if (!selectedConversation) return

    try {
      // Create a file from the blob
      const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' })
      
      const formData = new FormData()
      formData.append('media', audioFile)
      
      const token = localStorage.getItem('adminToken')
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
              conversation_id: selectedConversation.conversation_id,
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
              setShowVoiceRecorder(false)
              toast.success('Voice message sent successfully')
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

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    // Stop typing indicator
    handleTypingStop()

    const messageContent = newMessage.trim()
    const replySnapshot = replyToMessage
    setNewMessage('')

    // Kiểm tra xem có phải là URL hợp lệ không
    const isValidUrlString = isValidUrl(messageContent)
    const isMediaUrl = isValidUrlString && isDirectMediaUrl(messageContent)
    const mediaType = isMediaUrl ? getMediaTypeFromUrl(messageContent) : null

    const optimisticReplyTo: MessageReplyTo | undefined = replySnapshot
      ? {
          message_id: replySnapshot.message_id,
          content: replySnapshot.content,
          sender_id: replySnapshot.sender_id,
          first_name: replySnapshot.first_name,
          last_name: replySnapshot.last_name,
          is_link: replySnapshot.is_link,
          media: replySnapshot.media,
        }
      : undefined

    const optimisticMessage: Message = {
      message_id: Date.now(),
      sender_id: 1,
      content: messageContent,
      sent_at: new Date().toISOString().replace('T', ' ').replace('Z', ''),
      is_read: false,
      media: isMediaUrl ? [{
        media_id: Date.now(),
        url: messageContent,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        file_name: 'Link media'
      }] : undefined,
      is_link: isValidUrlString,
      reply_to_message_id: replySnapshot?.message_id ?? null,
      reply_to: optimisticReplyTo ?? null,
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      // Send via HTTP API first
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.conversation_id,
          content: messageContent,
          media: isMediaUrl ? [{
            name: 'Link media',
            type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
            size: 0,
            url: messageContent,
            public_id: null
          }] : undefined,
          is_link: isValidUrlString,
          reply_to_message_id: replySnapshot?.message_id ?? null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        const savedMessage = data.data
        
        // Update optimistic message with real data
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.message_id === optimisticMessage.message_id 
              ? savedMessage 
              : msg
          )
          return updated
        })
        setReplyToMessage(null)
        setConversations(prev => {
          const preview = (savedMessage.content && savedMessage.content.trim() !== '')
            ? savedMessage.content
            : (savedMessage.media && savedMessage.media.length > 0 ? '[Media]' : '')
          const updated = prev.map(conv =>
            conv.conversation_id === selectedConversation.conversation_id
              ? {
                  ...conv,
                  last_message: preview,
                  last_message_time: savedMessage.sent_at,
                  unread_count: 0,
                }
              : conv
          )
          return updated.sort((a, b) => {
            const aTime = new Date(a.last_message_time || 0).getTime()
            const bTime = new Date(b.last_message_time || 0).getTime()
            return bTime - aTime
          })
        })

        // Send via WebSocket for real-time
        if (isConnected) {
          console.log('🔍 Debug - Sending message via WebSocket:', savedMessage)
          sendMessageViaWebSocket(savedMessage, selectedConversation.conversation_id)
        }
      } else {
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        setNewMessage(messageContent)
        if (replySnapshot) setReplyToMessage(replySnapshot)
        toast.error('Failed to send message')
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
      setNewMessage(messageContent)
      if (replySnapshot) setReplyToMessage(replySnapshot)
      toast.error('Error sending message')
    }
  }

  const forwardMessageTo = async (target: Conversation) => {
    const msg = forwardSourceMessage
    if (!msg || forwardSending) return
    if (msg.isUploading) {
      toast.error('Chưa thể chuyển tin nhắn đang tải lên')
      return
    }

    setForwardSending(true)
    try {
      const token = getAdminToken()
      if (!token) {
        toast.error('Vui lòng đăng nhập')
        return
      }

      const rawContent = msg.content ?? ''
      const validUrl = rawContent.length > 0 && isValidUrl(rawContent)
      const directMedia = !!(validUrl && isDirectMediaUrl(rawContent))
      const hasAttachmentMedia = !!(msg.media && msg.media.length > 0)

      let mediaPayload:
        | Array<{ name: string; type: string; size: number; url: string; public_id: null }>
        | undefined

      if (hasAttachmentMedia && msg.media) {
        mediaPayload = msg.media.map((m) => ({
          name: m.file_name || 'media',
          type: m.type || 'application/octet-stream',
          size: 0,
          url: m.url,
          public_id: null,
        }))
      } else if (directMedia) {
        const mt = getMediaTypeFromUrl(rawContent)
        mediaPayload = [
          {
            name: 'Link media',
            type: mt === 'video' ? 'video/mp4' : 'image/jpeg',
            size: 0,
            url: rawContent,
            public_id: null,
          },
        ]
      }

      const is_link = !!(msg.is_link || directMedia)

      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: target.conversation_id,
          content: rawContent,
          is_link,
          media: mediaPayload,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: '' }))
        toast.error((err as { message?: string }).message || 'Không chuyển tiếp được')
        return
      }

      const data = await response.json()
      const savedMessage = data.data as Message | undefined
      if (!savedMessage) {
        toast.error('Phản hồi không hợp lệ')
        return
      }

      toast.success(`Đã chuyển tới ${target.first_name} ${target.last_name}`)
      closeForwardDialog()

      const preview =
        savedMessage.content && String(savedMessage.content).trim() !== ''
          ? savedMessage.content
          : savedMessage.media && savedMessage.media.length > 0
            ? '[Media]'
            : ''

      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv.conversation_id === target.conversation_id
            ? {
                ...conv,
                last_message: preview,
                last_message_time: savedMessage.sent_at,
                unread_count: 0,
              }
            : conv,
        )
        return [...updated].sort((a, b) => {
          const aTime = new Date(a.last_message_time || 0).getTime()
          const bTime = new Date(b.last_message_time || 0).getTime()
          return bTime - aTime
        })
      })

      if (isConnected) {
        sendMessageViaWebSocket(savedMessage, target.conversation_id)
      }

      if (
        selectedConversation &&
        Number(selectedConversation.conversation_id) === Number(target.conversation_id)
      ) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.message_id === savedMessage.message_id)
          if (exists) return prev
          return [...prev, savedMessage]
        })
      }
    } catch {
      toast.error('Lỗi khi chuyển tiếp')
    } finally {
      setForwardSending(false)
    }
  }

  const uploadMedia = async (file: File) => {
    if (!selectedConversation) return

    // Xác định loại media để gửi content phù hợp
    const isVideo = file.type.startsWith('video/')
    const content = isVideo ? '[Video]' : '[Image]'

         const optimisticMessage: Message = {
       message_id: Date.now(),
       sender_id: 1,
       content: content, // Gửi [Image] hoặc [Video] để lưu vào database
       sent_at: new Date().toISOString().replace('T', ' ').replace('Z', ''),
       is_read: false,
       isUploading: true,
       media: [{
         media_id: Date.now(),
         url: URL.createObjectURL(file),
         type: file.type,
         file_name: file.name
       }]
     }

    setMessages(prev => [...prev, optimisticMessage])

    const formData = new FormData()
    formData.append('media', file)

    try {
      const token = getAdminToken()
      if (!token) {
        toast.error('Please login to upload media')
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        return
      }
      
      const response = await fetch(`${API_BASE}/messages/upload-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          const messageResponse = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
                         body: JSON.stringify({
               conversation_id: selectedConversation.conversation_id,
               content: content, // Gửi [Image] hoặc [Video] để lưu vào database
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

  const markAsRead = async (conversationId: number) => {
    try {
      const token = getAdminToken()
      if (!token) return
      
      await fetch(`${API_BASE}/conversations/${conversationId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Failed to mark as read')
    }
  }

  const runDeleteConversation = useCallback(
    async (conv: Conversation) => {
      const token = getAdminToken()
      if (!token) {
        toast.error('Vui lòng đăng nhập admin')
        return
      }
      setDeleteConvLoading(true)
      try {
        const res = await fetch(`${API_BASE}/conversations/${conv.conversation_id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof body?.message === 'string' ? body.message : `Lỗi ${res.status}`,
          )
        }
        toast.success('Đã xóa cuộc trò chuyện')
        setDeleteConvPending(null)
        setConversations((prev) =>
          prev.filter((c) => c.conversation_id !== conv.conversation_id),
        )
        if (selectedConversation?.conversation_id === conv.conversation_id) {
          leaveConversation(conv.conversation_id)
          setSelectedConversation(null)
          setMessages([])
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Không xóa được cuộc trò chuyện'
        toast.error(msg)
      } finally {
        setDeleteConvLoading(false)
      }
    },
    [API_BASE, leaveConversation, selectedConversation?.conversation_id],
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    const shouldShow = !isNearBottom && scrollHeight > clientHeight
    setShowScrollToBottom(shouldShow)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadMedia(file)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const nameMatch = `${conv.first_name} ${conv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeFilter === 'all') return nameMatch

    switch (activeFilter) {
      case 'customers':
        return nameMatch && conv.user_role === 'customer'
      case 'staff':
        return nameMatch && conv.user_role === 'staff'
      case 'shippers':
        return nameMatch && conv.user_role === 'shipper'
      default:
        return nameMatch
    }
  })

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return ''
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (error) {
      return ''
    }
  }

  const getConversationCounts = () => {
    const counts = {
      all: conversations.length,
      customers: conversations.filter(c => c.user_role === 'customer').length,
      staff: conversations.filter(c => c.user_role === 'staff').length,
      shippers: conversations.filter(c => c.user_role === 'shipper').length,
    }
    return counts
  }

  const counts = getConversationCounts()

  const handleMoreMenuClick = () => {
    setShowSidebar(true)
    setShowMoreMenu(true)
  }

  const handleImageVideoUpload = () => {
    fileInputRef.current?.click()
  }

  const handleStickerPicker = () => {
    setShowEmojiPicker(!showEmojiPicker)
  }

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setNewMessage(prev => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header
        className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 shadow-sm sm:px-4 [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] ${
          isDarkMode ? 'border-[#3a3b3c] bg-[#242526]' : 'border-[#e4e6eb] bg-white'
        }`}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`gap-1.5 text-[15px] font-medium ${
            isDarkMode ? 'text-[#e4e6eb] hover:bg-[#3a3b3c]' : 'text-[#050505] hover:bg-[#F0F2F5]'
          }`}
          onClick={() => router.push(messengerReturnTo)}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{t('back')}</span>
        </Button>
        <h1 className={`text-[17px] font-bold tracking-tight ${isDarkMode ? 'text-[#e4e6eb]' : 'text-[#050505]'}`}>{t('messenger')}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
              <div
                className={`flex h-full overflow-hidden font-sans antialiased [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] ${isDarkMode ? 'bg-[#18191a]' : 'bg-[#F0F2F5]'}`}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style jsx global>{`
                  html, body {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                  }
                  html::-webkit-scrollbar, body::-webkit-scrollbar {
                    display: none !important;
                  }
                `}</style>
       {/* Sidebar - Conversations List (rộng hơn, phong cách Messenger) */}
       <div
         className={`flex shrink-0 flex-col border-r ${
           isDarkMode
             ? 'w-[min(100%,420px)] min-w-[300px] bg-[#242526] border-[#3a3b3c] sm:min-w-[360px] lg:w-[440px]'
             : 'w-[min(100%,440px)] min-w-[300px] border-[#e4e6eb] bg-white shadow-[2px_0_12px_rgba(0,0,0,0.06)] sm:min-w-[360px] lg:w-[440px]'
         }`}
       >
        {/* Header */}
        <div className={`px-4 pb-3 pt-4 ${isDarkMode ? 'border-b border-[#3a3b3c]' : 'border-b border-[#e4e6eb]'}`}>
          <div className="flex items-center justify-between">
            <h1 className={`text-[1.375rem] font-bold leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-[#050505]'}`}>
              {t('messenger')}
            </h1>
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`rounded-full p-2 transition-colors ${isDarkMode ? 'bg-[#3a3b3c] text-yellow-400 hover:bg-[#4e4f50]' : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#e4e6eb]'}`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mb-3 mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-none transition-colors ${
                activeFilter === 'all'
                  ? isDarkMode
                    ? 'bg-[#2374e1] text-white'
                    : 'bg-[#E7F3FF] text-[#0084ff]'
                  : isDarkMode
                    ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]'
                    : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#e4e6eb]'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('customers')}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-none transition-colors ${
                activeFilter === 'customers'
                  ? isDarkMode
                    ? 'bg-[#2374e1] text-white'
                    : 'bg-[#E7F3FF] text-[#0084ff]'
                  : isDarkMode
                    ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]'
                    : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#e4e6eb]'
              }`}
            >
              Customers ({counts.customers})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('staff')}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-none transition-colors ${
                activeFilter === 'staff'
                  ? isDarkMode
                    ? 'bg-[#2374e1] text-white'
                    : 'bg-[#E7F3FF] text-[#0084ff]'
                  : isDarkMode
                    ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]'
                    : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#e4e6eb]'
              }`}
            >
              Staff ({counts.staff})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('shippers')}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-none transition-colors ${
                activeFilter === 'shippers'
                  ? isDarkMode
                    ? 'bg-[#2374e1] text-white'
                    : 'bg-[#E7F3FF] text-[#0084ff]'
                  : isDarkMode
                    ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]'
                    : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#e4e6eb]'
              }`}
            >
              Shippers ({counts.shippers})
            </button>
          </div>

          <div className="relative">
            <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-[#8a8d91]' : 'text-[#65676B]'}`} />
            <Input
              placeholder="Search Messenger"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`h-9 rounded-full border-0 pl-9 text-[15px] shadow-none ${
                isDarkMode
                  ? 'bg-[#3a3b3c] text-white placeholder:text-[#b0b3b8]'
                  : 'bg-[#F0F2F5] text-[#050505] placeholder:text-[#65676B]'
              }`}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className={`text-[15px] ${isDarkMode ? 'text-[#b0b3b8]' : 'text-[#65676B]'}`}>
                {activeFilter === 'all' ? 'No conversations found' : `No ${activeFilter} found`}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedConversation(conversation)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedConversation(conversation)
                  }
                }}
                className={`mb-1 cursor-pointer rounded-xl px-2 py-2.5 transition-colors ${
                  isDarkMode
                    ? 'hover:bg-[#3a3b3c]'
                    : 'hover:bg-[#F2F3F5]'
                } ${
                  selectedConversation?.conversation_id === conversation.conversation_id
                    ? isDarkMode
                      ? 'bg-[#3a3b3c]'
                      : 'bg-[#e7f3ff]'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-14 w-14 shrink-0 ring-2 ring-transparent">
                    <AvatarImage src={conversation.avatar_url} />
                    <AvatarFallback className="text-[15px] font-semibold">
                      {conversation.first_name[0]}
                      {conversation.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`truncate text-[15px] font-semibold leading-snug ${isDarkMode ? 'text-[#e4e6eb]' : 'text-[#050505]'}`}>
                        {conversation.first_name} {conversation.last_name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1">
                        {conversation.last_message_time && (
                          <span className={`whitespace-nowrap text-[12px] ${isDarkMode ? 'text-[#b0b3b8]' : 'text-[#65676B]'}`}>
                            {formatTime(conversation.last_message_time)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={`min-w-0 flex-1 truncate text-[13px] leading-snug ${isDarkMode ? 'text-[#b0b3b8]' : 'text-[#65676B]'}`}>
                        {conversation.last_message || 'No messages yet'}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge
                          variant={
                            conversation.user_role === 'customer'
                              ? 'default'
                              : conversation.user_role === 'staff'
                                ? 'secondary'
                                : conversation.user_role === 'shipper'
                                  ? 'outline'
                                  : 'default'
                          }
                          className="h-5 px-1.5 text-[11px] font-medium"
                        >
                          {conversation.user_role === 'customer'
                            ? 'Customer'
                            : conversation.user_role === 'staff'
                              ? 'Staff'
                              : conversation.user_role === 'shipper'
                                ? 'Shipper'
                                : 'User'}
                        </Badge>
                        {conversation.unread_count > 0 && (
                          <span
                            className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white ${
                              isDarkMode ? 'bg-red-600' : 'bg-red-500'
                            }`}
                          >
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className="shrink-0"
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-8 w-8',
                            isDarkMode
                              ? 'text-[#e4e6eb] hover:bg-[#4e4f50]'
                              : 'text-[#65676B] hover:bg-[#F0F2F5]',
                          )}
                          aria-label="Tùy chọn hội thoại"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[180px]">
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => {
                            setDeleteConvPending(conversation)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                          Xóa cuộc trò chuyện
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedConversation ? (
          <>
                         {/* Chat Header */}
             <div className={`border-b px-4 py-3 ${isDarkMode ? 'border-[#3a3b3c] bg-[#242526]' : 'border-[#e4e6eb] bg-white'}`}>
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   {!isSelectionMode ? (
                     <>
                       <Avatar className="h-11 w-11">
                         <AvatarImage src={selectedConversation.avatar_url} />
                         <AvatarFallback className="text-sm font-semibold">
                           {selectedConversation.first_name[0]}{selectedConversation.last_name[0]}
                         </AvatarFallback>
                       </Avatar>
                       <div>
                         <div className="flex items-center space-x-2">
                           <h2 className={`text-[17px] font-bold leading-tight tracking-tight ${isDarkMode ? 'text-[#e4e6eb]' : 'text-[#050505]'}`}>
                             {selectedConversation.first_name} {selectedConversation.last_name}
                           </h2>
                           <Badge
                             variant={
                               selectedConversation.user_role === 'customer' ? 'default' :
                               selectedConversation.user_role === 'staff' ? 'secondary' :
                               selectedConversation.user_role === 'shipper' ? 'outline' : 'default'
                             }
                             className="text-xs"
                           >
                             {selectedConversation.user_role === 'customer' ? 'Customer' :
                              selectedConversation.user_role === 'staff' ? 'Staff' :
                              selectedConversation.user_role === 'shipper' ? 'Shipper' : 'User'}
                           </Badge>
                         </div>
                         <p className={`text-[13px] ${isDarkMode ? 'text-[#b0b3b8]' : 'text-[#65676B]'}`}>{selectedConversation.email}</p>
                       </div>
                     </>
                   ) : (
                     <div>
                       <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                         Thu hồi tin nhắn
                       </h2>
                     </div>
                   )}
                 </div>
                 
                 <div className="flex items-center space-x-2">
                   {isSelectionMode && (
                     <div className="flex items-center space-x-2">
                       <span className="text-sm text-gray-500">
                         {selectedMessages.length} tin nhắn
                       </span>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={selectAllMessages}
                         className="text-xs"
                       >
                         Chọn tất cả
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={deselectAllMessages}
                         className="text-xs"
                       >
                         Bỏ chọn tất cả
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={openRecallConfirm}
                         disabled={selectedMessages.length === 0}
                         className="text-xs"
                       >
                         Thu hồi ({selectedMessages.length})
                       </Button>
                     </div>
                   )}
                   {isSelectionMode && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={toggleSelectionMode}
                     >
                       Hủy
                     </Button>
                   )}
                   <div className="relative more-menu-container">
                     <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={handleMoreMenuClick}
                     >
                       <MoreVertical className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               </div>
             </div>

                                                   {/* Messages Area */}
              <div 
                className={`flex-1 space-y-3 overflow-y-auto p-4 ${isDarkMode ? 'bg-[#18191a]' : 'bg-white'} ${isSelectionMode ? 'pl-16' : ''} relative`}
                onScroll={handleScroll}
              >
              {loading ? (
                <div className="text-center py-8">
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No messages yet. Start a conversation!</p>
                </div>
              ) : (
                                 messages.map((message) => {
                   const messageAction = messageActions.find(action => action.messageId === message.message_id)
                   const showMenu = messageAction?.showMenu || false
                  
                  return (
                    <div
                      key={message.message_id}
                      data-chat-message-id={message.message_id}
                      className={cn(
                        'group relative flex transition-shadow duration-300',
                        message.sender_id === 1 ? 'justify-end' : 'justify-start',
                        highlightMessageId === message.message_id &&
                          'rounded-2xl ring-2 ring-[#0084ff] ring-offset-2',
                      )}
                    >
                                             {/* Selection Checkbox - Only show for admin messages in selection mode */}
                       {isSelectionMode && message.sender_id === 1 && (
                         <div className="absolute -left-12 top-2 z-20">
                           <div
                             onClick={() => toggleMessageSelection(message.message_id)}
                             className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
                               selectedMessages.includes(message.message_id)
                                 ? 'border-[#0084ff] bg-[#0084ff]'
                                 : 'border-gray-300 bg-white hover:border-[#0084ff]'
                             }`}
                           >
                             {selectedMessages.includes(message.message_id) && (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                               </svg>
                             )}
                           </div>
                         </div>
                       )}
                                                                    <div
                         className={`max-w-xs min-w-0 rounded-[18px] px-3 py-2 lg:max-w-md relative ${
                           message.sender_id === 1
                             ? (message.content && message.content.trim() !== '') ? 'bg-[#0084ff] text-white shadow-sm' : 'bg-transparent'
                             : isDarkMode 
                               ? (message.content && message.content.trim() !== '') ? 'bg-[#3a3b3c] text-[#e4e6eb]' : 'bg-transparent'
                               : (message.content && message.content.trim() !== '') ? 'bg-[#e4e6eb] text-[#050505]' : 'bg-transparent'
                                                    } ${isSelectionMode && selectedMessages.includes(message.message_id) ? 'ring-2 ring-[#0084ff] ring-offset-1' : ''}`}
                       >
                       {/* Reply + menu: hiện khi hover cho mọi tin; căn trái (tin admin) / phải (tin đối phương) */}
                       {!isSelectionMode && (
                          <div
                            className={`absolute top-1/2 z-10 flex -translate-y-1/2 space-x-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                              message.sender_id === 1
                                ? 'left-0 -translate-x-24'
                                : 'right-0 translate-x-24'
                            }`}
                          >
                           <button
                             type="button"
                             onClick={() => setReplyTo(message)}
                             className="rounded-full bg-[#0084ff] p-2 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-[#0064c8]"
                             title="Reply"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                             </svg>
                           </button>
                           <button
                             type="button"
                             onClick={() => toggleMessageMenu(message.message_id)}
                             className="rounded-full bg-[#0084ff] p-2 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-[#0064c8]"
                             title="More options"
                           >
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                               <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                             </svg>
                           </button>
                           {showMenu && (
                             <div
                               className={`message-menu-container absolute top-0 z-[9999999] min-w-[120px] rounded-lg border border-gray-200 bg-white shadow-lg ${
                                 message.sender_id === 1 ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
                               }`}
                             >
                               {message.sender_id === 1 && (
                                 <button
                                   type="button"
                                   onClick={() => startDeleteSelection()}
                                   className="w-full rounded-t-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                                 >
                                   Thu hồi
                                 </button>
                               )}
                               <button
                                 type="button"
                                 onClick={() => openForwardPicker(message)}
                                 className={`w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 ${
                                   message.sender_id === 1 ? 'rounded-b-lg' : 'rounded-lg'
                                 }`}
                               >
                                 Chuyển tiếp
                               </button>
                             </div>
                           )}
                         </div>
                       )}
                        
                                                 {/* Message Content */}
                         {message.reply_to && (() => {
                           const r = message.reply_to
                           const pseudo: Message = {
                             message_id: r.message_id,
                             sender_id: r.sender_id,
                             content: r.content,
                             sent_at: '',
                             is_read: true,
                             media: r.media,
                             is_link: !!r.is_link,
                             first_name: r.first_name,
                             last_name: r.last_name,
                           }
                           const info = getReplyPreviewInfo(pseudo, selectedConversation)
                           return (
                             <div
                               role="button"
                               tabIndex={0}
                               title="Xem tin nhắn gốc"
                               onClick={(e) => {
                                 e.stopPropagation()
                                 scrollToMessageById(r.message_id)
                               }}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' || e.key === ' ') {
                                   e.preventDefault()
                                   e.stopPropagation()
                                   scrollToMessageById(r.message_id)
                                 }
                               }}
                               className={cn(
                                 'mb-2 cursor-pointer rounded-md border-l-[3px] py-2 pl-2.5 pr-1 transition-opacity hover:opacity-95 active:opacity-90',
                                 message.sender_id === 1
                                   ? 'border-white/80 bg-black/20'
                                   : isDarkMode
                                     ? 'border-[#65676B] bg-black/25'
                                     : 'border-gray-400 bg-gray-200/90',
                               )}
                             >
                               <div
                                 className={cn(
                                   'flex items-center gap-1 text-[11px] font-semibold',
                                   message.sender_id === 1 ? 'text-blue-100' : 'text-[#0084ff]',
                                 )}
                               >
                                 <Reply className="h-3 w-3 shrink-0" aria-hidden />
                                 Trả lời {info.authorLabel}
                               </div>
                               <div
                                 className={cn(
                                   'mt-1 flex items-start gap-2',
                                   message.sender_id === 1
                                     ? 'text-blue-50/95'
                                     : isDarkMode
                                       ? 'text-[#b0b3b8]'
                                       : 'text-gray-600',
                                 )}
                               >
                                 {info.kind === 'image' && info.thumbUrl && (
                                   <img
                                     src={info.thumbUrl}
                                     alt=""
                                     className="h-10 w-10 shrink-0 rounded object-cover bg-gray-300/50"
                                   />
                                 )}
                                 {info.kind === 'image' && !info.thumbUrl && (
                                   <div
                                     className={cn(
                                       'flex h-10 w-10 shrink-0 items-center justify-center rounded',
                                       message.sender_id === 1 ? 'bg-white/20' : 'bg-gray-300/60',
                                     )}
                                   >
                                     <Image className="h-5 w-5 opacity-80" aria-hidden />
                                   </div>
                                 )}
                                 {info.kind === 'video' && (
                                   <div
                                     className={cn(
                                       'flex h-10 w-10 shrink-0 items-center justify-center rounded',
                                       message.sender_id === 1 ? 'bg-white/20' : 'bg-gray-300/60',
                                     )}
                                   >
                                     <Video className="h-5 w-5 opacity-80" aria-hidden />
                                   </div>
                                 )}
                                 {info.kind === 'audio' && (
                                   <div
                                     className={cn(
                                       'flex h-10 w-10 shrink-0 items-center justify-center rounded',
                                       message.sender_id === 1 ? 'bg-white/20' : 'bg-gray-300/60',
                                     )}
                                   >
                                     <Mic className="h-5 w-5 opacity-80" aria-hidden />
                                   </div>
                                 )}
                                 <p className="line-clamp-3 text-[13px] italic leading-snug [word-break:break-word]">
                                   {info.quotedLine}
                                 </p>
                               </div>
                             </div>
                           )
                         })()}
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
                                        <div
                                          className={cn(
                                            'max-w-full overflow-hidden rounded-2xl',
                                            message.sender_id === 1
                                              ? 'bg-white/10'
                                              : isDarkMode
                                                ? 'bg-black/25'
                                                : 'bg-black/[0.06]',
                                          )}
                                        >
                                          <video
                                            src={message.content}
                                            controls
                                            className="block max-h-[min(400px,70vh)] w-full max-w-full rounded-2xl object-contain"
                                            preload="metadata"
                                          >
                                            Your browser does not support the video tag.
                                          </video>
                                        </div>
                                      );
                                    }
                                   return null;
                                 })()}
                               </div>
                             ) : (
                               /* If it's a regular link, show link preview card */
                               <div className="space-y-2">
                                 <p className="text-[15px] leading-[1.33]">{message.content}</p>
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
                            <p className="text-[15px] leading-[1.33] [word-break:break-word]">{message.content}</p>
                          ) : null}
                        
                                                 {/* Only show media for uploaded files, not for link media */}
                                                   {message.media && message.media.length > 0 && !message.is_link && (message.content === '[Image]' || message.content === '[Video]' || message.content === '[Voice Message]' || !message.content) && (
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
                                     if (type && type.startsWith('audio/')) return 'audio';
                                     
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
                                     if (urlLower.includes('.mp3') || urlLower.includes('.wav') || 
                                         urlLower.includes('.ogg') || urlLower.includes('.webm')) {
                                       return 'audio';
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
                                        <div
                                          className={cn(
                                            'max-w-full overflow-hidden rounded-2xl',
                                            message.sender_id === 1
                                              ? 'bg-white/10'
                                              : isDarkMode
                                                ? 'bg-black/25'
                                                : 'bg-black/[0.06]',
                                          )}
                                        >
                                          <video
                                            src={media.url}
                                            controls
                                            className="block max-h-[min(400px,70vh)] w-full max-w-full rounded-2xl object-contain"
                                            preload="metadata"
                                          >
                                            Your browser does not support the video tag.
                                          </video>
                                        </div>
                                      );
                                    } else if (mediaType === 'audio') {
                                      return (
                                        <AudioPlayer audioUrl={media.url} />
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
                           message.sender_id === 1 
                             ? (message.content && message.content.trim() !== '') ? 'text-blue-100' : 'text-gray-500' 
                             : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                         }`}>
                          {formatTime(message.sent_at)}
                        </p>
                                             </div>
                    </div>
                  )
                })
                             )}
                             {/* Typing Indicator */}
              {(() => { console.log('🔍 Debug - isTyping state:', isTyping); return null; })()}
              {isTyping && (
                 <div className="flex justify-start">
                   <div className="flex items-end space-x-2 max-w-md">
                     <Avatar className="w-8 h-8">
                       <AvatarImage src={selectedConversation?.avatar_url} />
                       <AvatarFallback className="text-xs">
                         {selectedConversation ? `${selectedConversation.first_name[0]}${selectedConversation.last_name[0]}` : 'CU'}
                       </AvatarFallback>
                     </Avatar>
                     <div className={`px-3 py-2 rounded-2xl ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}>
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
                     className={`sticky bottom-4 left-1/2 transform -translate-x-1/2 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50 mx-auto ${
                       isDarkMode 
                         ? 'bg-gray-700 text-white hover:bg-gray-600' 
                         : 'bg-white text-gray-600 hover:bg-gray-100'
                     }`}
                     title="Cuộn xuống tin nhắn gần nhất"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                     </svg>
                   </button>
                 )}
             </div>

            {/* Reply to Message — preview kiểu Facebook (viền trái + ảnh thu nhỏ + chữ mờ) */}
            {replyToMessage && (() => {
              const preview = getReplyPreviewInfo(replyToMessage, selectedConversation)
              return (
                <div className="mb-2 px-0.5">
                  <div
                    className={cn(
                      'flex gap-3 rounded-xl border-l-[3px] border-[#0084ff] py-2.5 pl-3 pr-2 shadow-sm',
                      isDarkMode ? 'bg-[#3a3b3c]/90' : 'bg-white',
                    )}
                  >
                    {preview.kind === 'image' && preview.thumbUrl && (
                      <img
                        src={preview.thumbUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg bg-gray-200 object-cover"
                      />
                    )}
                    {preview.kind === 'image' && !preview.thumbUrl && (
                      <div
                        className={cn(
                          'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg',
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-200',
                        )}
                      >
                        <Image className="h-7 w-7 text-gray-500" aria-hidden />
                      </div>
                    )}
                    {preview.kind === 'video' && (
                      <div
                        className={cn(
                          'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg',
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-200',
                        )}
                      >
                        <Video className="h-7 w-7 text-gray-500" aria-hidden />
                      </div>
                    )}
                    {preview.kind === 'audio' && (
                      <div
                        className={cn(
                          'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg',
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-200',
                        )}
                      >
                        <Mic className="h-7 w-7 text-gray-500" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <Reply className="h-3.5 w-3.5 shrink-0 text-[#0084ff]" aria-hidden />
                        <span className="font-semibold text-[#0084ff]">
                          Đang trả lời {preview.authorLabel}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'mt-1 text-[15px] italic leading-snug line-clamp-3',
                          isDarkMode ? 'text-[#b0b3b8]' : 'text-gray-500',
                        )}
                      >
                        {preview.quotedLine}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyToMessage(null)}
                      className={cn(
                        'shrink-0 self-start rounded-full p-1.5 transition-colors',
                        isDarkMode ? 'text-gray-400 hover:bg-gray-600 hover:text-white' : 'text-gray-500 hover:bg-gray-100',
                      )}
                      aria-label="Hủy trả lời"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })()}

                         {/* Message Input */}
             <div className={`border-t p-3 relative ${isDarkMode ? 'border-[#3a3b3c] bg-[#242526]' : 'border-[#e4e6eb] bg-[#F0F2F5]'}`}>
               <div className="flex items-center gap-2">
                 {/* Voice Button */}
                 {showVoiceRecorder ? (
                   <VoiceRecorder
                     onRecordingComplete={handleVoiceRecordingComplete}
                     onCancel={() => setShowVoiceRecorder(false)}
                   />
                 ) : (
                   <Button
                     variant="ghost"
                     size="sm"
                     className={`h-10 w-10 p-0 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                     title="Voice message"
                     onClick={() => setShowVoiceRecorder(true)}
                   >
                     <Mic className="w-5 h-5" />
                   </Button>
                 )}
                 
                 {/* Image/Video Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={handleImageVideoUpload}
                   className={`h-10 w-10 p-0 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                   title="Send image or video"
                 >
                   <Image className="w-5 h-5" />
                 </Button>
                 
                 {/* File Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   className={`h-10 w-10 p-0 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                   title="Send file"
                 >
                   <FileText className="w-5 h-5" />
                 </Button>
                 
                 {/* Emoji Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleStickerPicker();
                   }}
                   className={`h-10 w-10 p-0 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                   title="Emoji"
                 >
                   <Smile className="w-5 h-5" />
                 </Button>
                 
                 {/* Message Input */}
                 <Input
                   id="message-input"
                   placeholder="Type a message..."
                   value={newMessage}
                        onChange={(e) => {
                      setNewMessage(e.target.value)
                      handleTyping()
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleTypingStop()
                        sendMessage()
                      }
                    }}
                   className={`flex-1 rounded-full border-0 px-4 text-[15px] shadow-sm ${isDarkMode ? 'h-10 bg-[#3a3b3c] text-white placeholder:text-[#b0b3b8]' : 'h-10 bg-white text-[#050505] placeholder:text-[#65676B]'}`}
                 />
                 
                 {/* Send Button */}
                 <Button
                   onClick={sendMessage}
                   disabled={!newMessage.trim()}
                   size="sm"
                   className="h-10 shrink-0 rounded-full bg-[#0084ff] px-4 text-white hover:bg-[#0064c8] disabled:bg-[#ccd0d5] disabled:text-white"
                 >
                   <Send className="h-5 w-5" />
                 </Button>
               </div>
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-4 mb-2 emoji-picker-container z-50">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    width={350}
                    height={400}
                    searchDisabled={false}
                    skinTonesDisabled={true}
                  />
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                multiple={false}
              />
            </div>
          </>
        ) : (
          <div className={`flex flex-1 items-center justify-center px-6 ${isDarkMode ? 'bg-[#18191a]' : 'bg-[#F0F2F5]'}`}>
            <div className="max-w-sm text-center">
              <h2 className={`mb-2 text-[1.25rem] font-bold tracking-tight ${isDarkMode ? 'text-[#e4e6eb]' : 'text-[#050505]'}`}>
                Select a conversation
              </h2>
              <p className={`text-[15px] leading-snug ${isDarkMode ? 'text-[#b0b3b8]' : 'text-[#65676B]'}`}>
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
                 )}
               </div>
        
        {/* Right Sidebar */}
        {showSidebar && (
          <div className={`flex shrink-0 flex-col border-l ${isDarkMode ? 'w-[min(100%,400px)] min-w-[280px] border-[#3a3b3c] bg-[#242526] lg:w-[400px]' : 'w-[min(100%,400px)] min-w-[280px] border-[#e4e6eb] bg-white lg:w-[400px]'}`}>
            {/* Sidebar Header */}
            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sidebarTab === 'media' ? 'Media' : sidebarTab === 'files' ? 'Files' : 'Links'}
                </h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Sidebar Tabs */}
              <div className="flex space-x-1 mt-3">
                <button
                  onClick={() => setSidebarTab('media')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    sidebarTab === 'media'
                      ? isDarkMode
                        ? 'bg-[#2374e1] text-white'
                        : 'bg-[#E7F3FF] text-[#0084ff]'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Media
                </button>
                <button
                  onClick={() => setSidebarTab('files')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    sidebarTab === 'files'
                      ? isDarkMode
                        ? 'bg-[#2374e1] text-white'
                        : 'bg-[#E7F3FF] text-[#0084ff]'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setSidebarTab('links')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    sidebarTab === 'links'
                      ? isDarkMode
                        ? 'bg-[#2374e1] text-white'
                        : 'bg-[#E7F3FF] text-[#0084ff]'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Links
                </button>
              </div>
            </div>
            
            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarTab === 'media' && (
                <div className="space-y-4">
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Shared Media
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      // Debug: Log messages to see structure
                      console.log('=== SIDEBAR MEDIA DEBUG ===');
                      console.log('All messages:', messages);
                      
                      // Tìm tất cả tin nhắn có media
                      const mediaMessages = messages.filter(msg => {
                        const hasMediaArray = msg.media && msg.media.length > 0;
                        const hasMediaContent = msg.content && isDirectMediaUrl(msg.content);
                        const hasImageContent = msg.content === '[Image]' || msg.content === '[Video]';
                        const hasUploadedMedia = msg.media && msg.media.length > 0 && (msg.content === '[Image]' || msg.content === '[Video]');
                        
                        console.log(`Message ${msg.message_id}:`, {
                          content: msg.content,
                          media: msg.media,
                          hasMediaArray,
                          hasMediaContent,
                          hasImageContent,
                          hasUploadedMedia,
                          isDirectMediaUrl: msg.content ? isDirectMediaUrl(msg.content) : false
                        });
                        return hasMediaArray || hasMediaContent || hasImageContent || hasUploadedMedia;
                      });
                      
                      console.log('Media messages found:', mediaMessages.length);
                      
                      // Thu thập tất cả media
                      const allMedia = mediaMessages.flatMap(msg => {
                        const mediaFromArray = msg.media || [];
                        const mediaFromContent = msg.content && isDirectMediaUrl(msg.content) ? [{
                          media_id: msg.message_id,
                          url: msg.content,
                          type: getMediaTypeFromUrl(msg.content) === 'video' ? 'video/mp4' : 'image/jpeg',
                          file_name: 'Link media'
                        }] : [];
                        
                        // Xử lý tin nhắn có [Image] hoặc [Video] content - lấy media từ array
                        const mediaFromImageContent = (msg.content === '[Image]' || msg.content === '[Video]') && msg.media && msg.media.length > 0 ? msg.media : [];
                        
                        console.log(`Message ${msg.message_id} media:`, {
                          fromArray: mediaFromArray,
                          fromContent: mediaFromContent,
                          fromImageContent: mediaFromImageContent
                        });
                        
                        // Nếu có [Image] hoặc [Video] content, ưu tiên lấy media từ array
                        if (msg.content === '[Image]' || msg.content === '[Video]') {
                          return mediaFromImageContent;
                        }
                        
                        return [...mediaFromArray, ...mediaFromContent];
                      });
                      
                      console.log('All media collected:', allMedia);
                      
                      // Lọc media (ảnh và video)
                      const filteredMedia = allMedia.filter(media => {
                        // Kiểm tra type từ media.type
                        const isImage = media.type && media.type.startsWith('image/');
                        const isVideo = media.type && media.type.startsWith('video/');
                        
                        // Nếu type là null, kiểm tra từ URL
                        const urlLower = media.url.toLowerCase();
                        const hasImageExt = urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
                                          urlLower.includes('.png') || urlLower.includes('.gif') || 
                                          urlLower.includes('.webp') || urlLower.includes('.bmp');
                        const hasVideoExt = urlLower.includes('.mp4') || urlLower.includes('.avi') || 
                                          urlLower.includes('.mov') || urlLower.includes('.wmv') || 
                                          urlLower.includes('.flv') || urlLower.includes('.webm');
                        
                        console.log(`Media ${media.media_id}:`, {
                          url: media.url,
                          type: media.type,
                          isImage,
                          isVideo,
                          hasImageExt,
                          hasVideoExt
                        });
                        
                        return isImage || isVideo || hasImageExt || hasVideoExt;
                      });
                      
                      console.log('Filtered media (images + videos):', filteredMedia);
                      console.log('=== END DEBUG ===');
                      
                      return filteredMedia.slice(0, 10).map((media, index) => {
                        // Xác định loại media từ type hoặc URL
                        const isImage = media.type ? media.type.startsWith('image/') : 
                                      media.url.toLowerCase().includes('.jpg') || media.url.toLowerCase().includes('.jpeg') || 
                                      media.url.toLowerCase().includes('.png') || media.url.toLowerCase().includes('.gif') || 
                                      media.url.toLowerCase().includes('.webp') || media.url.toLowerCase().includes('.bmp');
                        
                        const isVideo = media.type ? media.type.startsWith('video/') : 
                                      media.url.toLowerCase().includes('.mp4') || media.url.toLowerCase().includes('.avi') || 
                                      media.url.toLowerCase().includes('.mov') || media.url.toLowerCase().includes('.wmv') || 
                                      media.url.toLowerCase().includes('.flv') || media.url.toLowerCase().includes('.webm');
                        
                        return (
                          <div key={index} className="relative group">
                            {isImage ? (
                              <img
                                src={media.url}
                                alt="Shared media"
                                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedImage(media.url)}
                              />
                            ) : isVideo ? (
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
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              
              {sidebarTab === 'files' && (
                <div className="space-y-4">
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Shared Files
                  </h4>
                  <div className="space-y-2">
                    {messages
                      .filter(msg => msg.media && msg.media.length > 0)
                      .flatMap(msg => msg.media || [])
                      .filter(media => !media.type.startsWith('image/') && !media.type.startsWith('video/'))
                      .slice(0, 10)
                      .map((media, index) => (
                        <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className="flex items-center space-x-3">
                            <FileText className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {media.file_name || 'Unknown file'}
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {media.type}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {sidebarTab === 'links' && (
                <div className="space-y-4">
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Shared Links
                  </h4>
                  <div className="space-y-2">
                    {messages
                      .filter(msg => msg.is_link && msg.content)
                      .slice(0, 10)
                      .map((message, index) => (
                        <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className="flex items-center space-x-3">
                            <Link className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {getDomainFromUrl(message.content)}
                              </p>
                              <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
                {/* Xác nhận thu hồi tin nhắn */}
        {deleteConvPending && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => {
              if (!deleteConvLoading) setDeleteConvPending(null)
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-conv-title"
              aria-describedby="delete-conv-desc"
              className={cn(
                'w-full max-w-md rounded-2xl p-5 shadow-xl',
                isDarkMode ? 'bg-[#242526] text-[#e4e6eb]' : 'bg-white text-gray-900',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    isDarkMode ? 'bg-red-500/20' : 'bg-red-50',
                  )}
                >
                  <Trash2
                    className={cn('h-5 w-5', isDarkMode ? 'text-red-400' : 'text-red-600')}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="delete-conv-title" className="text-base font-semibold">
                    Xóa cuộc trò chuyện?
                  </h3>
                  <p
                    id="delete-conv-desc"
                    className={cn(
                      'mt-2 text-sm leading-relaxed',
                      isDarkMode ? 'text-gray-400' : 'text-gray-600',
                    )}
                  >
                    Xóa hội thoại với{' '}
                    <span className="font-semibold text-inherit">
                      {deleteConvPending.first_name} {deleteConvPending.last_name}
                    </span>{' '}
                    và toàn bộ tin nhắn trong đó? Thao tác không thể hoàn tác.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleteConvLoading}
                  onClick={() => setDeleteConvPending(null)}
                  className={
                    isDarkMode ? 'border-white/20 bg-transparent hover:bg-white/10' : ''
                  }
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteConvLoading}
                  onClick={() =>
                    deleteConvPending
                      ? void runDeleteConversation(deleteConvPending)
                      : undefined
                  }
                >
                  {deleteConvLoading ? 'Đang xóa…' : 'Xóa cuộc trò chuyện'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {recallConfirmOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => {
              if (!recallDeleting) setRecallConfirmOpen(false)
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="recall-confirm-title"
              aria-describedby="recall-confirm-desc"
              className={cn(
                'w-full max-w-sm rounded-2xl p-5 shadow-xl',
                isDarkMode ? 'bg-[#242526] text-[#e4e6eb]' : 'bg-white text-gray-900',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    isDarkMode ? 'bg-red-500/20' : 'bg-red-50',
                  )}
                >
                  <AlertTriangle
                    className={cn('h-5 w-5', isDarkMode ? 'text-red-400' : 'text-red-600')}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="recall-confirm-title" className="text-base font-semibold">
                    Thu hồi tin nhắn?
                  </h3>
                  <p
                    id="recall-confirm-desc"
                    className={cn(
                      'mt-2 text-sm leading-relaxed',
                      isDarkMode ? 'text-gray-400' : 'text-gray-600',
                    )}
                  >
                    Bạn có chắc muốn thu hồi{' '}
                    <span className="font-semibold text-inherit">
                      {selectedMessages.length}
                    </span>{' '}
                    tin nhắn đã chọn? Thao tác này không thể hoàn tác.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={recallDeleting}
                  onClick={() => setRecallConfirmOpen(false)}
                  className={isDarkMode ? 'border-white/20 bg-transparent hover:bg-white/10' : ''}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={recallDeleting}
                  onClick={() => void handleConfirmRecall()}
                >
                  {recallDeleting ? 'Đang thu hồi…' : 'Thu hồi'}
                </Button>
              </div>
            </div>
          </div>
        )}

                {/* Forward message — chọn hội thoại đích */}
        {forwardDialogOpen && forwardSourceMessage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => {
              if (!forwardSending) closeForwardDialog()
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="forward-dialog-title"
              className={cn(
                'flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-xl',
                isDarkMode ? 'bg-[#242526] text-[#e4e6eb]' : 'bg-white text-gray-900',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  'flex items-center justify-between border-b px-4 py-3',
                  isDarkMode ? 'border-white/10' : 'border-gray-200',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Forward className="h-5 w-5 shrink-0 text-[#0084ff]" aria-hidden />
                  <h3 id="forward-dialog-title" className="text-base font-semibold truncate">
                    Chuyển tiếp tin nhắn
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={forwardSending}
                  onClick={() => closeForwardDialog()}
                  className={cn(
                    'rounded-full p-1.5 transition-colors',
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                  )}
                  aria-label="Đóng"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div
                className={cn(
                  'border-b px-4 py-3 text-sm',
                  isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50',
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">Nội dung</p>
                <p className="mt-1 line-clamp-3 [word-break:break-word]">
                  {getReplyPreviewInfo(forwardSourceMessage, selectedConversation).quotedLine}
                </p>
              </div>
              <div className="px-4 py-2">
                <div className="relative">
                  <Search
                    className={cn(
                      'absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2',
                      isDarkMode ? 'text-gray-500' : 'text-gray-400',
                    )}
                    aria-hidden
                  />
                  <Input
                    value={forwardRecipientSearch}
                    onChange={(e) => setForwardRecipientSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc email..."
                    disabled={forwardSending}
                    className={cn(
                      'pl-9',
                      isDarkMode && 'border-white/15 bg-[#3a3b3c] text-[#e4e6eb] placeholder:text-gray-500',
                    )}
                  />
                </div>
              </div>
              <div
                className={cn(
                  'min-h-[200px] max-h-[45vh] flex-1 overflow-y-auto px-2 pb-4',
                  isDarkMode ? 'scrollbar-thin' : '',
                )}
              >
                {forwardPickConversations.length === 0 ? (
                  <p className="py-10 text-center text-sm opacity-70">
                    {conversations.length === 0
                      ? 'Chưa có hội thoại nào'
                      : 'Không tìm thấy hội thoại phù hợp'}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {forwardPickConversations.map((c) => {
                      const selected =
                        forwardSelectedConversation?.conversation_id === c.conversation_id
                      return (
                        <li key={c.conversation_id}>
                          <button
                            type="button"
                            disabled={forwardSending}
                            onClick={() => setForwardSelectedConversation(c)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                              selected &&
                                (isDarkMode
                                  ? 'bg-[#0084ff]/25 ring-1 ring-[#0084ff]/50'
                                  : 'bg-blue-50 ring-1 ring-[#0084ff]/40'),
                              !selected &&
                                (isDarkMode
                                  ? 'hover:bg-white/10 disabled:opacity-50'
                                  : 'hover:bg-gray-100 disabled:opacity-50'),
                            )}
                          >
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={c.avatar_url} alt="" />
                              <AvatarFallback className="text-xs">
                                {`${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.trim() ||
                                  '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">
                                {c.first_name} {c.last_name}
                              </p>
                              <p
                                className={cn(
                                  'truncate text-xs',
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500',
                                )}
                              >
                                {c.email}
                              </p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <div
                className={cn(
                  'flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3',
                  isDarkMode ? 'border-white/10' : 'border-gray-200',
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={forwardSending}
                  onClick={() => closeForwardDialog()}
                  className={isDarkMode ? 'border-white/20 bg-transparent hover:bg-white/10' : ''}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={forwardSending || !forwardSelectedConversation}
                  onClick={handleConfirmForward}
                  className="bg-[#0084ff] text-white hover:bg-[#0064c8]"
                >
                  {forwardSending ? 'Đang gửi…' : 'Gửi'}
                </Button>
              </div>
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
    </div>
   )
 }

export default function AdminMessengerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AdminMessengerPageInner />
    </Suspense>
  )
}
