'use client'

import { useState, useEffect } from 'react'
import { X, Truck, Coins, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'
import { violatesVndPriceStep } from '@/lib/vnd-price-step'

interface ShippingMethod {
  shipping_method_id: number
  name: string
  fee: number
  estimated_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ShippingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingMethod?: ShippingMethod | null
}

export default function ShippingModal({ isOpen, onClose, onSuccess, editingMethod }: ShippingModalProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    fee: '',
    estimated_days: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingMethod) {
      setFormData({
        name: editingMethod.name,
        fee: editingMethod.fee.toString(),
        estimated_days: editingMethod.estimated_days.toString(),
        is_active: editingMethod.is_active
      })
    } else {
      setFormData({
        name: '',
        fee: '',
        estimated_days: '',
        is_active: true
      })
    }
    setErrors({})
  }, [editingMethod, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired')
    }

    if (!formData.fee.trim()) {
      newErrors.fee = t('feeRequired')
    } else if (isNaN(Number(formData.fee)) || Number(formData.fee) < 0) {
      newErrors.fee = t('invalidShippingFee')
    } else if (violatesVndPriceStep(Number(formData.fee))) {
      newErrors.fee = t('priceStepMismatch')
    }

    if (!formData.estimated_days.trim()) {
      newErrors.estimated_days = t('estimatedDaysRequired')
    } else if (isNaN(Number(formData.estimated_days)) || Number(formData.estimated_days) < 1) {
      newErrors.estimated_days = t('estimatedDaysMustBeAtLeast1')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const { token } = getAuthData()
      const url = editingMethod 
        ? `/api/backend/v1/shipping/${editingMethod.shipping_method_id}`
        : '/api/backend/v1/shipping'
      
      const method = editingMethod ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          fee: Number(formData.fee),
          estimated_days: Number(formData.estimated_days),
          is_active: formData.is_active
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingMethod ? t('shippingMethodUpdated') : t('shippingMethodCreated'))
        onSuccess()
        onClose()
      } else {
        toast.error(data.message || (editingMethod ? t('failedToUpdateShippingMethod') : t('failedToCreateShippingMethod')))
      }
    } catch (error) {
      console.error('Error saving shipping method:', error)
      toast.error(editingMethod ? t('errorUpdatingShippingMethod') : t('errorCreatingShippingMethod'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            {editingMethod ? t('editShippingMethod') : t('addShippingMethod')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 min-h-0">
          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            {/* Method Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t('shippingMethodName')} *
              </Label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                  placeholder={t('enterShippingMethodName')}
                />
              </div>
              {errors.name && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errors.name}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
              {/* Fee */}
              <div className="space-y-2">
                <Label htmlFor="fee" className="text-sm font-medium">
                  {t('shippingFee')} (VND) *
                </Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.fee}
                    onChange={(e) => handleInputChange('fee', e.target.value)}
                    className={`pl-10 ${errors.fee ? 'border-red-500' : ''}`}
                    placeholder="0"
                  />
                </div>
                {errors.fee && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.fee}
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  {t('enterShippingFeeInVND')}
                </p>
              </div>

              {/* Estimated Days */}
              <div className="space-y-2">
                <Label htmlFor="estimated_days" className="text-sm font-medium">
                  {t('estimatedDays')} *
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="estimated_days"
                    type="number"
                    min="1"
                    value={formData.estimated_days}
                    onChange={(e) => handleInputChange('estimated_days', e.target.value)}
                    className={`pl-10 ${errors.estimated_days ? 'border-red-500' : ''}`}
                    placeholder="1"
                  />
                </div>
                {errors.estimated_days && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.estimated_days}
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  {t('enterEstimatedDeliveryDays')}
                </p>
              </div>
            </div>

            {/* Status — Switch */}
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-sm font-medium text-slate-900">
                  {t('active')}
                </Label>
                <p className="text-sm text-slate-600">
                  {t('activeShippingMethodDescription')}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{t('preview')}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('shippingMethodName')}:</span>
                  <span className="font-medium">{formData.name || t('notSet')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('shippingFee')}:</span>
                  <span className="font-medium">
                    {formData.fee ? `${Number(formData.fee).toLocaleString()} VND` : t('notSet')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('estimatedDays')}:</span>
                  <span className="font-medium">
                    {formData.estimated_days ? `${formData.estimated_days} ${t('days')}` : t('notSet')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('status')}:</span>
                  <Badge
                    variant="outline"
                    className={
                      formData.is_active
                        ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50'
                        : 'border-slate-200 bg-slate-100 text-slate-600'
                    }
                  >
                    {formData.is_active ? t('active') : t('inactive')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                {loading ? t('saving') : (editingMethod ? t('update') : t('create'))}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
