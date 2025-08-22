'use client'

import { useState } from 'react'
import ConfirmModal from '@/components/ui/confirm-modal'

export default function TestModalPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleDelete = () => {
    console.log('Product deleted!')
    alert('Product deleted successfully!')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Test Delete Modal</h1>
        <p className="text-gray-600 mb-8">Click the button below to test the delete confirmation modal</p>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Delete Product
        </button>

        <ConfirmModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Product"
          description="Are you sure you want to delete this product? This action cannot be undone and will remove all associated images and variants."
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  )
}
