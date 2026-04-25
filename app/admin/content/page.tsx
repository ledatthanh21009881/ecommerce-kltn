'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, RefreshCw, Plus, Calendar, Eye, Edit, Trash2, Send, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpDown, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ConfirmModal from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { Content, ContentCategory } from '@/lib/content-types'
import ContentModal from '@/components/admin/ContentModal'
import ContentCategoryModal from '@/components/admin/ContentCategoryModal'
import CollectionsManager, { CollectionsManagerRef } from '@/components/admin/CollectionsManager'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminContentPage() {
  const { t } = useLanguage()
  const [contents, setContents] = useState<Content[]>([])
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'content' | 'category'; id: number } | null>(null)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'contents' | 'collections'>('contents')
  const [limit] = useState(12)
  const [pagination, setPagination] = useState<{ total: number; current_page: number; last_page: number; from: number; to: number } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_content_view') as 'list' | 'grid') || 'list'
    return 'list'
  })

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_content_view', mode)
  }
  const [collectionsViewMode, setCollectionsViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_collections_view') as 'list' | 'grid') || 'list'
    return 'list'
  })
  const collectionsManagerRef = useRef<CollectionsManagerRef | null>(null)

  const setCollectionsViewModeAndStore = (mode: 'list' | 'grid') => {
    setCollectionsViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_collections_view', mode)
  }

  // Fetch contents
  const fetchContents = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      
      if (!token) {
        toast.error(t('authenticationRequired'))
        return
      }
      
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (searchTerm) params.set('search', searchTerm)
      if (typeFilter !== 'all') params.set('content_type', typeFilter)
      const response = await fetch(`/api/backend/v1/content?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        const contentsList = data.data?.items || data.data || []
        setContents(Array.isArray(contentsList) ? contentsList : [])
        if (data.data?.pagination) {
          setPagination({
            total: data.data.pagination.total,
            current_page: data.data.pagination.current_page,
            last_page: data.data.pagination.last_page,
            from: data.data.pagination.from ?? (page - 1) * limit + 1,
            to: data.data.pagination.to ?? Math.min(page * limit, data.data.pagination.total)
          })
        } else setPagination(null)
      } else {
        // Still set empty array to avoid errors
        setContents([])
        if (data.message && !data.message.includes('empty')) {
          toast.error(t('failedToFetchContent'))
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      setContents([])
      toast.error(t('errorFetchingContent'))
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
    setPage(1)
  }, [searchTerm, typeFilter])

  useEffect(() => {
    fetchContents()
  }, [page, searchTerm, typeFilter])

  useEffect(() => {
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

  const confirmDeleteContent = async (id: number) => {
    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationRequired'))
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
      let data: any = { success: false, message: t('unknownError'), status_code: response.status }
      
      // If status is 204 No Content, assume success (REST standard)
      if (response.status === 204) {
        console.log('[DELETE] Response is 204 No Content - assuming success')
        data = { success: true, message: t('contentDeletedSuccessfully'), status_code: 204 }
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
              data = { success: true, message: t('contentDeletedSuccessfully'), status_code: response.status }
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
              data = { success: response.ok || response.status === 200, message: t('invalidResponseFormat'), status_code: response.status }
            } else if (Object.keys(data).length === 0) {
              console.warn('[DELETE] Parsed data is empty object - using status to determine success')
              data = { 
                success: response.ok || response.status === 200, 
                message: response.ok || response.status === 200 ? t('contentDeletedSuccessfully') : t('emptyResponseFromServer'),
                status_code: response.status 
              }
            }
          }
        } catch (parseError) {
          console.error('[DELETE] Failed to parse JSON:', parseError)
          // If parsing fails but status is OK, assume success
          if (response.ok || response.status === 200 || response.status === 204) {
            data = { success: true, message: t('contentDeletedSuccessfully'), status_code: response.status }
          } else {
            data = {
              success: false,
              message: t('invalidResponseFormatWithStatus', { status: String(response.status) }),
              status_code: response.status
            }
          }
        }
      }

      // Ensure we always have success (boolean) and message (string)
      const success = typeof data?.success === 'boolean' ? data.success : (response.ok || response.status === 200 || response.status === 204)
      const message = typeof data?.message === 'string' && data.message.trim()
        ? data.message.trim()
        : (data?.errors || (success ? t('contentDeletedSuccessfully') : t('unknownErrorOccurred')))

      if (success) {
        toast.success(t('contentDeletedSuccessfully'))
        fetchContents()
      } else {
        toast.error(t('failedToDeleteContent'))
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
      toast.error(error?.message || t('errorDeletingContentWithConnection'))
    }
  }

  const handleDeleteContent = (id: number) => {
    setDeleteTarget({ type: 'content', id })
    setIsDeleteModalOpen(true)
  }

  const handlePublishContent = async (id: number) => {
    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationRequired'))
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
        toast.success(t('contentPublishedSuccessfully'))
        fetchContents()
      } else {
        toast.error(t('failedToPublishContent'))
      }
    } catch (error) {
      console.error('Error publishing content:', error)
      toast.error(t('errorPublishingContent'))
    }
  }

  const handleViewContent = (content: Content) => {
    // Open in new tab or navigate to preview
    if (content.slug && content.status === 'published') {
      window.open(`/${content.slug}`, '_blank')
    } else {
      toast.info(t('contentNotPublishedYet'))
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

  const confirmDeleteCategory = async (id: number) => {
    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationRequired'))
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
        toast.success(t('categoryDeletedSuccessfully'))
        fetchCategories()
      } else {
        toast.error(t('failedToDeleteCategory'))
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error(t('errorDeletingCategory'))
    }
  }

  const handleDeleteCategory = (id: number) => {
    setDeleteTarget({ type: 'category', id })
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'content') {
      await confirmDeleteContent(deleteTarget.id)
    } else {
      await confirmDeleteCategory(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const handleContentSaved = () => {
    fetchContents()
  }

  const handleCategorySaved = () => {
    fetchCategories()
  }

  // Filter contents
  const filteredContents = contents.filter(content => {
    const matchesSearch = 
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || content.content_type === typeFilter
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('contentManagement')}</h1>
            <p className="admin-page-description">{t('contentManagementDesc')}</p>
          </div>
          {activeTab === 'contents' && (
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
                <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}>
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={fetchContents} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button className="flex items-center gap-2" onClick={handleCreateContent}>
                <Plus className="h-4 w-4" />
                {t('createContent')}
              </Button>
              <Button variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white" onClick={handleCreateCategory}>
                <Plus className="h-4 w-4" />
                {t('manageCategories')}
              </Button>
            </div>
          )}
          {activeTab === 'collections' && (
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
                <Button variant="ghost" size="sm" onClick={() => setCollectionsViewModeAndStore('list')} className={`rounded-none ${collectionsViewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}>
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCollectionsViewModeAndStore('grid')} className={`rounded-none ${collectionsViewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => collectionsManagerRef.current?.refreshCollections()}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
              >
                <RefreshCw className="h-4 w-4" />
                {t('refresh')}
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
                onClick={() => collectionsManagerRef.current?.openSortModal()}
              >
                <ArrowUpDown className="h-4 w-4" />
                {t('sortCollections')}
              </Button>
              <Button className="flex items-center gap-2" onClick={() => collectionsManagerRef.current?.openCreateModal()}>
                <Plus className="h-4 w-4" />
                {t('createCollection')}
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6 border-b border-slate-200">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('contents')}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === 'contents' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('cmsContentTab')}
              {activeTab === 'contents' && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-slate-900 rounded-full" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collections')}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === 'collections' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('collectionsTab')}
              {activeTab === 'collections' && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-slate-900 rounded-full" />}
            </button>
          </div>
        </div>

        {activeTab === 'collections' ? (
          <CollectionsManager ref={collectionsManagerRef} isVisible viewMode={collectionsViewMode} />
        ) : (
          <>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchContentPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('type')}</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="min-w-[170px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allTypes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allTypes')}</SelectItem>
                      <SelectItem value="page">{t('contentPages')}</SelectItem>
                      <SelectItem value="blog">{t('blogPosts')}</SelectItem>
                      <SelectItem value="faq">{t('faqs')}</SelectItem>
                      <SelectItem value="policy">{t('policies')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noContentFound')}</h3>
              <p className="text-slate-500">{t('noContentMatch')}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('title')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('type')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('created')}</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContents.map((content) => (
                      <tr key={content.content_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-900 line-clamp-1">{content.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{truncateContent(content.excerpt || content.content)}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getTypeColor(content.content_type)}>
                            {content.content_type === 'page'
                              ? t('page')
                              : content.content_type === 'blog'
                                ? t('blog')
                                : content.content_type === 'faq'
                                  ? t('faq')
                                  : content.content_type === 'policy'
                                    ? t('policy')
                                    : content.content_type}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getStatusColor(content.status)}>
                            {content.status === 'published'
                                ? t('contentPublished')
                              : content.status === 'draft'
                                ? t('draft')
                                : content.status === 'archived'
                                  ? t('archived')
                                  : content.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">{formatDate(content.created_at)}</td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditContent(content)} className="bg-white/80 border-slate-200 hover:bg-white"><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleViewContent(content)} className="bg-white/80 border-slate-200 hover:bg-white"><Eye className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteContent(content.content_id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <Card key={content.content_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
                          {content.content_type === 'page'
                            ? t('page')
                            : content.content_type === 'blog'
                              ? t('blog')
                              : content.content_type === 'faq'
                                ? t('faq')
                                : content.content_type === 'policy'
                                  ? t('policy')
                                  : content.content_type === 'editorial'
                                    ? t('editorial')
                                    : content.content_type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getStatusColor(content.status)}`}
                        >
                          {content.status === 'published'
                            ? t('contentPublished')
                            : content.status === 'draft'
                              ? t('draft')
                              : content.status === 'scheduled'
                                ? t('scheduled')
                                : content.status === 'archived'
                                  ? t('archived')
                                  : content.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {truncateContent(content.excerpt || content.content)}
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-2 text-sm">
                      {content.author_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('author')}:</span>
                          <span className="font-medium">{content.author_name}</span>
                        </div>
                      )}
                      {content.view_count !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('views')}:</span>
                          <span className="font-medium">{content.view_count}</span>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>{t('created')}:</span>
                        <span>{formatDate(content.created_at)}</span>
                      </div>
                      {content.updated_at && content.updated_at !== content.created_at && (
                        <div className="flex justify-between">
                          <span>{t('updated')}:</span>
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
                        {t('edit')}
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

        {/* Pagination */}
        {!loading && filteredContents.length > 0 && pagination && pagination.last_page > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-6">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  {t('showingXOfY', { from: String(pagination.from), to: String(pagination.to), total: String(pagination.total) })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.current_page <= 1} className="bg-white/80 border-slate-200">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600 px-2">{t('pageOf', { current: String(pagination.current_page), total: String(pagination.last_page) })}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))} disabled={pagination.current_page >= pagination.last_page} className="bg-white/80 border-slate-200">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeleteTarget(null)
          }}
          onConfirm={confirmDelete}
          title={deleteTarget?.type === 'category' ? t('deleteCategory') : t('delete')}
          description={deleteTarget?.type === 'category' ? t('deleteCategoryConfirmShort') : t('deleteContentConfirm')}
          confirmText={t('delete')}
          cancelText={t('cancel')}
        />
        </>
        )}
      </div>
    </div>
  )
}
