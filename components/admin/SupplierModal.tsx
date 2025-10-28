'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface Supplier {
  supplier_id: number
  supplier_name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  status: string
  created_at: string
  updated_at?: string
}

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null  // null = Add, có data = Edit
  onSaved: () => void
}

export default function SupplierModal({ isOpen, onClose, supplier, onSaved }: SupplierModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    status: 'active'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when supplier changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_name: supplier.supplier_name || '',
        contact_name: supplier.contact_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        status: supplier.status || 'active'
      })
    } else {
      // Reset form for new supplier
      setFormData({
        supplier_name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        status: 'active'
      })
    }
    setErrors({})
  }, [supplier])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Supplier name is required'
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Phone validation (basic)
    if (formData.phone && !/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format'
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
      
      const url = supplier 
        ? `/api/backend/v1/suppliers?id=${supplier.supplier_id}`
        : '/api/backend/v1/suppliers'
      
      const method = supplier ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(supplier ? 'Supplier updated successfully' : 'Supplier created successfully')
        onSaved()
      } else {
        // Handle validation errors from backend
        if (data.errors) {
          setErrors(data.errors)
        } else {
          toast.error(data.message || 'Failed to save supplier')
        }
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('Error saving supplier')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {supplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <p className="text-sm text-gray-600">
                {supplier ? 'Update supplier information' : 'Enter supplier details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="supplier_name" className="text-sm font-medium text-gray-700">
                Supplier Name *
              </Label>
              <Input
                id="supplier_name"
                type="text"
                value={formData.supplier_name}
                onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                placeholder="Enter supplier name"
                className={errors.supplier_name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.supplier_name && (
                <p className="text-sm text-red-600">{errors.supplier_name}</p>
              )}
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-sm font-medium text-gray-700">
                Contact Person
              </Label>
              <Input
                id="contact_name"
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleInputChange('contact_name', e.target.value)}
                placeholder="Enter contact person name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Address - Full width */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-gray-700">
              Address
            </Label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter supplier address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {supplier ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {supplier ? 'Update Supplier' : 'Create Supplier'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
