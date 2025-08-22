'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryData,
} from '@/lib/categories'
import { Pencil, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react'

export default function CategoriesPage() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category_name: '',
    parent_id: null as number | null,
    position: 1,
  })

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category_name.trim()) {
      toast.error(t('categories.nameRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      if (editingCategory) {
        // Update existing category
        const updateData: UpdateCategoryData = {
          category_name: formData.category_name,
          parent_id: formData.parent_id,
          position: formData.position,
        }
        await updateCategory(editingCategory.category_id, updateData)
        toast.success(t('categories.updateSuccess'))
      } else {
        // Create new category
        const createData: CreateCategoryData = {
          category_name: formData.category_name,
          parent_id: formData.parent_id,
          position: formData.position,
        }
        await createCategory(createData)
        toast.success(t('categories.createSuccess'))
      }

      setShowDialog(false)
      resetForm()
      loadCategories()
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save category')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deletingCategory) return

    setIsSubmitting(true)

    try {
      await deleteCategory(deletingCategory.category_id)
      toast.success(t('categories.deleteSuccess'))
      setShowDeleteDialog(false)
      setDeletingCategory(null)
      loadCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle toggle status
  const handleToggleStatus = async (category: Category) => {
    try {
      await toggleCategoryStatus(category.category_id)
      toast.success(t('categories.statusToggled'))
      loadCategories()
    } catch (error) {
      console.error('Failed to toggle status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to toggle status')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      category_name: '',
      parent_id: null,
      position: 1,
    })
    setEditingCategory(null)
  }

  // Open add dialog
  const openAddDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      category_name: category.category_name,
      parent_id: category.parent_id,
      position: category.position,
    })
    setShowDialog(true)
  }

  // Open delete dialog
  const openDeleteDialog = (category: Category) => {
    setDeletingCategory(category)
    setShowDeleteDialog(true)
  }

  // Get category name by ID
  const getCategoryName = (id: number | null): string => {
    if (!id) return t('categories.noParent')
    const category = categories.find(c => c.category_id === id)
    return category ? category.category_name : 'Unknown'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('categories.title')}</h1>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t('categories.addNew')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>{t('categories.loading')}</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8">
          <p>{t('categories.noCategories')}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('categories.name')}</TableHead>
                <TableHead>{t('categories.parent')}</TableHead>
                <TableHead>{t('categories.position')}</TableHead>
                <TableHead>{t('categories.status')}</TableHead>
                <TableHead>{t('categories.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.category_id}>
                  <TableCell>{category.category_id}</TableCell>
                  <TableCell className="font-medium">
                    {category.category_name}
                  </TableCell>
                  <TableCell>
                    {getCategoryName(category.parent_id)}
                  </TableCell>
                  <TableCell>{category.position}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={category.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(category)}
                    >
                      {category.is_active ? (
                        <>
                          <ToggleRight className="w-3 h-3 mr-1" />
                          {t('categories.active')}
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3 h-3 mr-1" />
                          {t('categories.inactive')}
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(category)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('categories.edit') : t('categories.addNew')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="category_name" className="text-sm font-medium">
                {t('categories.name')}
              </label>
              <Input
                id="category_name"
                value={formData.category_name}
                onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="parent_id" className="text-sm font-medium">
                {t('categories.parent')}
              </label>
              <Select
                value={formData.parent_id?.toString() || 'null'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: value === 'null' ? null : parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">{t('categories.noParent')}</SelectItem>
                  {categories
                    .filter(c => editingCategory ? c.category_id !== editingCategory.category_id : true)
                    .map((category) => (
                      <SelectItem 
                        key={category.category_id} 
                        value={category.category_id.toString()}
                      >
                        {category.category_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="position" className="text-sm font-medium">
                {t('categories.position')}
              </label>
              <Input
                id="position"
                type="number"
                min="1"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDialog(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('categories.deleteWarning')}
              {deletingCategory && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <strong>{deletingCategory.category_name}</strong>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
