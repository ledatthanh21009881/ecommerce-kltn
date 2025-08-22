"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'
import { LogOut, X } from 'lucide-react'

interface LogoutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function LogoutModal({ isOpen, onClose, onConfirm, isLoading = false }: LogoutModalProps) {
  const { t } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('logout.confirmTitle')}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-gray-600 mb-6">
          {t('logout.confirmMessage')}
        </p>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('logout.cancelButton')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('logout.signingOut')}
              </div>
            ) : (
              t('logout.confirmButton')
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
