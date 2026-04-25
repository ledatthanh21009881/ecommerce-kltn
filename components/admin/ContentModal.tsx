'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, FileText, Image as ImageIcon, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Content, ContentCategory } from '@/lib/content-types'
import { getAuthData } from '@/lib/admin-auth'
import { generateSlug } from '@/lib/utils'
import RichTextEditor from './RichTextEditor'
import { useLanguage } from '@/contexts/LanguageContext'

interface ContentModalProps {
  isOpen: boolean
  onClose: () => void
  content: Content | null
  categories: ContentCategory[]
  onSaved: () => void
}

export default function ContentModal({
  isOpen,
  onClose,
  content,
  categories,
  onSaved
}: ContentModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content_type: 'page' as 'page' | 'blog' | 'faq' | 'policy' | 'editorial',
    content: '',
    excerpt: '',
    featured_image: '',
    status: 'draft' as 'draft' | 'published' | 'archived' | 'scheduled',
    publish_at: '',
    display_start: '',
    display_end: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    category_ids: [] as number[]
  })

  const isHomepageVideoContent = formData.slug === 'home-hero-video'
  const isAboutPageContent = formData.slug === 'about-page'

  // Initialize form data when content changes
  useEffect(() => {
    if (content) {
      setFormData({
        title: content.title || '',
        slug: content.slug || '',
        content_type: content.content_type || 'page',
        content: content.content || '',
        excerpt: content.excerpt || '',
        featured_image: content.featured_image || '',
        status: content.status || 'draft',
        publish_at: content.publish_at ? new Date(content.publish_at).toISOString().slice(0, 16) : '',
        display_start: content.display_start ? new Date(content.display_start).toISOString().slice(0, 16) : '',
        display_end: content.display_end ? new Date(content.display_end).toISOString().slice(0, 16) : '',
        meta_title: content.meta_title || '',
        meta_description: content.meta_description || '',
        meta_keywords: content.meta_keywords || '',
        category_ids: content.categories?.map(cat => cat.category_id || (typeof cat === 'number' ? cat : (cat as any).id)) || []
      })
    } else {
      // Reset form for new content
      setFormData({
        title: '',
        slug: '',
        content_type: 'page',
        content: '',
        excerpt: '',
        featured_image: '',
        status: 'draft',
        publish_at: '',
        display_start: '',
        display_end: '',
        meta_title: '',
        meta_description: '',
        meta_keywords: '',
        category_ids: []
      })
    }
  }, [content])

  const handleInputChange = (field: string, value: string | number[] | 'page' | 'blog' | 'faq' | 'policy' | 'editorial' | 'draft' | 'published' | 'archived' | 'scheduled') => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-generate slug from title
    if (field === 'title' && typeof value === 'string' && !content) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value),
        meta_title: prev.meta_title || value
      }))
    }
  }

  const handleCategoryToggle = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      toast.error(t('contentTitleRequired'))
      return
    }

    // Home hero only needs video URL; other pages still require content body
    if (!isHomepageVideoContent) {
      const contentText = formData.content.replace(/<[^>]*>/g, '').trim()
      if (!contentText) {
        toast.error(t('contentBodyRequired'))
        return
      }
    }

    if (isHomepageVideoContent && !formData.featured_image.trim()) {
      toast.error(t('featuredImageUrl'))
      return
    }

    if (!formData.content_type) {
      toast.error(t('contentTypeRequired'))
      return
    }

    setLoading(true)

    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationRequired'))
        return
      }

      const url = content
        ? `/api/backend/v1/content/${content.content_id}`
        : '/api/backend/v1/content'

      const method = content ? 'PUT' : 'POST'

      const requestBody: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        content_type: formData.content_type,
        content: formData.content,
        excerpt: formData.excerpt,
        featured_image: formData.featured_image,
        status: formData.status,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        meta_keywords: formData.meta_keywords
      }

      if (isHomepageVideoContent) {
        requestBody.content = JSON.stringify({
          videoUrl: formData.featured_image,
        })
        requestBody.excerpt = formData.excerpt || 'Homepage hero video'
      }

      // Add publish_at if set
      if (formData.publish_at) {
        requestBody.publish_at = new Date(formData.publish_at).toISOString()
      }

      // Add display dates if set
      if (formData.display_start) {
        requestBody.display_start = new Date(formData.display_start).toISOString()
      }
      if (formData.display_end) {
        requestBody.display_end = new Date(formData.display_end).toISOString()
      }

      // Add categories if content type supports them
      if ((formData.content_type === 'blog' || formData.content_type === 'editorial') && formData.category_ids.length > 0) {
        requestBody.category_ids = formData.category_ids
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('requestFailed') }))
        
        // Hiển thị chi tiết validation errors nếu có
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ')
          toast.error(`${errorData.message || t('validationError')}: ${errorMessages}`)
        } else {
          toast.error(errorData.message || t('failedToSaveContent'))
        }
        return
      }

      const data = await response.json()

      if (data.success) {
        toast.success(content ? t('contentUpdatedSuccessfully') : t('contentCreatedSuccessfully'))
        onSaved()
        onClose()
      } else {
        // Hiển thị chi tiết validation errors nếu có
        if (data.errors && typeof data.errors === 'object') {
          const errorMessages = Object.entries(data.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ')
          toast.error(`${data.message || t('validationError')}: ${errorMessages}`)
        } else {
          toast.error(data.message || t('failedToSaveContent'))
        }
      }
    } catch (error) {
      console.error('Error saving content:', error)
      toast.error(`${t('errorSavingContent')}: ${error instanceof Error ? error.message : t('unknownError')}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const showCategories = formData.content_type === 'blog' || formData.content_type === 'editorial'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {content ? t('editContent') : t('createNewContent')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                {t('title')} *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={t('enterContentTitle')}
                required
                className="w-full"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium text-gray-700">
                Slug
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder={t('urlFriendlySlug')}
                className="w-full"
              />
              <p className="text-xs text-gray-500">{t('urlFriendlyVersion')}</p>
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <Label htmlFor="content_type" className="text-sm font-medium text-gray-700">
                {t('contentType')} *
              </Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => handleInputChange('content_type', value as any)}
                required
              >
                <SelectTrigger id="content_type" className="w-full border-gray-300 focus:ring-2 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">{t('page')}</SelectItem>
                  <SelectItem value="blog">{t('blogPost')}</SelectItem>
                  <SelectItem value="faq">{t('faq')}</SelectItem>
                  <SelectItem value="policy">{t('policy')}</SelectItem>
                  <SelectItem value="editorial">{t('editorial')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rich Text Content */}
          {!isHomepageVideoContent && (
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium text-gray-700">
                {t('content')} *
              </Label>
              <RichTextEditor
                key={`editor-${content?.content_id || 'new'}-${isOpen}`}
                value={formData.content}
                onChange={(value) => handleInputChange('content', value)}
                placeholder={isAboutPageContent ? 'Nhập nội dung trang giới thiệu...' : t('enterContentPlaceholder')}
              />
            </div>
          )}

          {/* Excerpt */}
          {!isHomepageVideoContent && (
            <div className="space-y-2">
              <Label htmlFor="excerpt" className="text-sm font-medium text-gray-700">
                {t('excerpt')}
              </Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                placeholder={t('briefContentDescription')}
                rows={3}
                className="w-full"
              />
            </div>
          )}

          {/* Featured Image */}
          <div className="space-y-2">
            <Label htmlFor="featured_image" className="text-sm font-medium text-gray-700">
              {t('featuredImageUrl')}
            </Label>
            <div className="flex gap-2">
              <ImageIcon className="h-4 w-4 text-gray-400 mt-2" />
              <Input
                id="featured_image"
                value={formData.featured_image}
                onChange={(e) => handleInputChange('featured_image', e.target.value)}
                placeholder={isHomepageVideoContent ? 'https://.../video.mp4' : t('featuredImagePlaceholder')}
                type="url"
                className="w-full"
              />
            </div>
            {isHomepageVideoContent && (
              <p className="text-xs text-gray-500">Trang chu chi thay doi video, chi can cap nhat URL video o day.</p>
            )}
          </div>

          {/* Status and Publishing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                {t('status')}
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as any)}
              >
                <SelectTrigger id="status" className="w-full border-gray-300 focus:ring-2 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('draft')}</SelectItem>
                  <SelectItem value="published">{t('contentPublished')}</SelectItem>
                  <SelectItem value="scheduled">{t('scheduled')}</SelectItem>
                  <SelectItem value="archived">{t('archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Publish At */}
            <div className="space-y-2">
              <Label htmlFor="publish_at" className="text-sm font-medium text-gray-700">
                {t('publishDateTime')}
              </Label>
              <Input
                id="publish_at"
                type="datetime-local"
                value={formData.publish_at}
                onChange={(e) => handleInputChange('publish_at', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Display Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_start" className="text-sm font-medium text-gray-700">
                {t('displayStartOptional')}
              </Label>
              <Input
                id="display_start"
                type="datetime-local"
                value={formData.display_start}
                onChange={(e) => handleInputChange('display_start', e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_end" className="text-sm font-medium text-gray-700">
                {t('displayEndOptional')}
              </Label>
              <Input
                id="display_end"
                type="datetime-local"
                value={formData.display_end}
                onChange={(e) => handleInputChange('display_end', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Categories (for blog/editorial) */}
          {showCategories && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('categories')}
              </Label>
              <div className="border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('noCategoriesAvailable')}</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label
                        key={category.category_id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.category_ids.includes(category.category_id)}
                          onChange={() => handleCategoryToggle(category.category_id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEO Fields */}
          {!isHomepageVideoContent && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">{t('seoSettings')}</h3>
              <div className="space-y-2">
                <Label htmlFor="meta_title" className="text-sm font-medium text-gray-700">
                  {t('metaTitle')}
                </Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => handleInputChange('meta_title', e.target.value)}
                  placeholder={t('metaTitlePlaceholder')}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description" className="text-sm font-medium text-gray-700">
                  {t('metaDescription')}
                </Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => handleInputChange('meta_description', e.target.value)}
                  placeholder={t('metaDescriptionPlaceholder')}
                  rows={3}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_keywords" className="text-sm font-medium text-gray-700">
                  {t('metaKeywords')}
                </Label>
                <Input
                  id="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={(e) => handleInputChange('meta_keywords', e.target.value)}
                  placeholder={t('metaKeywordsPlaceholder')}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {content ? t('updateContent') : t('createContent')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

