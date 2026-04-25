'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Category } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  categories: Category[]
  onSaved: () => void
}

export default function CategoryModal({ isOpen, onClose, category, categories, onSaved }: CategoryModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    category_name: '',
    slug: '',
    parent_id: '',
    is_active: true,
  })

  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        slug: category.slug,
        parent_id: category.parent_id?.toString() || '',
        is_active: category.is_active,
      })
    } else {
      setFormData({
        category_name: '',
        slug: '',
        parent_id: '',
        is_active: true,
      })
    }
  }, [category])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))

    if (field === 'category_name' && typeof value === 'string') {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category_name.trim()) {
      toast.error(t('categoryNameRequired'))
      return
    }

    setLoading(true)

    try {
      const { token } = getAuthData()
      const url = category
        ? `/api/backend/v1/categories/update?id=${category.category_id}`
        : '/api/backend/v1/categories'

      const method = category ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        category_name: formData.category_name,
        slug: formData.slug,
        parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
        is_active: formData.is_active,
      }
      if (category) {
        body.position = category.position
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Error response:', errorText)

        if (response.status === 401) {
          toast.error(t('authenticationFailed'))
          return
        }

        toast.error(t('requestFailed'))
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
      console.error('❌ Error saving category:', error)

      if (error instanceof SyntaxError) {
        toast.error(t('invalidResponse'))
      } else if (error instanceof TypeError) {
        toast.error(t('networkError'))
      } else {
        toast.error(`Error saving category: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const parentSelectValue = formData.parent_id === '' ? 'none' : formData.parent_id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
              <Folder className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {category ? t('editCategory') : t('addNewCategory')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category_name" className="text-sm font-medium text-gray-700">
              {t('categoryName')} *
            </Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) => handleInputChange('category_name', e.target.value)}
              placeholder={t('enterCategoryName')}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-medium text-gray-700">
              {t('slug')}
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

          <div className="space-y-2">
            <Label htmlFor="parent_id" className="text-sm font-medium text-gray-700">
              {t('parentCategory')}
            </Label>
            <Select
              value={parentSelectValue}
              onValueChange={(v) => handleInputChange('parent_id', v === 'none' ? '' : v)}
            >
              <SelectTrigger id="parent_id" className="w-full border-slate-200 bg-white text-left">
                <SelectValue placeholder={t('noParentMainCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('noParentMainCategory')}</SelectItem>
                {categories
                  .filter(cat => !cat.parent_id && cat.category_id !== category?.category_id)
                  .map(cat => (
                    <SelectItem key={cat.category_id} value={String(cat.category_id)}>
                      {cat.category_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-gray-700">{t('activeStatus')}</Label>
              <p className="text-xs text-gray-500">{t('enableOrDisableCategory')}</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>

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
