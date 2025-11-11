'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, FileText, Plus, Calendar, Eye, Edit, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { Content, ContentCategory } from '@/lib/content-types'
import ContentModal from '@/components/admin/ContentModal'
import ContentCategoryModal from '@/components/admin/ContentCategoryModal'

export default function AdminContentPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pages: 0,
    blogs: 0,
    faqs: 0,
    published: 0
  })

  // Fetch stats
  const fetchStats = async () => {
    try {
      const { token } = getAuthData()
      if (!token) return
      
      const response = await fetch('/api/backend/v1/content/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success && data.data) {
        setStats({
          total: data.data.total || 0,
          pages: data.data.pages || 0,
          blogs: data.data.blogs || 0,
          faqs: data.data.faqs || 0,
          published: data.data.published || 0
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Fetch contents
  const fetchContents = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      
      if (!token) {
        toast.error('Authentication required')
        return
      }
      
      const response = await fetch('/api/backend/v1/content', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Handle paginated response (items) or direct array
        const contentsList = data.data?.items || data.data || []
        setContents(Array.isArray(contentsList) ? contentsList : [])
      } else {
        // Still set empty array to avoid errors
        setContents([])
        if (data.message && !data.message.includes('empty')) {
          toast.error(data.message || 'Failed to fetch content')
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      setContents([])
      toast.error('Error fetching content')
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { token } = getAuthData()
      if (!token) return

      const response = await fetch('/api/backend/v1/content/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchContents()
    fetchStats()
    fetchCategories()
  }, [])

  // Handlers
  const handleCreateContent = () => {
    setSelectedContent(null)
    setContentModalOpen(true)
  }

  const handleEditContent = (content: Content) => {
    setSelectedContent(content)
    setContentModalOpen(true)
  }

  const handleDeleteContent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return
    }

    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error('Authentication required')
        return
      }

      console.log('[DELETE] Frontend request:', { id, url: `/api/backend/v1/content/${id}` })

      const response = await fetch(`/api/backend/v1/content/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('[DELETE] Response status:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Handle response - support both 204 No Content and JSON response
      let data: any = { success: false, message: 'Unknown error', status_code: response.status }
      
      // If status is 204 No Content, assume success (REST standard)
      if (response.status === 204) {
        console.log('[DELETE] Response is 204 No Content - assuming success')
        data = { success: true, message: 'Content deleted successfully', status_code: 204 }
      } else {
        // Try to parse JSON response
        try {
          const responseText = await response.text()
          console.log('[DELETE] Response body:', {
            length: responseText.length,
            preview: responseText.substring(0, 200),
            isEmpty: !responseText.trim()
          })
          
          // If response body is empty but status is OK, assume success
          if (!responseText.trim()) {
            if (response.ok || response.status === 200) {
              console.log('[DELETE] Empty body but status OK - assuming success')
              data = { success: true, message: 'Content deleted successfully', status_code: response.status }
            } else {
              console.warn('[DELETE] Empty response body with non-OK status')
              data = { success: false, message: `Server returned ${response.status} ${response.statusText || ''}`, status_code: response.status }
            }
          } else {
            // Parse JSON if body is not empty
            data = JSON.parse(responseText)
            console.log('[DELETE] Parsed response:', data)
            
            // Validate parsed data
            if (typeof data !== 'object' || data === null) {
              console.warn('[DELETE] Parsed data is not an object:', data)
              data = { success: response.ok || response.status === 200, message: 'Invalid response format', status_code: response.status }
            } else if (Object.keys(data).length === 0) {
              console.warn('[DELETE] Parsed data is empty object - using status to determine success')
              data = { 
                success: response.ok || response.status === 200, 
                message: response.ok || response.status === 200 ? 'Content deleted successfully' : 'Empty response from server', 
                status_code: response.status 
              }
            }
          }
        } catch (parseError) {
          console.error('[DELETE] Failed to parse JSON:', parseError)
          // If parsing fails but status is OK, assume success
          if (response.ok || response.status === 200 || response.status === 204) {
            data = { success: true, message: 'Content deleted successfully', status_code: response.status }
          } else {
            data = {
              success: false,
              message: `Invalid response format (HTTP ${response.status})`,
              status_code: response.status
            }
          }
        }
      }

      // Ensure we always have success (boolean) and message (string)
      const success = typeof data?.success === 'boolean' ? data.success : (response.ok || response.status === 200 || response.status === 204)
      const message = typeof data?.message === 'string' && data.message.trim() 
        ? data.message.trim() 
        : (data?.errors || (success ? 'Content deleted successfully' : 'Unknown error occurred'))

      if (success) {
        toast.success(message)
        fetchContents()
        fetchStats()
      } else {
        toast.error(message)
        console.error('[DELETE] Error response:', {
          status: response.status,
          statusText: response.statusText,
          responseData: data,
          successType: typeof data?.success,
          messageType: typeof data?.message,
          hasMessage: !!data?.message
        })
      }
    } catch (error: any) {
      console.error('[DELETE] Network or other error:', error)
      toast.error(error?.message || 'Error deleting content. Please check your connection.')
    }
  }

  const handlePublishContent = async (id: number) => {
    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/backend/v1/content/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Content published successfully')
        fetchContents()
        fetchStats()
      } else {
        toast.error(data.message || 'Failed to publish content')
      }
    } catch (error) {
      console.error('Error publishing content:', error)
      toast.error('Error publishing content')
    }
  }

  const handleViewContent = (content: Content) => {
    // Open in new tab or navigate to preview
    if (content.slug && content.status === 'published') {
      window.open(`/${content.slug}`, '_blank')
    } else {
      toast.info('Content is not yet published')
    }
  }

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setCategoryModalOpen(true)
  }

  const handleEditCategory = (category: ContentCategory) => {
    setSelectedCategory(category)
    setCategoryModalOpen(true)
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return
    }

    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/backend/v1/content/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Category deleted successfully')
        fetchCategories()
      } else {
        toast.error(data.message || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Error deleting category')
    }
  }

  const handleContentSaved = () => {
    fetchContents()
    fetchStats()
  }

  const handleCategorySaved = () => {
    fetchCategories()
  }

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
                  onClick={handleCreateContent}
                >
                  <Plus className="h-4 w-4" />
                  Create Content
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleCreateCategory}
                >
                  <Plus className="h-4 w-4" />
                  Manage Categories
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
                      {truncateContent(content.excerpt || content.content)}
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-2 text-sm">
                      {(content.author || content.author_name) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Author:</span>
                          <span className="font-medium">{content.author_name || content.author}</span>
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
                        onClick={() => handleEditContent(content)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewContent(content)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {content.status === 'draft' || content.status === 'scheduled' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublishContent(content.content_id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContent(content.content_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modals */}
        <ContentModal
          isOpen={contentModalOpen}
          onClose={() => {
            setContentModalOpen(false)
            setSelectedContent(null)
          }}
          content={selectedContent}
          categories={categories}
          onSaved={handleContentSaved}
        />

        <ContentCategoryModal
          isOpen={categoryModalOpen}
          onClose={() => {
            setCategoryModalOpen(false)
            setSelectedCategory(null)
          }}
          category={selectedCategory}
          onSaved={handleCategorySaved}
        />
      </div>
    </div>
  )
}
