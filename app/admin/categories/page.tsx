'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Folder, Edit, Trash2, Eye, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import CategoryModal from '@/components/admin/CategoryModal'
import { Category } from '@/lib/types'
import { getAuthData, checkAndRefreshAuth } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminCategoriesPage() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_categories_view') as 'list' | 'grid') || 'list'
    return 'list'
  })
  const [isSortModalOpen, setIsSortModalOpen] = useState(false)
  const [sortItems, setSortItems] = useState<Category[]>([])
  const [sortSaving, setSortSaving] = useState(false)

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_categories_view', mode)
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/categories')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data || [])
      } else {
        toast.error(t('failedToFetch'))
      }
    } catch (error) {
      toast.error(t('errorFetching'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && category.is_active) ||
      (statusFilter === 'inactive' && !category.is_active)
    return matchesSearch && matchesStatus
  })
  const totalFiltered = filteredCategories.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit))
  const paginatedCategories = filteredCategories.slice((page - 1) * limit, page * limit)
  const from = totalFiltered === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, totalFiltered)

  useEffect(() => { setPage(1) }, [searchTerm, statusFilter])

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
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
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
          toast.error(t('authenticationFailed'))
          return
        }
        
        toast.error(t('deleteFailed'))
        return
      }

      const data = await response.json()
      console.log('✅ Delete response data:', data)
      
      if (data.success) {
        toast.success(t('categoryDeletedSuccessfully'))
        fetchCategories()
      } else {
        toast.error(data.message || t('failedToDeleteCategory'))
      }
    } catch (error) {
      console.error('❌ Error deleting category:', error)
      
      if (error instanceof SyntaxError) {
        toast.error(t('invalidResponse'))
      } else if (error instanceof TypeError) {
        toast.error(t('networkError'))
      } else {
        toast.error(`Error deleting category: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const openSortModal = () => {
    const roots = categories
      .filter(c => c.parent_id == null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.category_id - b.category_id)
    if (roots.length === 0) {
      toast.info(t('noMainCategoriesToSort'))
      return
    }
    setSortItems(roots)
    setIsSortModalOpen(true)
  }

  const saveSortOrder = async () => {
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationFailed'))
        return
      }
      setSortSaving(true)
      const response = await fetch('/api/backend/v1/categories/reorder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: sortItems.map((item, index) => ({
            category_id: item.category_id,
            position: index + 1,
          })),
        }),
      })
      const data = await response.json()
      if (!data?.success) {
        toast.error(data?.message || t('failedToReorderCategories'))
        return
      }
      toast.success(t('categoriesReorderedSuccessfully'))
      setIsSortModalOpen(false)
      await fetchCategories()
    } catch (e) {
      console.error(e)
      toast.error(t('failedToReorderCategories'))
    } finally {
      setSortSaving(false)
    }
  }

  // Calculate stats
  const totalCategories = categories.length
  const activeCategories = categories.filter(c => c.is_active).length
  const mainCategories = categories.filter(c => !c.parent_id).length
  const subCategories = categories.filter(c => c.parent_id).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('categoryManagement')}</h1>
            <p className="admin-page-description">{t('categoryManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={fetchCategories} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={openSortModal}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
            >
              <ArrowUpDown className="h-4 w-4" />
              {t('sortCategories')}
            </Button>
            <Button onClick={handleAddCategory} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('addCategory')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalCategories')}</p>
                  <p className="text-3xl font-bold text-slate-900">{totalCategories}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-700">
                  <Folder className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('activeCategories')}</p>
                  <p className="text-3xl font-bold text-slate-900">{activeCategories}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <Folder className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('mainCategories')}</p>
                  <p className="text-3xl font-bold text-slate-900">{mainCategories}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
                  <Folder className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('subCategories')}</p>
                  <p className="text-3xl font-bold text-slate-900">{subCategories}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <Folder className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchCategories')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('statusFilter')}</label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
                    <SelectTrigger className="min-w-[180px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatus')}</SelectItem>
                      <SelectItem value="active">{t('active')}</SelectItem>
                      <SelectItem value="inactive">{t('inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-slate-200 rounded" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noCategoriesFound')}</h3>
                <p className="text-slate-600">{t('getStartedByCreatingFirstCategory')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCategories.map((category) => (
                  <Card key={category.category_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-10 w-10 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Folder className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{category.category_name}</h3>
                            <p className="text-xs text-slate-500">{category.slug}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 ${category.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {category.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      {category.parent_name && <p className="text-xs text-slate-500 mb-2">{t('parentCategory')}: {category.parent_name}</p>}
                      <p className="text-xs text-slate-400 mb-3">{t('position')}: {category.position}</p>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <Button size="sm" variant="outline" onClick={() => handleViewCategory(category)} className="flex-1 bg-white/80 border-slate-200 hover:bg-white"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditCategory(category)} className="bg-white/80 border-slate-200 hover:bg-white"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteCategory(category.category_id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('categoryName')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('slug')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('position')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCategories.map((category) => (
                      <tr key={category.category_id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <Folder className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{category.category_name}</div>
                              {category.parent_name && (
                                <div className="text-sm text-slate-500">{t('parentCategory')}: {category.parent_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{category.slug}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={category.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}>
                            {category.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{category.position}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewCategory(category)} className="bg-white/80 border-slate-200 hover:bg-white" title={t('view')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditCategory(category)} className="bg-white/80 border-slate-200 hover:bg-white" title={t('edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteCategory(category.category_id)} className="text-red-600 border-red-200 hover:bg-red-50" title={t('delete')}>
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

        {!loading && totalFiltered > 0 && totalPages > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-4">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                {t('showingXOfY', { from: String(from), to: String(to), total: String(totalFiltered) })}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="bg-white/80 border-slate-200 hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
                  {t('pageOf', { current: String(page), total: String(totalPages) })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="bg-white/80 border-slate-200 hover:bg-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isSortModalOpen} onOpenChange={setIsSortModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('sortCategories')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 overflow-y-auto pr-1">
              <p className="text-xs text-slate-500">{t('dragDropMainCategoriesToReorder')}</p>
              <p className="text-xs text-slate-400">{t('sortCategoriesMainOnlyNote')}</p>
              <Reorder.Group axis="y" values={sortItems} onReorder={setSortItems} className="space-y-2">
                {sortItems.map((item, index) => (
                  <Reorder.Item
                    key={item.category_id}
                    value={item}
                    className="flex items-center gap-3 rounded-md border bg-white px-3 py-2 cursor-grab active:cursor-grabbing"
                  >
                    <span className="w-7 text-center text-xs font-semibold text-slate-500">{index + 1}</span>
                    <span className="flex-1 text-sm font-medium text-slate-900 truncate">{item.category_name}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">{item.slug}</span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
            <DialogFooter className="pt-3 border-t bg-white">
              <Button variant="outline" onClick={() => setIsSortModalOpen(false)} disabled={sortSaving}>
                {t('cancel')}
              </Button>
              <Button onClick={saveSortOrder} disabled={sortSaving}>
                {sortSaving ? t('saving') : t('saveOrder')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
          title={t('deleteCategory')}
          description={t('deleteCategoryConfirm')}
          confirmText={t('delete')}
          cancelText={t('cancel')}
        />
      </div>
    </div>
  )
}
