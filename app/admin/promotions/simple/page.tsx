'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import { getBackendApiV1Base } from '@/app/api/backend/config'

interface Voucher {
  voucher_id: number
  code: string
  discount_amount: number
  discount_type: 'percent' | 'amount'
  max_usage: number | null
  min_order_total: number
  start_date: string
  end_date: string
  status: 'active' | 'inactive'
}

export default function SimplePromotionsPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingVoucherId, setDeletingVoucherId] = useState<number | null>(null)

  const API_BASE = getBackendApiV1Base()
  const ADMIN_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2NvdW50X2lkIjoxLCJhY2NvdW50X25hbWUiOiJhZG1pbiIsImFjY291bnRfdHlwZSI6ImxvY2FsIiwicm9sZXMiOlsiYWRtaW4iXSwiaXNfYWRtaW4iOnRydWUsImlhdCI6MTc1NjAyNTI0NiwiZXhwIjoxNzU2MDI4ODQ2fQ.KqNDJswMrgIVw_Y6N0FGJX-bWe65I8xe1iiXPNmKecI'

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

  useEffect(() => {
    fetchVouchers()
  }, [])

  const handleDeleteVoucher = (voucherId: number) => {
    setDeletingVoucherId(voucherId)
    setShowDeleteModal(true)
  }

  const confirmDeleteVoucher = async () => {
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
        toast.success('Xóa phiếu giảm giá thành công')
        fetchVouchers()
      } else {
        toast.error('Không thể xóa phiếu giảm giá')
      }
    } catch (error) {
      console.error('Error deleting voucher:', error)
      toast.error('Có lỗi xảy ra khi xóa phiếu giảm giá')
    } finally {
      setShowDeleteModal(false)
      setDeletingVoucherId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Hoạt động</Badge>
    ) : (
      <Badge variant="secondary">Không hoạt động</Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    return type === 'percent' ? (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Phần trăm</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Số tiền</Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="admin-page-title">Quản lý Phiếu giảm giá</h1>
          <p className="admin-page-description">Quản lý các phiếu giảm giá và khuyến mãi</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Thêm phiếu giảm giá
        </Button>
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {vouchers.map((voucher) => (
          <Card key={voucher.voucher_id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-blue-600">
                    {voucher.code}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(voucher.status)}
                    {getTypeBadge(voucher.discount_type)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Giảm giá:</span>
                <span className="font-semibold text-lg">
                  {voucher.discount_type === 'percent' 
                    ? `${voucher.discount_amount}%` 
                    : formatCurrency(voucher.discount_amount)
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tối thiểu:</span>
                <span className="font-medium">
                  {formatCurrency(voucher.min_order_total)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Từ:</span>
                  <span>{formatDate(voucher.start_date)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Đến:</span>
                  <span>{formatDate(voucher.end_date)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteVoucher(voucher.voucher_id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingVoucherId(null)
        }}
        onConfirm={confirmDeleteVoucher}
        title="Xóa Phiếu giảm giá"
        description="Bạn có chắc chắn muốn xóa phiếu giảm giá này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  )
}
