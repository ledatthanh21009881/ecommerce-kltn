'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react'

interface Voucher {
  voucher_id: number
  code: string
  discount_type: 'percent' | 'amount'
  discount_amount: number
  min_order_total: number
  max_usage: number
  start_date: string
  end_date: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export default function PromotionsPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingVoucherId, setDeletingVoucherId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'amount',
    discount_amount: '',
    min_order_total: '',
    max_usage: '',
    start_date: '',
    end_date: '',
    status: 'active'
  })

  const API_BASE = 'http://localhost:8000/api/backend/v1'
  const ADMIN_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2NvdW50X2lkIjoxLCJhY2NvdW50X25hbWUiOiJhZG1pbiIsImFjY291bnRfdHlwZSI6ImxvY2FsIiwicm9sZXMiOlsiYWRtaW4iXSwiaXNfYWRtaW4iOnRydWUsImlhdCI6MTc1NjAyNTI0NiwiZXhwIjoxNzU2MDI4ODQ2fQ.KqNDJswMrgIVw_Y6N0FGJX-bWe65I8xe1iiXPNmKecI'

  useEffect(() => {
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    try {
      const response = await fetch(`${API_BASE}/vouchers`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setVouchers(data.data.items || [])
      } else {
        toast.error('Failed to fetch vouchers')
      }
    } catch (error) {
      toast.error('Error fetching vouchers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingVoucher 
        ? `${API_BASE}/vouchers/${editingVoucher.voucher_id}`
        : `${API_BASE}/vouchers`
      
      const method = editingVoucher ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          discount_amount: parseFloat(formData.discount_amount),
          min_order_total: parseFloat(formData.min_order_total),
          max_usage: parseInt(formData.max_usage)
        })
      })

      if (response.ok) {
        toast.success(editingVoucher ? 'Voucher updated successfully' : 'Voucher created successfully')
        setShowForm(false)
        setEditingVoucher(null)
        resetForm()
        fetchVouchers()
      } else {
        toast.error('Failed to save voucher')
      }
    } catch (error) {
      toast.error('Error saving voucher')
    }
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setFormData({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_amount: voucher.discount_amount.toString(),
      min_order_total: voucher.min_order_total.toString(),
      max_usage: voucher.max_usage.toString(),
      start_date: voucher.start_date,
      end_date: voucher.end_date,
      status: voucher.status
    })
    setShowForm(true)
  }

  const handleDelete = (voucherId: number) => {
    setDeletingVoucherId(voucherId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingVoucherId) return
    
    try {
      const response = await fetch(`${API_BASE}/vouchers/${deletingVoucherId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Voucher deleted successfully')
        fetchVouchers()
      } else {
        toast.error('Failed to delete voucher')
      }
    } catch (error) {
      toast.error('Error deleting voucher')
    } finally {
      setShowDeleteModal(false)
      setDeletingVoucherId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent',
      discount_amount: '',
      min_order_total: '',
      max_usage: '',
      start_date: '',
      end_date: '',
      status: 'active'
    })
  }

  const filteredVouchers = Array.isArray(vouchers) ? vouchers.filter(voucher => {
    const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter
    const matchesType = typeFilter === 'all' || voucher.discount_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  }) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading promotions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Promotions Management</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Voucher
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search vouchers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Label htmlFor="status-filter" className="text-sm font-medium">Status:</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="type-filter" className="text-sm font-medium">Type:</Label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="percent">Percentage</option>
              <option value="amount">Fixed Amount</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingVoucher ? 'Edit Voucher' : 'Add New Voucher'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <select
                    id="discount_type"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percent' | 'amount'})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="percent">Percentage</option>
                    <option value="amount">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({...formData, discount_amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min_order_total">Minimum Order Total</Label>
                  <Input
                    id="min_order_total"
                    type="number"
                    step="0.01"
                    value={formData.min_order_total}
                    onChange={(e) => setFormData({...formData, min_order_total: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="max_usage">Maximum Uses</Label>
                  <Input
                    id="max_usage"
                    type="number"
                    value={formData.max_usage}
                    onChange={(e) => setFormData({...formData, max_usage: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status === 'active'}
                  onChange={(e) => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                />
                <Label htmlFor="status">Active</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingVoucher ? 'Update' : 'Create'} Voucher
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingVoucher(null)
                  resetForm()
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVouchers.map((voucher) => (
          <Card key={voucher.voucher_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{voucher.code}</CardTitle>
                <Badge variant={voucher.status === 'active' ? "default" : "secondary"}>
                  {voucher.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Discount: {voucher.discount_amount}
                  {voucher.discount_type === 'percent' ? '%' : 'đ'}
                </p>
                <p className="text-sm text-gray-600">
                  Min Order: {voucher.min_order_total.toLocaleString()}đ
                </p>
                <p className="text-sm text-gray-600">
                  Max Uses: {voucher.max_usage}
                </p>
                <p className="text-sm text-gray-600">
                  Valid: {new Date(voucher.start_date).toLocaleDateString()} - {new Date(voucher.end_date).toLocaleDateString()}
                </p>
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(voucher)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(voucher.voucher_id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVouchers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No vouchers found</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingVoucherId(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Voucher"
        description="Are you sure you want to delete this voucher? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}
