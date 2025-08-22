'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Tag, Plus, Calendar, Percent, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface Promotion {
  promotion_id: number
  name: string
  description?: string
  discount_type: string
  discount_value: number
  min_order_amount?: number
  max_discount?: number
  usage_limit?: number
  used_count: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch promotions
  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/promotions')
      const data = await response.json()
      
      if (data.success) {
        setPromotions(data.data || [])
      } else {
        toast.error('Failed to fetch promotions')
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
      toast.error('Error fetching promotions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  // Filter promotions
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = 
      promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || promotion.is_active === (statusFilter === 'active')
    return matchesSearch && matchesStatus
  })

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date()
    const startDate = new Date(promotion.start_date)
    const endDate = new Date(promotion.end_date)
    
    if (!promotion.is_active) return { status: 'inactive', color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'Inactive' }
    if (now < startDate) return { status: 'upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Upcoming' }
    if (now > endDate) return { status: 'expired', color: 'bg-red-100 text-red-800 border-red-200', text: 'Expired' }
    return { status: 'active', color: 'bg-green-100 text-green-800 border-green-200', text: 'Active' }
  }

  const getPromotionStats = () => {
    const now = new Date()
    const stats = {
      total: promotions.length,
      active: promotions.filter(p => p.is_active && new Date(p.start_date) <= now && new Date(p.end_date) >= now).length,
      upcoming: promotions.filter(p => p.is_active && new Date(p.start_date) > now).length,
      expired: promotions.filter(p => new Date(p.end_date) < now).length,
      inactive: promotions.filter(p => !p.is_active).length
    }
    return stats
  }

  const stats = getPromotionStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`
    } else if (type === 'fixed') {
      return `${value.toLocaleString('vi-VN')} ₫`
    }
    return `${value}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Promotion Management</h1>
          <p className="text-slate-600">Create and manage promotional campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Promotions</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
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
                  <p className="text-sm font-medium text-slate-600">Upcoming</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.upcoming}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Expired</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.expired}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">⏰</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Inactive</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-xl">🚫</span>
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
                    placeholder="Search promotions by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchPromotions}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Promotion
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPromotions.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No promotions found</h3>
              <p className="text-gray-500">No promotions match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPromotions.map((promotion) => {
              const status = getPromotionStatus(promotion)
              return (
                <Card key={promotion.promotion_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {promotion.name}
                          </h3>
                          {promotion.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {promotion.description}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${status.color}`}
                        >
                          {status.text}
                        </Badge>
                      </div>

                      {/* Discount Info */}
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <Percent className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-lg font-bold text-blue-600">
                            {formatDiscount(promotion.discount_type, promotion.discount_value)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {promotion.discount_type === 'percentage' ? 'Discount' : 'Fixed Amount'}
                          </p>
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="space-y-2 text-sm">
                        {promotion.min_order_amount && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Min Order:</span>
                            <span className="font-medium">{promotion.min_order_amount.toLocaleString('vi-VN')} ₫</span>
                          </div>
                        )}
                        {promotion.max_discount && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Discount:</span>
                            <span className="font-medium">{promotion.max_discount.toLocaleString('vi-VN')} ₫</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Usage:</span>
                          <span className="font-medium">{promotion.used_count}/{promotion.usage_limit || '∞'}</span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Start:</span>
                          <span>{formatDate(promotion.start_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>End:</span>
                          <span>{formatDate(promotion.end_date)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
