'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Category } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  categories: Category[]
  onSaved: () => void
}

export default function CategoryModal({ isOpen, onClose, category, categories, onSaved }: CategoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    category_name: '',
    slug: '',
    parent_id: '',
    position: '',
    is_active: true
  })

  // Initialize form data when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        slug: category.slug,
        parent_id: category.parent_id?.toString() || '',
        position: category.position.toString(),
        is_active: category.is_active
      })
    } else {
      // Reset form for new category
      setFormData({
        category_name: '',
        slug: '',
        parent_id: '',
        position: '',
        is_active: true
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
      [field]: value
    }))

    // Auto-generate slug when category name changes
    if (field === 'category_name' && typeof value === 'string') {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category_name.trim()) {
      toast.error('Category name is required')
      return
    }

    setLoading(true)

    try {
      const { token } = getAuthData()
      const url = category 
        ? `/api/backend/v1/categories/update?id=${category.category_id}`
        : '/api/backend/v1/categories'
      
      const method = category ? 'PUT' : 'POST'
      
      console.log('🌐 Making category request to:', url)
      console.log('📤 Request method:', method)
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category_name: formData.category_name,
          slug: formData.slug,
          parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
          position: parseInt(formData.position) || 1,
          is_active: formData.is_active
        })
      })

      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Error response:', errorText)
        
        if (response.status === 401) {
          toast.error('Authentication failed. Please login again.')
          return
        }
        
        toast.error(`Request failed: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.json()
      console.log('✅ Response data:', data)
      
      if (data.success) {
        toast.success(category ? 'Category updated successfully' : 'Category created successfully')
        onSaved()
        onClose()
      } else {
        toast.error(data.message || 'Failed to save category')
      }
    } catch (error) {
      console.error('❌ Error saving category:', error)
      
      if (error instanceof SyntaxError) {
        toast.error('Invalid response from server. Please try again.')
      } else if (error instanceof TypeError) {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error(`Error saving category: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md"
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
              {category ? 'Edit Category' : 'Add New Category'}
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
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="category_name" className="text-sm font-medium text-gray-700">
              Category Name *
            </Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) => handleInputChange('category_name', e.target.value)}
              placeholder="Enter category name"
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
              placeholder="category-slug"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              URL-friendly version of the category name
            </p>
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <Label htmlFor="parent_id" className="text-sm font-medium text-gray-700">
              Parent Category
            </Label>
            <select
              id="parent_id"
              value={formData.parent_id}
              onChange={(e) => handleInputChange('parent_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No Parent (Main Category)</option>
              {categories
                .filter(cat => !cat.parent_id && cat.category_id !== category?.category_id) // Only show main categories as parents, exclude current category
                .map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))
              }
            </select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position" className="text-sm font-medium text-gray-700">
              Position
            </Label>
            <Input
              id="position"
              type="number"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              placeholder="1"
              min="1"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Order in which this category appears
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-gray-700">
                Active Status
              </Label>
              <p className="text-xs text-gray-500">
                Enable or disable this category
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {category ? 'Update Category' : 'Create Category'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

