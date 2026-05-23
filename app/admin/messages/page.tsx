'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, MessageSquare, Mail, Phone, Clock, CheckCircle, AlertCircle, Send, Paperclip, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import EmojiPicker from 'emoji-picker-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/ui-translations'

const MSG_STATUS_KEYS: Record<string, TranslationKey> = {
  unread: 'msgStatusUnread',
  read: 'msgStatusRead',
  replied: 'msgStatusReplied',
  closed: 'msgStatusClosed',
}

const MSG_TYPE_KEYS: Record<string, TranslationKey> = {
  support: 'msgTypeSupport',
  inquiry: 'msgTypeInquiry',
  complaint: 'msgTypeComplaint',
  feedback: 'msgTypeFeedback',
}

const MSG_PRIORITY_KEYS: Record<string, TranslationKey> = {
  high: 'msgPriorityHigh',
  medium: 'msgPriorityMedium',
  low: 'msgPriorityLow',
}

interface Message {
  message_id: number
  customer_name: string
  customer_email: string
  customer_phone?: string
  subject: string
  message: string
  message_type: string
  status: string
  created_at: string
  replied_at?: string
  priority?: string
}

export default function AdminMessagesPage() {
  const { t } = useLanguage()

  const translateMsgStatus = (status: string) => {
    const key = MSG_STATUS_KEYS[status]
    return key ? t(key) : status
  }

  const translateMsgType = (type: string) => {
    const key = MSG_TYPE_KEYS[type]
    return key ? t(key) : type
  }

  const translateMsgPriority = (priority: string) => {
    const key = MSG_PRIORITY_KEYS[priority]
    const level = key ? t(key) : priority
    return t('msgPrioritySuffix').replace('{level}', level)
  }
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/messages')
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data || [])
      } else {
        toast.error(t('failedToFetchMessages'))
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error(t('errorFetchingMessages'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

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

  // Filter messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || message.status === statusFilter
    const matchesType = !typeFilter || message.message_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'read':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'replied':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'support':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'inquiry':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'complaint':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'feedback':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMessageStats = () => {
    const stats = {
      total: messages.length,
      unread: messages.filter(m => m.status === 'unread').length,
      read: messages.filter(m => m.status === 'read').length,
      replied: messages.filter(m => m.status === 'replied').length,
      support: messages.filter(m => m.message_type === 'support').length,
      inquiry: messages.filter(m => m.message_type === 'inquiry').length
    }
    return stats
  }

  const stats = getMessageStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // TODO: Implement image/video upload to server
      console.log('Media selected:', file)
      toast.info(t('messagesMediaUploadSoon'))
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // TODO: Implement file upload to server
      console.log('File selected:', file)
      toast.info(t('messagesFileUploadSoon'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="admin-page-title mb-2">{t('messengerManagement')}</h1>
          <p className="admin-page-description">{t('messengerManagementDesc')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('messagesTotal')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('messagesUnread')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.unread}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('messagesRead')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.read}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('messagesReplied')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.replied}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('messagesSupport')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.support}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🛠️</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('messagesInquiries')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.inquiry}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">❓</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder={t('messagesSearchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('messagesAllStatus')}</option>
                  <option value="unread">{t('msgStatusUnread')}</option>
                  <option value="read">{t('msgStatusRead')}</option>
                  <option value="replied">{t('msgStatusReplied')}</option>
                  <option value="closed">{t('msgStatusClosed')}</option>
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('messagesAllTypes')}</option>
                  <option value="support">{t('msgTypeSupport')}</option>
                  <option value="inquiry">{t('msgTypeInquiry')}</option>
                  <option value="complaint">{t('msgTypeComplaint')}</option>
                  <option value="feedback">{t('msgTypeFeedback')}</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchMessages}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Input Section */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              {/* Image/Video Button */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="admin-image-upload"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200"
                  title={t('messagesSendPhotoVideo')}
                  onClick={() => document.getElementById('admin-image-upload')?.click()}
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
                  id="admin-file-upload"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200"
                  title={t('messagesSendFile')}
                  onClick={() => document.getElementById('admin-file-upload')?.click()}
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </Button>
              </div>
              
              {/* Emoji Button */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200"
                  title={t('messagesEmoji')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  
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
              </div>

              {/* Message Input */}
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('messagesTypePlaceholder')}
                className="flex-1"
              />
              
              {/* Send Button */}
              <Button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={!newMessage.trim()}
              >
                <Send className="h-4 w-4" />
                {t('messagesSend')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('messagesNoFound')}</h3>
              <p className="text-gray-500">{t('messagesNoMatch')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <Card key={message.message_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Message Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {message.subject}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`flex items-center gap-1 ${getTypeColor(message.message_type)}`}
                            >
                              {translateMsgType(message.message_type)}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`flex items-center gap-1 ${getStatusColor(message.status)}`}
                            >
                              {translateMsgStatus(message.status)}
                            </Badge>
                            {message.priority && (
                              <Badge 
                                variant="outline" 
                                className={`flex items-center gap-1 ${getPriorityColor(message.priority)}`}
                              >
                                {translateMsgPriority(message.priority)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">{t('messagesCustomer')}</p>
                          <p className="font-medium">{message.customer_name}</p>
                          <p className="text-gray-500">{message.customer_email}</p>
                          {message.customer_phone && (
                            <p className="text-gray-500">{message.customer_phone}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-600">{t('messagesMessageLabel')}</p>
                          <p className="text-sm">{truncateMessage(message.message)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">{t('messagesTimeline')}</p>
                          <p className="text-xs text-gray-500">{t('messagesReceived')}: {formatDate(message.created_at)}</p>
                          {message.replied_at && (
                            <p className="text-xs text-gray-500">{t('messagesRepliedAt')}: {formatDate(message.replied_at)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {t('messagesReply')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {t('viewDetails')}
                      </Button>
                      {message.status === 'unread' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {t('messagesMarkRead')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
