'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ContentCategory } from '@/lib/content-types'
import { getAuthData } from '@/lib/admin-auth'
import { generateSlug } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface ContentCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: ContentCategory | null
  onSaved: () => void
}

export default function ContentCategoryModal({
  isOpen,
  onClose,
  category,
  onSaved
}: ContentCategoryModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  })

  // Initialize form data when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || ''
      })
    } else {
      // Reset form for new category
      setFormData({
        name: '',
        slug: '',
        description: ''
      })
    }
  }, [category])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-generate slug from name
    if (field === 'name' && !category) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error(t('categoryNameRequired'))
      return
    }

    setLoading(true)

    try {
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationRequired'))
        return
      }

      const url = category
        ? `/api/backend/v1/content/categories/${category.category_id}`
        : '/api/backend/v1/content/categories'

      const method = category ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          description: formData.description || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('requestFailed') }))
        toast.error(errorData.message || t('failedToSaveCategory'))
        return
      }

      const data = await response.json()

      if (data.success) {
        toast.success(category ? t('categoryUpdatedSuccessfully') : t('categoryCreatedSuccessfully'))
        onSaved()
        onClose()
      } else {
        toast.error(data.message || t('failedToSaveCategory'))
      }
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error(`${t('errorSavingCategory')}: ${error instanceof Error ? error.message : t('unknownError')}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
              <Folder className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {category ? t('editCategory') : t('createNewCategory')}
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
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              {t('categoryName')} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('enterCategoryName')}
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
              placeholder={t('categorySlug')}
              className="w-full"
            />
            <p className="text-xs text-gray-500">{t('urlFriendlyVersion')}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              {t('description')}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('categoryDescriptionOptional')}
              rows={3}
              className="w-full"
            />
          </div>

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
                  {category ? t('updateCategory') : t('createCategory')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

