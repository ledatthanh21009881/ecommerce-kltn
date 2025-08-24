'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Send, Paperclip, Image, Video, Search, MoreVertical, FileText, Link, Phone, Video as VideoCall, UserPlus, Archive, Trash2, Mic, Smile, Sun, Moon } from 'lucide-react'

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
}

interface MessageMedia {
  media_id: number
  url: string
  type: string
  file_name?: string
}

export default function MessengerPage() {
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
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const ADMIN_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2NvdW50X2lkIjoxLCJhY2NvdW50X25hbWUiOiJhZG1pbiIsImFjY291bnRfdHlwZSI6ImxvY2FsIiwicm9sZXMiOlsiYWRtaW4iXSwiaXNfYWRtaW4iOnRydWUsImlhdCI6MTc1NjAyNTI0NiwiZXhwIjoxNzU2MDI4ODQ2fQ.KqNDJswMrgIVw_Y6N0FGJX-bWe65I8xe1iiXPNmKecI'
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.more-menu-container')) {
        setShowMoreMenu(false)
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  const connectWebSocket = () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      console.log('No admin token found, skipping WebSocket connection')
      return
    }

    const websocket = new WebSocket('ws://localhost:8080')
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      // Authenticate with token
      websocket.send(JSON.stringify({
        type: 'auth',
        token: token
      }))
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_message') {
        handleNewMessage(data.message)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
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
    setMessages(prev => [...prev, message])
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

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

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
          content: newMessage
        })
      })

      if (response.ok) {
        setNewMessage('')
        // Message will be added via WebSocket
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      toast.error('Error sending message')
    }
  }

  const uploadMedia = async (file: File) => {
    if (!selectedConversation) return

    const formData = new FormData()
    formData.append('media', file)

    try {
      const response = await fetch(`${API_BASE}/messages/upload-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        // Send message with media
        await fetch(`${API_BASE}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversation_id: selectedConversation.conversation_id,
            content: '',
            media: [data.data]
          })
        })
      }
    } catch (error) {
      toast.error('Failed to upload media')
    }
  }

  const markAsRead = async (conversationId: number) => {
    try {
      await fetch(`${API_BASE}/conversations/${conversationId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadMedia(file)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const nameMatch = `${conv.first_name} ${conv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeFilter === 'all') return nameMatch
    
    // Filter by user type based on conversation status or user role
    // You can modify this logic based on your actual data structure
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
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get conversation counts for each type
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

  // Helper functions for sidebar data
  const getMediaMessages = () => {
    return messages.filter(msg => msg.media && msg.media.length > 0)
  }

  const getFileMessages = () => {
    return messages.filter(msg => 
      msg.media && msg.media.some(media => !media.type.startsWith('image/') && !media.type.startsWith('video/'))
    )
  }

  const getLinkMessages = () => {
    return messages.filter(msg => 
      msg.content.includes('http://') || msg.content.includes('https://') || msg.content.includes('www.')
    )
  }

  const groupByMonth = (items: any[]) => {
    const groups: { [key: string]: any[] } = {}
    items.forEach(item => {
      const date = new Date(item.sent_at)
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(item)
    })
    return groups
  }

  const handleMoreMenuClick = () => {
    setShowSidebar(true)
    setShowMoreMenu(true)
  }

  const handleViewMedia = () => {
    console.log('handleViewMedia called, setting sidebarTab to media')
    setSidebarTab('media')
    setShowMoreMenu(false)
  }

  const handleViewFiles = () => {
    console.log('handleViewFiles called, setting sidebarTab to files')
    setSidebarTab('files')
    setShowMoreMenu(false)
  }

  const handleViewLinks = () => {
    console.log('handleViewLinks called, setting sidebarTab to links')
    setSidebarTab('links')
    setShowMoreMenu(false)
  }

  const handleVoiceMessage = () => {
    toast.info('Voice message feature coming soon!')
  }

  const handleImageVideoUpload = () => {
    fileInputRef.current?.click()
  }

  const handleStickerPicker = () => {
    setShowStickerPicker(!showStickerPicker)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleArchiveConversation = () => {
    toast.info('Archive feature coming soon!')
    setShowMoreMenu(false)
  }

  const handleDeleteConversation = () => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      toast.info('Delete feature coming soon!')
    }
    setShowMoreMenu(false)
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
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
                       {/* User Type Badge */}
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
                </div>
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

                         {/* Messages Area */}
             <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
               {loading ? (
                 <div className="text-center py-8">
                   <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading messages...</p>
                 </div>
               ) : messages.length === 0 ? (
                 <div className="text-center py-8">
                   <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No messages yet. Start a conversation!</p>
                 </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`flex ${message.sender_id === 1 ? 'justify-end' : 'justify-start'}`}
                  >
                                         <div
                       className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                         message.sender_id === 1
                           ? 'bg-blue-500 text-white'
                           : isDarkMode 
                             ? 'bg-gray-700 text-white'
                             : 'bg-gray-200 text-gray-900'
                       }`}
                     >
                      <p className="text-sm">{message.content}</p>
                      {message.media && message.media.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.media.map((media) => (
                            <div key={media.media_id}>
                              {media.type.startsWith('image/') ? (
                                <img
                                  src={media.url}
                                  alt="Media"
                                  className="max-w-full rounded"
                                />
                              ) : media.type.startsWith('video/') ? (
                                <video
                                  src={media.url}
                                  controls
                                  className="max-w-full rounded"
                                />
                              ) : (
                                <a
                                  href={media.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 underline"
                                >
                                  {media.file_name || 'Download file'}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                                             <p className={`text-xs mt-1 ${
                         message.sender_id === 1 ? 'text-blue-100' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                       }`}>
                         {formatTime(message.sent_at)}
                       </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

                         {/* Message Input */}
             <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-4`}>
               <div className="flex items-center space-x-2">
                 {/* Voice Message Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={handleVoiceMessage}
                   className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                 >
                   <Mic className="w-4 h-4" />
                 </Button>
                 
                 {/* Image/Video Upload Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={handleImageVideoUpload}
                   className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                 >
                   <Image className="w-4 h-4" />
                 </Button>
                 
                 {/* Sticker/Icon Button */}
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={handleStickerPicker}
                   className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                 >
                   <Smile className="w-4 h-4" />
                 </Button>
                 
                 <Input
                   placeholder="Type a message..."
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                   className={`flex-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`}
                 />
                 <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                   <Send className="w-4 h-4" />
                 </Button>
                              </div>
               
               {/* Sticker Picker */}
               {showStickerPicker && (
                 <div className={`absolute bottom-full left-4 mb-2 p-4 rounded-lg shadow-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                   <div className="grid grid-cols-6 gap-2">
                     {['😀', '😂', '😍', '🤔', '👍', '❤️', '😭', '😡', '🎉', '🔥', '💯', '👏'].map((emoji, index) => (
                       <button
                         key={index}
                         onClick={() => {
                           setNewMessage(prev => prev + emoji)
                           setShowStickerPicker(false)
                         }}
                         className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center"
                       >
                         {emoji}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
               
               <input
                 ref={fileInputRef}
                 type="file"
                 accept="image/*,video/*"
                 onChange={handleFileSelect}
                 className="hidden"
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

               {/* Sidebar - File phương tiện, file và liên kết */}
                 {showSidebar && (
           <div className={`w-96 border-l flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                                 {/* Header */}
              <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                                         {/* Back arrow - Only show when not in menu mode */}
                     {!showMoreMenu && (
                       <button
                         onClick={() => setShowMoreMenu(true)}
                         className={`p-1 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                         </svg>
                       </button>
                     )}
                    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin về đoạn chat</h2>
                  </div>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

                                                                                               {/* Tabs - Only show when not in menu mode */}
             {!showMoreMenu && (
               <div className={`flex p-2 gap-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                   <button
                    onClick={() => {
                      console.log('Media tab clicked, current sidebarTab:', sidebarTab)
                      setSidebarTab('media')
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                      sidebarTab === 'media'
                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                        : isDarkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    File phương tiện
                  </button>
                                   <button
                    onClick={() => {
                      console.log('Files tab clicked, current sidebarTab:', sidebarTab)
                      setSidebarTab('files')
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                      sidebarTab === 'files'
                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                        : isDarkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    File
                  </button>
                 <button
                   onClick={() => {
                     console.log('Links tab clicked, current sidebarTab:', sidebarTab)
                     setSidebarTab('links')
                   }}
                   className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                     sidebarTab === 'links'
                       ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                       : isDarkMode 
                         ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                         : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                   }`}
                 >
                   Liên kết
                 </button>
               </div>
             )}

                                               {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Show menu options first when sidebar opens */}
              {showMoreMenu && (
                <div className="mb-4">
                  {/* File phương tiện, file và liên kết */}
                  <div className="mb-4">
                    <div className={`text-xs font-medium mb-2 px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      File phương tiện, file và liên kết
                    </div>
                    <button
                      onClick={handleViewMedia}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      <span>File phương tiện</span>
                    </button>
                    <button
                      onClick={handleViewFiles}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>File</span>
                    </button>
                    <button
                      onClick={handleViewLinks}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      <span>Liên kết</span>
                    </button>
                  </div>
                  
                  <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} mb-4`}></div>
                  
                  {/* Other options */}
                  <div className="mb-4">
                    <button
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>Gọi điện thoại</span>
                    </button>
                    <button
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <VideoCall className="w-4 h-4" />
                      <span>Gọi video</span>
                    </button>
                    <button
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Thêm vào nhóm</span>
                    </button>
                  </div>
                  
                  <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} mb-4`}></div>
                  
                  {/* Conversation actions */}
                  <div>
                    <button
                      onClick={handleArchiveConversation}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Archive className="w-4 h-4" />
                      <span>Lưu trữ cuộc trò chuyện</span>
                    </button>
                    <button
                      onClick={handleDeleteConversation}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md ${
                        isDarkMode 
                          ? 'text-red-400 hover:bg-red-900' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa cuộc trò chuyện</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show tab content when not showing menu */}
              {!showMoreMenu && (
                <>
                                     {sidebarTab === 'media' && (
                <div>
                  {(() => {
                    console.log('Rendering media tab, sidebarTab:', sidebarTab)
                    const mediaMessages = getMediaMessages()
                    const groupedMedia = groupByMonth(mediaMessages)
                    return Object.keys(groupedMedia).length > 0 ? (
                     Object.entries(groupedMedia).map(([monthKey, items]) => (
                       <div key={monthKey} className="mb-6">
                         <h3 className="text-sm font-medium text-gray-300 mb-3">
                           Tháng {monthKey}
                         </h3>
                         <div className="grid grid-cols-2 gap-2">
                           {items.map((message) => 
                             message.media?.map((media: MessageMedia) => (
                               <div key={media.media_id} className="relative">
                                 {media.type.startsWith('image/') ? (
                                   <img
                                     src={media.url}
                                     alt="Media"
                                     className="w-full h-24 object-cover rounded"
                                   />
                                 ) : media.type.startsWith('video/') ? (
                                   <div className="relative w-full h-24 bg-gray-600 rounded flex items-center justify-center">
                                     <Video className="w-8 h-8 text-white" />
                                     <span className="absolute bottom-1 right-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                                       0:05
                                     </span>
                                   </div>
                                 ) : null}
                               </div>
                             ))
                           )}
                         </div>
                       </div>
                     ))
                   ) : (
                                           <div className="text-center py-8">
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không có file phương tiện nào</p>
                      </div>
                   )
                 })()}
               </div>
             )}

             

                             {sidebarTab === 'files' && (
                 <div>
                   {(() => {
                     console.log('Rendering files tab, sidebarTab:', sidebarTab)
                     const fileMessages = getFileMessages()
                     const groupedFiles = groupByMonth(fileMessages)
                     return Object.keys(groupedFiles).length > 0 ? (
                      Object.entries(groupedFiles).map(([monthKey, items]) => (
                        <div key={monthKey} className="mb-6">
                          <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Tháng {monthKey}
                          </h3>
                          <div className="space-y-2">
                            {items.map((message) => 
                              message.media?.map((media: MessageMedia) => (
                                <div key={media.media_id} className={`flex items-center space-x-3 p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                  <FileText className={`w-6 h-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                  <div className="flex-1">
                                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{media.file_name || 'File'}</p>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{media.type}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không có file nào</p>
                      </div>
                    )
                  })()}
                </div>
              )}

                             {sidebarTab === 'links' && (
                 <div>
                   {(() => {
                     console.log('Rendering links tab, sidebarTab:', sidebarTab)
                     const linkMessages = getLinkMessages()
                     const groupedLinks = groupByMonth(linkMessages)
                     return Object.keys(groupedLinks).length > 0 ? (
                      Object.entries(groupedLinks).map(([monthKey, items]) => (
                        <div key={monthKey} className="mb-6">
                          <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Tháng {monthKey}
                          </h3>
                          <div className="space-y-2">
                            {items.map((message) => (
                              <div key={message.message_id} className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                <div className="flex items-center space-x-3">
                                  <Link className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                  <div className="flex-1">
                                    <p className={`text-sm break-all ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{message.content}</p>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatTime(message.sent_at)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không có liên kết nào</p>
                      </div>
                    )
                  })()}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
