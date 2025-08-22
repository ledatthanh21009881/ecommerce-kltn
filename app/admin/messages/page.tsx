'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, MessageSquare, Mail, Phone, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

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
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/messages')
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data || [])
      } else {
        toast.error('Failed to fetch messages')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Error fetching messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Message Management</h1>
          <p className="text-slate-600">Manage customer inquiries and support messages</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Messages</p>
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
                  <p className="text-sm font-medium text-slate-600">Unread</p>
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
                  <p className="text-sm font-medium text-slate-600">Read</p>
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
                  <p className="text-sm font-medium text-slate-600">Replied</p>
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
                  <p className="text-sm font-medium text-slate-600">Support</p>
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
                  <p className="text-sm font-medium text-slate-600">Inquiries</p>
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
                    placeholder="Search by customer name, email or subject..."
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
                  <option value="">All Status</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="support">Support</option>
                  <option value="inquiry">Inquiry</option>
                  <option value="complaint">Complaint</option>
                  <option value="feedback">Feedback</option>
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
                  Refresh
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </Button>
              </div>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
              <p className="text-gray-500">No messages match your search criteria.</p>
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
                              {message.message_type.charAt(0).toUpperCase() + message.message_type.slice(1)}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`flex items-center gap-1 ${getStatusColor(message.status)}`}
                            >
                              {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                            </Badge>
                            {message.priority && (
                              <Badge 
                                variant="outline" 
                                className={`flex items-center gap-1 ${getPriorityColor(message.priority)}`}
                              >
                                {message.priority.charAt(0).toUpperCase() + message.priority.slice(1)} Priority
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Customer</p>
                          <p className="font-medium">{message.customer_name}</p>
                          <p className="text-gray-500">{message.customer_email}</p>
                          {message.customer_phone && (
                            <p className="text-gray-500">{message.customer_phone}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-600">Message</p>
                          <p className="text-sm">{truncateMessage(message.message)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Timeline</p>
                          <p className="text-xs text-gray-500">Received: {formatDate(message.created_at)}</p>
                          {message.replied_at && (
                            <p className="text-xs text-gray-500">Replied: {formatDate(message.replied_at)}</p>
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
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        View Details
                      </Button>
                      {message.status === 'unread' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Read
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
