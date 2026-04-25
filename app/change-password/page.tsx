'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/lib/auth'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/protected-route'
import { Input } from '@/components/ui/input'

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t, language } = useLanguage()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { current_password, new_password, confirm_password } = formData

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
      const res = await changePassword(
        {
          current_password,
          new_password,
          confirm_password,
        },
        language,
      )
      if (!res.ok) {
        toast.error(res.message || t('auth.passwordChangeError'))
        return
      }

      toast.success(t('auth.passwordChangeSuccess'))

      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })

      setTimeout(() => {
        router.push('/account')
      }, 1200)
    } catch {
      toast.error(t('auth.passwordChangeError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-white pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-md">
            <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">
              {t('auth.changePassword')}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="current_password" className="text-sm">
                  {t('auth.currentPassword')}
                </label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.current_password}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="new_password" className="text-sm">
                  {t('auth.newPassword')}
                </label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.new_password}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm_password" className="text-sm">
                  {t('auth.confirmPassword')}
                </label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="relative overflow-hidden border border-black">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                    {isLoading ? t('auth.changingPassword') : t('auth.changePassword')}
                  </span>
                  <div className="absolute inset-0 translate-x-full transform bg-white transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
                </button>
              </div>

              <div className="text-center">
                <Link
                  href="/account"
                  className="text-sm underline underline-offset-4 text-black/80 hover:text-black"
                >
                  {t('auth.backToAccount')}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
