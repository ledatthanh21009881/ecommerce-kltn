'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Folder, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import CategoryModal from '@/components/admin/CategoryModal'
import { Category } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)


  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/categories')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data || [])
      } else {
        toast.error('Failed to fetch categories')
      }
    } catch (error) {
      toast.error('Error fetching categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.slug.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Handle category operations
  const handleViewCategory = (category: Category) => {
    toast.info(`Category: ${category.category_name}`, {
      description: `Slug: ${category.slug}, Position: ${category.position}, Active: ${category.is_active ? 'Yes' : 'No'}`
    })
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const handleDeleteCategory = (categoryId: number) => {
    setDeletingCategoryId(categoryId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteCategory = async () => {
    if (!deletingCategoryId) return

    try {
      const { token } = getAuthData()
      console.log('🗑️ Deleting category ID:', deletingCategoryId)
      
      const response = await fetch(`/api/backend/v1/categories/delete?id=${deletingCategoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📥 Delete response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Delete error response:', errorText)
        
        if (response.status === 401) {
          toast.error('Authentication failed. Please login again.')
          return
        }
        
        toast.error(`Delete failed: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.json()
      console.log('✅ Delete response data:', data)
      
      if (data.success) {
        toast.success('Category deleted successfully')
        fetchCategories()
      } else {
        toast.error(data.message || 'Failed to delete category')
      }
    } catch (error) {
      console.error('❌ Error deleting category:', error)
      
      if (error instanceof SyntaxError) {
        toast.error('Invalid response from server. Please try again.')
      } else if (error instanceof TypeError) {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error(`Error deleting category: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setDeletingCategoryId(null)
    }
  }



  // Calculate stats
  const totalCategories = categories.length
  const activeCategories = categories.filter(c => c.is_active).length
  const mainCategories = categories.filter(c => !c.parent_id).length
  const subCategories = categories.filter(c => c.parent_id).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Category Management</h1>
          <p className="text-slate-600">Organize your products with categories and sub-categories</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Categories</p>
                  <p className="text-2xl font-bold text-slate-900">{totalCategories}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Folder className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Categories</p>
                  <p className="text-2xl font-bold text-slate-900">{activeCategories}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Main Categories</p>
                  <p className="text-2xl font-bold text-slate-900">{mainCategories}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📁</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Sub Categories</p>
                  <p className="text-2xl font-bold text-slate-900">{subCategories}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📂</span>
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
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchCategories}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={handleAddCategory}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Table */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-gray-600">Get started by creating your first category.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Category Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Slug</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Position</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.category_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <Folder className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{category.category_name}</div>
                              {category.parent_name && (
                                <div className="text-sm text-gray-500">Parent: {category.parent_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{category.slug}</td>
                        <td className="py-4 px-4">
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{category.position}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewCategory(category)}
                              className="bg-white text-gray-900 hover:bg-gray-100"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEditCategory(category)}
                              className="bg-white text-gray-900 hover:bg-gray-100"
                              title="Edit Category"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteCategory(category.category_id)}
                              className="bg-red-600 hover:bg-red-700"
                              title="Delete Category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Modal */}
        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCategory(null)
          }}
          category={editingCategory}
          categories={categories}
          onSaved={fetchCategories}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeletingCategoryId(null)
          }}
          onConfirm={confirmDeleteCategory}
          title="Delete Category"
          description="Are you sure you want to delete this category? This action cannot be undone. Categories with sub-categories or products cannot be deleted."
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  )
}
