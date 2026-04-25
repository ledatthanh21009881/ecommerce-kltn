'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

interface CollectionListItem {
  collection_id: number
  collection_name: string
  slug: string
  short_description: string | null
  display_order: number
  is_active: number
  images_count?: number
  products_count?: number
}

interface CollectionDetail extends CollectionListItem {
  images?: Array<{ image_url: string; display_order: number; is_active: number }>
  products?: Array<{ product_id: number; display_order: number }>
}

interface Props {
  isVisible: boolean
}

const initialForm = {
  collection_name: '',
  slug: '',
  short_description: '',
  display_order: '0',
  is_active: true,
  image_urls: '',
  product_ids: '',
}

export default function CollectionsManager({ isVisible }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collections, setCollections] = useState<CollectionListItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const filteredCollections = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return collections
    return collections.filter((item) => (
      item.collection_name.toLowerCase().includes(keyword)
      || item.slug.toLowerCase().includes(keyword)
    ))
  }, [collections, searchTerm])

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
        toast.error('Yeu cau dang nhap')
        return
      }
      setLoading(true)
      const response = await fetch('/api/backend/v1/collections', { headers })
      const data = await response.json()
      if (data?.success) {
        setCollections(Array.isArray(data.data) ? data.data : [])
      } else {
        toast.error(data?.message || 'Khong tai duoc danh sach bo suu tap')
      }
    } catch (error) {
      console.error('Fetch collections error:', error)
      toast.error('Khong tai duoc danh sach bo suu tap')
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
    setForm(initialForm)
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = async (id: number) => {
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error('Yeu cau dang nhap')
        return
      }
      const response = await fetch(`/api/backend/v1/collections/${id}`, { headers })
      const data = await response.json()
      if (!data?.success || !data?.data) {
        toast.error(data?.message || 'Khong tai duoc chi tiet bo suu tap')
        return
      }
      const detail = data.data as CollectionDetail
      const imageUrls = (detail.images || [])
        .filter((img) => Number(img.is_active ?? 1) === 1)
        .sort((a, b) => Number(a.display_order) - Number(b.display_order))
        .map((img) => img.image_url)
        .join('\n')

      const productIds = (detail.products || [])
        .sort((a, b) => Number(a.display_order) - Number(b.display_order))
        .map((item) => item.product_id)
        .join(', ')

      setEditingId(id)
      setForm({
        collection_name: detail.collection_name || '',
        slug: detail.slug || '',
        short_description: detail.short_description || '',
        display_order: String(detail.display_order ?? 0),
        is_active: Number(detail.is_active) === 1,
        image_urls: imageUrls,
        product_ids: productIds,
      })
      setIsModalOpen(true)
    } catch (error) {
      console.error('Open edit modal error:', error)
      toast.error('Khong tai duoc chi tiet bo suu tap')
    }
  }

  const saveCollection = async () => {
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error('Yeu cau dang nhap')
        return
      }

      const collectionName = form.collection_name.trim()
      if (!collectionName) {
        toast.error('Ten bo suu tap la bat buoc')
        return
      }

      const images = form.image_urls
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((url, index) => ({ image_url: url, display_order: index + 1, is_active: 1 }))

      const products = form.product_ids
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
        .map((productId, index) => ({ product_id: productId, display_order: index + 1 }))

      const payload = {
        collection_name: collectionName,
        slug: form.slug.trim(),
        short_description: form.short_description.trim(),
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active ? 1 : 0,
        images,
        products,
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
        toast.error(data?.message || 'Luu bo suu tap that bai')
        return
      }

      toast.success(editingId ? 'Cap nhat bo suu tap thanh cong' : 'Tao bo suu tap thanh cong')
      setIsModalOpen(false)
      resetForm()
      await fetchCollections()
    } catch (error) {
      console.error('Save collection error:', error)
      toast.error('Luu bo suu tap that bai')
    } finally {
      setSaving(false)
    }
  }

  const deleteCollection = async () => {
    if (!deleteId) return
    try {
      const headers = authHeaders()
      if (!headers) {
        toast.error('Yeu cau dang nhap')
        return
      }
      const response = await fetch(`/api/backend/v1/collections/${deleteId}`, {
        method: 'DELETE',
        headers,
      })
      const data = await response.json()
      if (!data?.success) {
        toast.error(data?.message || 'Xoa bo suu tap that bai')
        return
      }
      toast.success('Xoa bo suu tap thanh cong')
      setDeleteId(null)
      await fetchCollections()
    } catch (error) {
      console.error('Delete collection error:', error)
      toast.error('Xoa bo suu tap that bai')
    }
  }

  if (!isVisible) return null

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full gap-2 sm:max-w-md">
              <Input
                placeholder="Tim theo ten hoac slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline" onClick={fetchCollections} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Button onClick={openCreateModal} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tao collection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50/80">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Ten collection</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Slug</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Anh</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">San pham</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Thu tu</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Trang thai</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Hanh dong</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((item) => (
                  <tr key={item.collection_id} className="border-b hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-sm font-medium">{item.collection_name}</td>
                    <td className="px-4 py-3 text-sm">{item.slug}</td>
                    <td className="px-4 py-3 text-sm">{item.images_count ?? 0}</td>
                    <td className="px-4 py-3 text-sm">{item.products_count ?? 0}</td>
                    <td className="px-4 py-3 text-sm">{item.display_order}</td>
                    <td className="px-4 py-3 text-sm">{Number(item.is_active) === 1 ? 'Hoat dong' : 'Tam an'}</td>
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
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      Chua co collection nao.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Cap nhat collection' : 'Tao collection moi'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ten collection *</Label>
                <Input
                  value={form.collection_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, collection_name: e.target.value }))}
                  placeholder="SPRING SUMER 2026"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Thu tu hien thi</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_order: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Trang thai</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                  <input
                    id="collection-active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label htmlFor="collection-active" className="text-sm">
                    Dang hoat dong
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mo ta ngan</Label>
              <Textarea
                value={form.short_description}
                onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Danh sach URL anh (moi dong 1 URL)</Label>
              <Textarea
                value={form.image_urls}
                onChange={(e) => setForm((prev) => ({ ...prev, image_urls: e.target.value }))}
                rows={5}
                placeholder="https://...\nhttps://..."
              />
            </div>

            <div className="space-y-2">
              <Label>ID san pham lien ket (cach nhau boi dau phay)</Label>
              <Input
                value={form.product_ids}
                onChange={(e) => setForm((prev) => ({ ...prev, product_ids: e.target.value }))}
                placeholder="1, 2, 8, 23"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Huy
            </Button>
            <Button onClick={saveCollection} disabled={saving}>
              {saving ? 'Dang luu...' : editingId ? 'Cap nhat' : 'Tao moi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteCollection}
        title="Xoa collection"
        description="Ban co chac chan muon xoa collection nay khong? Tat ca anh va lien ket san pham se bi xoa."
        confirmText="Xoa"
        cancelText="Huy"
      />
    </div>
  )
}
