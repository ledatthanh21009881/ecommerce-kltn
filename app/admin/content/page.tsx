'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, FileText, Plus, Calendar, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface Content {
  content_id: number
  title: string
  content_type: string
  content: string
  status: string
  author?: string
  created_at: string
  updated_at?: string
  view_count?: number
}

export default function AdminContentPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Fetch contents
  const fetchContents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/content')
      const data = await response.json()
      
      if (data.success) {
        setContents(data.data || [])
      } else {
        toast.error('Failed to fetch content')
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      toast.error('Error fetching content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContents()
  }, [])

  // Filter contents
  const filteredContents = contents.filter(content => {
    const matchesSearch = 
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || content.content_type === typeFilter
    return matchesSearch && matchesType
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'page':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'blog':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'faq':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'policy':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getContentStats = () => {
    const stats = {
      total: contents.length,
      pages: contents.filter(c => c.content_type === 'page').length,
      blogs: contents.filter(c => c.content_type === 'blog').length,
      faqs: contents.filter(c => c.content_type === 'faq').length,
      published: contents.filter(c => c.status === 'published').length
    }
    return stats
  }

  const stats = getContentStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Content Management</h1>
          <p className="text-slate-600">Manage your website content and pages</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Content</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pages</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pages}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📄</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Blog Posts</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.blogs}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">📝</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">FAQs</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.faqs}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">❓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Published</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.published}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
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
                    placeholder="Search content by title or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="page">Pages</option>
                  <option value="blog">Blog Posts</option>
                  <option value="faq">FAQs</option>
                  <option value="policy">Policies</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchContents}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Content
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredContents.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
              <p className="text-gray-500">No content matches your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <Card key={content.content_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                          {content.title}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getTypeColor(content.content_type)}`}
                        >
                          {content.content_type.charAt(0).toUpperCase() + content.content_type.slice(1)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getStatusColor(content.status)}`}
                        >
                          {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {truncateContent(content.content)}
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-2 text-sm">
                      {content.author && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Author:</span>
                          <span className="font-medium">{content.author}</span>
                        </div>
                      )}
                      {content.view_count !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Views:</span>
                          <span className="font-medium">{content.view_count}</span>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{formatDate(content.created_at)}</span>
                      </div>
                      {content.updated_at && content.updated_at !== content.created_at && (
                        <div className="flex justify-between">
                          <span>Updated:</span>
                          <span>{formatDate(content.updated_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
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
