"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Paperclip, Image as ImageIcon, Video, MessageCircle } from "lucide-react"
import { toast } from "sonner"

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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    loadConversations()
    connectWebSocket()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.conversation_id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connectWebSocket = () => {
    const token = localStorage.getItem('token')
    if (!token) return

    const websocket = new WebSocket('ws://localhost:8080')
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      // Authenticate
      websocket.send(JSON.stringify({
        type: 'auth',
        token: token
      }))
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_message' && selectedConversation) {
        // Add new message to current conversation
        setMessages(prev => [...prev, data.message])
        // Update conversation list
        loadConversations()
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error("Please login to access messenger")
        return
      }

      const response = await fetch('http://localhost:8000/api/backend/v1/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.data.items || [])
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error("Failed to load conversations")
    }
  }

  const loadMessages = async (conversationId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`http://localhost:8000/api/backend/v1/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.items || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error("Failed to load messages")
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('http://localhost:8000/api/backend/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.conversation_id,
          content: newMessage
        })
      })

      if (response.ok) {
        setNewMessage("")
        // Reload messages to get the new one
        loadMessages(selectedConversation.conversation_id)
        // Update conversation list
        loadConversations()
      } else {
        toast.error("Failed to send message")
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error("Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {conversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 transition-colors ${
                    selectedConversation?.conversation_id === conversation.conversation_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent'
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={conversation.avatar_url || ''} />
                      <AvatarFallback>
                        {conversation.first_name?.[0]}{conversation.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conversation.first_name} {conversation.last_name}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.last_message || 'No messages yet'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {conversation.last_message_time ? formatDate(conversation.last_message_time) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.avatar_url || ''} />
                    <AvatarFallback>
                      {selectedConversation.first_name?.[0]}{selectedConversation.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.first_name} {selectedConversation.last_name}
                    </CardTitle>
                    <p className="text-sm text-gray-500">{selectedConversation.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                {/* Messages */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.message_id}
                      className={`flex ${message.sender_id === 1 ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === 1
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_id === 1 ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isLoading}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
