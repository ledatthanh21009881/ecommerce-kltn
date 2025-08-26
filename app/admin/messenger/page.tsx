'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Send, Image, Video, Search, MoreVertical, FileText, Link, Phone, Video as VideoCall, UserPlus, Archive, Trash2, Mic, Smile, Sun, Moon } from 'lucide-react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

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

export default function AdminMessengerPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)
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

  const getAdminToken = () => {
    return localStorage.getItem('adminToken')
  }
  const API_BASE = 'http://localhost:8000/api/backend/v1'

  useEffect(() => {
    fetchConversations()
    connectWebSocket()
  }, [])

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

    if (ws) {
      ws.close()
    }

    const websocket = new WebSocket('ws://localhost:8080')
    
    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        type: 'auth',
        token: token
      }))
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message') {
          handleNewMessage(data.message)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    websocket.onclose = () => {
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          connectWebSocket()
        }
      }, 3000)
    }

    setWs(websocket)
  }

  const joinConversation = (conversationId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'join_conversation',
        conversation_id: conversationId
      }))
    }
  }

  const handleNewMessage = (message: Message) => {
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.message_id === message.message_id)
      if (messageExists) {
        return prev
      }
      return [...prev, message]
    })
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
        return
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
      } else {
        toast.error(`Failed to delete ${messageIds.length - successCount} messages`)
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
      toast.error('Failed to delete messages')
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
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      setSelectedMessages([])
    }
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

  const fetchConversations = async () => {
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
        markAsRead(conversationId)
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

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    // Kiểm tra xem có phải là URL hợp lệ không
    const isValidUrlString = isValidUrl(messageContent)
    const isMediaUrl = isValidUrlString && isDirectMediaUrl(messageContent)
    const mediaType = isMediaUrl ? getMediaTypeFromUrl(messageContent) : null

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
       is_link: isValidUrlString
     }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

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
           is_link: isValidUrlString
         })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.message_id === optimisticMessage.message_id 
              ? data.data 
              : msg
          )
          return updated
        })
      } else {
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
        setNewMessage(messageContent)
        toast.error('Failed to send message')
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id))
      setNewMessage(messageContent)
      toast.error('Error sending message')
    }
  }

  const uploadMedia = async (file: File) => {
    if (!selectedConversation) return

         const optimisticMessage: Message = {
       message_id: Date.now(),
       sender_id: 1,
       content: '',
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
               content: '',
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
    setShowScrollToBottom(!isNearBottom)
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
        return nameMatch && conv.status === 'customer'
      case 'staff':
        return nameMatch && conv.status === 'staff'
      case 'shippers':
        return nameMatch && conv.status === 'shipper'
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
      customers: conversations.filter(c => c.status === 'customer').length,
      staff: conversations.filter(c => c.status === 'staff').length,
      shippers: conversations.filter(c => c.status === 'shipper').length
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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

                                               return (
              <div className={`flex h-[calc(100vh-6rem)] ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style jsx global>{`
                  html, body {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                  }
                  html::-webkit-scrollbar, body::-webkit-scrollbar {
                    display: none !important;
                  }
                `}</style>
       {/* Sidebar - Conversations List */}
       <div className={`w-80 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Messages</h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'} hover:bg-opacity-80`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-1 mt-3 mb-3">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveFilter('customers')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeFilter === 'customers'
                  ? 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Customers ({counts.customers})
            </button>
            <button
              onClick={() => setActiveFilter('staff')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeFilter === 'staff'
                  ? 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Staff ({counts.staff})
            </button>
            <button
              onClick={() => setActiveFilter('shippers')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeFilter === 'shippers'
                  ? 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Shippers ({counts.shippers})
            </button>
          </div>
          
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {activeFilter === 'all' ? 'No conversations found' :
                 `No ${activeFilter} found`}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b cursor-pointer ${
                  isDarkMode 
                    ? 'border-gray-700 hover:bg-gray-700' 
                    : 'border-gray-100 hover:bg-gray-50'
                } ${
                  selectedConversation?.conversation_id === conversation.conversation_id 
                    ? isDarkMode ? 'bg-gray-700' : 'bg-blue-50' 
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.avatar_url} />
                    <AvatarFallback>
                      {conversation.first_name[0]}{conversation.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {conversation.first_name} {conversation.last_name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <Badge 
                          variant={
                            conversation.status === 'customer' ? 'default' :
                            conversation.status === 'staff' ? 'secondary' :
                            conversation.status === 'shipper' ? 'outline' : 'default'
                          } 
                          className="text-xs"
                        >
                          {conversation.status === 'customer' ? 'Customer' :
                           conversation.status === 'staff' ? 'Staff' :
                           conversation.status === 'shipper' ? 'Shipper' : 'User'}
                        </Badge>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {conversation.last_message || 'No messages yet'}
                    </p>
                    {conversation.last_message_time && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatTime(conversation.last_message_time)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
                         {/* Chat Header */}
             <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   {!isSelectionMode ? (
                     <>
                       <Avatar className="w-10 h-10">
                         <AvatarImage src={selectedConversation.avatar_url} />
                         <AvatarFallback>
                           {selectedConversation.first_name[0]}{selectedConversation.last_name[0]}
                         </AvatarFallback>
                       </Avatar>
                       <div>
                         <div className="flex items-center space-x-2">
                           <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                             {selectedConversation.first_name} {selectedConversation.last_name}
                           </h2>
                           <Badge 
                             variant={
                               selectedConversation.status === 'customer' ? 'default' :
                               selectedConversation.status === 'staff' ? 'secondary' :
                               selectedConversation.status === 'shipper' ? 'outline' : 'default'
                             } 
                             className="text-xs"
                           >
                             {selectedConversation.status === 'customer' ? 'Customer' :
                              selectedConversation.status === 'staff' ? 'Staff' :
                              selectedConversation.status === 'shipper' ? 'Shipper' : 'User'}
                           </Badge>
                         </div>
                         <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{selectedConversation.email}</p>
                       </div>
                     </>
                   ) : (
                     <div>
                       <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                         Xóa tin nhắn
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
                         onClick={() => deleteMultipleMessages(selectedMessages)}
                         disabled={selectedMessages.length === 0}
                         className="text-xs"
                       >
                         Xóa ({selectedMessages.length})
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
                className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} ${isSelectionMode ? 'pl-16' : ''} relative`}
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
                   console.log('Message ID:', message.message_id, 'Show Menu:', showMenu, 'Message Actions:', messageActions)
                  
                  return (
                    <div
                      key={message.message_id}
                      className={`flex ${message.sender_id === 1 ? 'justify-end' : 'justify-start'} group relative`}
                    >
                                             {/* Selection Checkbox - Only show for admin messages in selection mode */}
                       {isSelectionMode && message.sender_id === 1 && (
                         <div className="absolute -left-12 top-2 z-20">
                           <div
                             onClick={() => toggleMessageSelection(message.message_id)}
                             className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
                               selectedMessages.includes(message.message_id)
                                 ? 'bg-blue-500 border-blue-500'
                                 : 'bg-white border-gray-300 hover:border-blue-400'
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
                         className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                           message.sender_id === 1
                             ? (message.content && message.content.trim() !== '') ? 'bg-blue-500 text-white' : 'bg-transparent'
                             : isDarkMode 
                               ? (message.content && message.content.trim() !== '') ? 'bg-gray-700 text-white' : 'bg-transparent'
                               : (message.content && message.content.trim() !== '') ? 'bg-gray-200 text-gray-900' : 'bg-transparent'
                                                    } ${isSelectionMode && selectedMessages.includes(message.message_id) ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                       >
                                                                        {/* Message Actions - Only show on hover for admin messages when not in selection mode */}
                                               {message.sender_id === 1 && !isSelectionMode && (
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-24 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2 relative">
                           {/* Reply Button */}
                           <button
                             onClick={() => setReplyTo(message)}
                             className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 hover:scale-110 shadow-lg"
                             title="Reply"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                             </svg>
                           </button>
                           
                           {/* More Options Button */}
                           <button
                             onClick={() => toggleMessageMenu(message.message_id)}
                             className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 hover:scale-110 shadow-lg"
                             title="More options"
                           >
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                               <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                             </svg>
                           </button>
                           
                                                                                                                                           {/* Message Menu Dropdown */}
                               {showMenu && (
                                 <div className="absolute bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] message-menu-container" style={{ zIndex: 9999999, top: '0', left: '-200px' }}>
                               <button
                                 onClick={() => startDeleteSelection()}
                                 className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 rounded-t-lg"
                               >
                                 Thu hồi
                               </button>
                               <button
                                 onClick={() => {
                                   toggleMessageMenu(message.message_id)
                                 }}
                                 className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                               >
                                 Chuyển tiếp
                               </button>
                             </div>
                           )}
                         </div>
                       )}
                        
                                                 {/* Message Content */}
                         {(() => { console.log('Message:', message.content, 'is_link:', message.is_link); return null; })()}
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
                                         className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                         onClick={() => setSelectedImage(message.content)}
                                       />
                                     );
                                   } else if (mediaType === 'video') {
                                     return (
                                       <video
                                         src={message.content}
                                         controls
                                         className="max-w-full rounded"
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
                         ) : message.content ? (
                           <p className="text-sm">{message.content}</p>
                         ) : null}
                        
                                                 {/* Only show media for uploaded files, not for link media */}
                         {message.media && message.media.length > 0 && !message.is_link && (
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
                                          className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setSelectedImage(media.url)}
                                        />
                                      );
                                   } else if (mediaType === 'video') {
                                     return (
                                       <video
                                         src={media.url}
                                         controls
                                         className="max-w-full rounded"
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
               <div ref={messagesEndRef} />
               
                               {/* Scroll to Bottom Button */}
                {showScrollToBottom && (
                  <button
                    onClick={scrollToBottom}
                    className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50 ${
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

            {/* Reply to Message */}
            {replyToMessage && (
              <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-2 rounded-lg mb-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-blue-500">Replying to:</span>
                    <span className="text-xs truncate max-w-[200px]">
                      {replyToMessage.content.length > 50 
                        ? replyToMessage.content.substring(0, 50) + '...' 
                        : replyToMessage.content
                      }
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

                         {/* Message Input */}
             <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-3 relative`}>
               <div className="flex items-center space-x-3">
                 {/* Voice Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   className={`h-10 w-10 p-0 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                   title="Voice message"
                 >
                   <Mic className="w-5 h-5" />
                 </Button>
                 
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
                   onChange={(e) => setNewMessage(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                   className={`flex-1 h-10 text-base ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`}
                 />
                 
                 {/* Send Button */}
                 <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm" className="h-10 px-4">
                   <Send className="w-5 h-5" />
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className={`text-2xl font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Select a conversation
              </h2>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
                 )}
       </div>
       
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
   )
 }
