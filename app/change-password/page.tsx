'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/lib/auth'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/protected-route'

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { current_password, new_password, confirm_password } = formData

    // Validation
    if (!current_password) {
      toast.error(t('auth.currentPasswordRequired'))
      return
    }

    if (!new_password) {
      toast.error(t('auth.newPasswordRequired'))
      return
    }

    if (!confirm_password) {
      toast.error(t('auth.confirmPasswordRequired'))
      return
    }

    if (new_password !== confirm_password) {
      toast.error(t('auth.passwordMismatch'))
      return
    }

    setIsLoading(true)

    try {
      await changePassword({
        current_password,
        new_password,
        confirm_password
      })
      toast.success(t('auth.passwordChangeSuccess'))
      
      // Reset form
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      
      // Optionally redirect to account page
      setTimeout(() => {
        router.push('/account')
      }, 2000)
    } catch (error) {
      console.error('Change password error:', error)
      toast.error(error instanceof Error ? error.message : t('auth.passwordChangeError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('auth.changePassword')}
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                  {t('auth.currentPassword')}
                </label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={formData.current_password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                  {t('auth.newPassword')}
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={formData.new_password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                  {t('auth.confirmPassword')}
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {isLoading ? t('auth.changingPassword') : t('auth.changePassword')}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  )
}
