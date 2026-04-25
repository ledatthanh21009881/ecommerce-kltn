'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Edit, Trash2, Upload, X } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import ConfirmModal from '@/components/ui/confirm-modal'
import { getAuthData } from '@/lib/admin-auth'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

interface CollectionListItem {
  collection_id: number
  collection_name: string
  slug: string
  short_description: string | null
  display_order: number
  is_active: number
  images_count?: number
}

interface CollectionDetail extends CollectionListItem {
  images?: Array<{ image_url: string; display_order: number; is_active: number }>
}

interface CollectionImageItem {
  id: string
  source: 'existing' | 'new'
  imageUrl: string
  file?: File
}

interface CollectionSortItem {
  collection_id: number
  collection_name: string
  slug: string
  display_order: number
}

interface Props {
  isVisible: boolean
  viewMode: 'list' | 'grid'
}

export interface CollectionsManagerRef {
  refreshCollections: () => Promise<void>
  openCreateModal: () => void
  openSortModal: () => void
}

const initialForm = {
  collection_name: '',
  slug: '',
  short_description: '',
  is_active: true,
}

const CollectionsManager = forwardRef<CollectionsManagerRef, Props>(function CollectionsManager({ isVisible, viewMode }: Props, ref) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collections, setCollections] = useState<CollectionListItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSortModalOpen, setIsSortModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [orderedImages, setOrderedImages] = useState<CollectionImageItem[]>([])
  const [sortItems, setSortItems] = useState<CollectionSortItem[]>([])
  const [sortSaving, setSortSaving] = useState(false)

  const filteredCollections = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return collections.filter((item) => {
      const matchesKeyword = !keyword
        || item.collection_name.toLowerCase().includes(keyword)
        || item.slug.toLowerCase().includes(keyword)
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && Number(item.is_active) === 1)
        || (statusFilter === 'inactive' && Number(item.is_active) !== 1)
      return matchesKeyword && matchesStatus
    })
  }, [collections, searchTerm, statusFilter])

  const authHeaders = () => {
    const { token } = getAuthData()
    if (!token) return null
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  const fetchCollections = async () => {
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error(t('authenticationRequired'))
        return
      }
      setLoading(true)
      const response = await fetch('/api/backend/v1/collections', { headers })
      const data = await response.json()
      if (data?.success) {
        setCollections(Array.isArray(data.data) ? data.data : [])
      } else {
        toast.error(data?.message || t('failedToFetchCollections'))
      }
    } catch (error) {
      console.error('Fetch collections error:', error)
      toast.error(t('failedToFetchCollections'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      fetchCollections()
    }
  }, [isVisible])

  const resetForm = () => {
    orderedImages.forEach((item) => {
      if (item.source === 'new') {
        URL.revokeObjectURL(item.imageUrl)
      }
    })
    setForm(initialForm)
    setEditingId(null)
    setOrderedImages([])
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = async (id: number) => {
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error(t('authenticationRequired'))
        return
      }
      const response = await fetch(`/api/backend/v1/collections/${id}`, { headers })
      const data = await response.json()
      if (!data?.success || !data?.data) {
        toast.error(data?.message || t('failedToFetchCollectionDetails'))
        return
      }
      const detail = data.data as CollectionDetail
      const imageUrls = (detail.images || [])
        .filter((img) => Number(img.is_active ?? 1) === 1)
        .sort((a, b) => Number(a.display_order) - Number(b.display_order))
        .map((img) => img.image_url)
      setOrderedImages(
        imageUrls.map((imageUrl, index) => ({
          id: `existing-${id}-${index}`,
          source: 'existing',
          imageUrl,
        })),
      )

      setEditingId(id)
      setForm({
        collection_name: detail.collection_name || '',
        slug: detail.slug || '',
        short_description: detail.short_description || '',
        is_active: Number(detail.is_active) === 1,
      })
      setIsModalOpen(true)
    } catch (error) {
      console.error('Open edit modal error:', error)
      toast.error(t('failedToFetchCollectionDetails'))
    }
  }

  const saveCollection = async () => {
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error(t('authenticationRequired'))
        return
      }

      const collectionName = form.collection_name.trim()
      if (!collectionName) {
        toast.error(t('collectionNameRequired'))
        return
      }

      const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
        reader.readAsDataURL(file)
      })

      const images = await Promise.all(
        orderedImages.map(async (item, index) => {
          if (item.source === 'new' && item.file) {
            return {
              file: await fileToBase64(item.file),
              display_order: index + 1,
              is_active: 1,
            }
          }
          return {
            image_url: item.imageUrl,
            display_order: index + 1,
            is_active: 1,
          }
        }),
      )

      const payload = {
        collection_name: collectionName,
        slug: form.slug.trim(),
        short_description: form.short_description.trim(),
        is_active: form.is_active ? 1 : 0,
        images,
      }

      setSaving(true)
      const url = editingId ? `/api/backend/v1/collections/${editingId}` : '/api/backend/v1/collections'
      const method = editingId ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!data?.success) {
        toast.error(data?.message || t('failedToSaveCollection'))
        return
      }

      toast.success(editingId ? t('collectionUpdatedSuccessfully') : t('collectionCreatedSuccessfully'))
      setIsModalOpen(false)
      resetForm()
      await fetchCollections()
    } catch (error) {
      console.error('Save collection error:', error)
      toast.error(t('failedToSaveCollection'))
    } finally {
      setSaving(false)
    }
  }

  const deleteCollection = async () => {
    if (!deleteId) return
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error(t('authenticationRequired'))
        return
      }
      const response = await fetch(`/api/backend/v1/collections/${deleteId}`, {
        method: 'DELETE',
        headers,
      })
      const data = await response.json()
      if (!data?.success) {
        toast.error(data?.message || t('failedToDeleteCollection'))
        return
      }
      toast.success(t('collectionDeletedSuccessfully'))
      setDeleteId(null)
      await fetchCollections()
    } catch (error) {
      console.error('Delete collection error:', error)
      toast.error(t('failedToDeleteCollection'))
    }
  }

  const openSortModal = () => {
    setSortItems(
      [...collections]
        .sort((a, b) => Number(a.display_order) - Number(b.display_order) || Number(b.collection_id) - Number(a.collection_id))
        .map((item) => ({
          collection_id: item.collection_id,
          collection_name: item.collection_name,
          slug: item.slug,
          display_order: item.display_order,
        })),
    )
    setIsSortModalOpen(true)
  }

  useImperativeHandle(ref, () => ({
    refreshCollections: fetchCollections,
    openCreateModal,
    openSortModal,
  }))

  const saveSortOrder = async () => {
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error(t('authenticationRequired'))
        return
      }

      setSortSaving(true)
      const response = await fetch('/api/backend/v1/collections', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          items: sortItems.map((item, index) => ({
            collection_id: item.collection_id,
            display_order: index + 1,
          })),
        }),
      })
      const data = await response.json()
      if (!data?.success) {
        toast.error(data?.message || t('failedToReorderCollections'))
        return
      }

      toast.success(t('collectionsReorderedSuccessfully'))
      setIsSortModalOpen(false)
      await fetchCollections()
    } catch (error) {
      console.error('Reorder collections error:', error)
      toast.error(t('failedToReorderCollections'))
    } finally {
      setSortSaving(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full gap-2 sm:max-w-2xl">
              <Input
                placeholder={t('searchCollectionByNameOrSlug')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[180px] border-slate-200 bg-white/50 focus:bg-white">
                  <SelectValue placeholder={t('statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {viewMode === 'list' ? (
      <Card className="bg-white/80 border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50/80">
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t('collectionName')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Slug</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t('collectionImages')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t('displayOrder')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t('status')}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((item) => (
                  <tr key={item.collection_id} className="border-b hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-sm font-medium">{item.collection_name}</td>
                    <td className="px-4 py-3 text-sm">{item.slug}</td>
                    <td className="px-4 py-3 text-sm">{item.images_count ?? 0}</td>
                    <td className="px-4 py-3 text-sm">{item.display_order}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        className={Number(item.is_active) === 1
                          ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200'}
                        variant="outline"
                      >
                        {Number(item.is_active) === 1 ? t('active') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(item.collection_id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(item.collection_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredCollections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      {t('noCollectionsFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCollections.map((item) => (
          <Card key={item.collection_id} className="bg-white/80 border-0 shadow-lg">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.collection_name}</p>
                  <p className="text-xs text-slate-500 truncate">{item.slug}</p>
                </div>
                <Badge
                  className={Number(item.is_active) === 1
                    ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200'}
                  variant="outline"
                >
                  {Number(item.is_active) === 1 ? t('active') : t('inactive')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">{t('collectionImages')}</p>
                  <p className="font-semibold text-slate-900">{item.images_count ?? 0}</p>
                </div>
                <div className="rounded-md border bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">{t('displayOrder')}</p>
                  <p className="font-semibold text-slate-900">{item.display_order}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditModal(item.collection_id)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteId(item.collection_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && filteredCollections.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 bg-white/80 border-0 shadow-lg">
            <CardContent className="px-4 py-8 text-center text-sm text-slate-500">
              {t('noCollectionsFound')}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? t('updateCollection') : t('createNewCollection')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('collectionName')} *</Label>
                <Input
                  value={form.collection_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, collection_name: e.target.value }))}
                  placeholder={t('collectionNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="xuan-he-2026"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <div className="flex h-12 items-center gap-3 rounded-md border px-3">
                <Switch
                  id="collection-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                />
                <label htmlFor="collection-active" className="text-sm font-medium">
                  {t('active')}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('shortDescription')}</Label>
              <Textarea
                value={form.short_description}
                onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('uploadCollectionImages')}</Label>
              <div className="space-y-3 rounded-md border p-3 overflow-x-hidden">
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="collection-images-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    {t('selectImages')}
                  </Label>
                  <input
                    id="collection-images-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length > 0) {
                        setOrderedImages((prev) => [
                          ...prev,
                          ...files.map((file, index) => ({
                            id: `new-${file.name}-${Date.now()}-${index}`,
                            source: 'new' as const,
                            imageUrl: URL.createObjectURL(file),
                            file,
                          })),
                        ])
                      }
                      e.currentTarget.value = ''
                    }}
                  />
                  <span className="text-xs text-slate-500">{t('uploadCollectionImagesHint')}</span>
                </div>

                {orderedImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">{t('dragDropToReorder')}</p>
                    <Reorder.Group
                      axis="y"
                      values={orderedImages}
                      onReorder={setOrderedImages}
                      className="space-y-2"
                    >
                      {orderedImages.map((item, index) => (
                        <Reorder.Item
                          key={item.id}
                          value={item}
                          className="flex min-w-0 items-center gap-3 rounded border px-2 py-2 bg-white"
                        >
                          <span className="w-6 text-center text-xs font-semibold text-slate-500">{index + 1}</span>
                          <img
                            src={item.imageUrl}
                            alt={`Collection image ${index + 1}`}
                            className="h-14 w-14 rounded object-cover border"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                            {item.source === 'existing' ? item.imageUrl : item.file?.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setOrderedImages((prev) => {
                                const target = prev.find((img) => img.id === item.id)
                                if (target?.source === 'new') {
                                  URL.revokeObjectURL(target.imageUrl)
                                }
                                return prev.filter((img) => img.id !== item.id)
                              })
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-3 border-t bg-white">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={saveCollection} disabled={saving}>
              {saving ? t('saving') : editingId ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSortModalOpen} onOpenChange={setIsSortModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('sortCollections')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1">
            <p className="text-xs text-slate-500">{t('dragDropCollectionsToReorder')}</p>
            <Reorder.Group axis="y" values={sortItems} onReorder={setSortItems} className="space-y-2">
              {sortItems.map((item, index) => (
                <Reorder.Item
                  key={item.collection_id}
                  value={item}
                  className="flex items-center gap-3 rounded-md border bg-white px-3 py-2"
                >
                  <span className="w-7 text-center text-xs font-semibold text-slate-500">{index + 1}</span>
                  <span className="flex-1 text-sm font-medium text-slate-900 truncate">{item.collection_name}</span>
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

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteCollection}
        title={t('deleteCollection')}
        description={t('deleteCollectionConfirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
  )
})

export default CollectionsManager
