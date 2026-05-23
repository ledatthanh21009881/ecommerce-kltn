'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

function ResetPasswordForm() {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [token, setToken] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      validateToken(tokenFromUrl)
    } else {
      toast.error(t('reset.invalidLink'))
      router.push('/login')
    }
  }, [searchParams, router])

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch('/api/backend/v1/auth/validate-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: resetToken }),
      })

      const data = await response.json()

      if (data.success) {
        setIsValidToken(true)
      } else {
        toast.error(t('reset.invalidOrExpired'))
        router.push('/login')
      }
    } catch (error) {
      console.error('Token validation error:', error)
      toast.error(t('reset.validateError'))
      router.push('/login')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error(t('reset.fillAllFields'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('reset.passwordMismatch'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/backend/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(t('reset.success'))
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        toast.error(data.message || t('reset.failed'))
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error(t('reset.error'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <main className="min-h-screen bg-white pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-md text-center">
            <h2 className="mb-3 font-serif text-3xl font-light md:text-4xl">
              {t('reset.validatingTitle')}
            </h2>
            <p className="text-sm text-black/70">
              {t('reset.validatingDesc')}
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="mb-4 text-center font-serif text-3xl font-light md:text-4xl">
            {t('reset.title')}
          </h2>
          <p className="mb-8 text-center text-sm text-black/70">
            {t('reset.desc')}
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm">
                {t('reset.newPassword')}
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder={t('reset.newPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm">
                {t('reset.confirmPassword')}
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder={t('reset.confirmPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="relative overflow-hidden border border-black">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative h-10 w-full bg-black text-sm font-normal uppercase tracking-wider text-white transition-all duration-300 ease-in-out hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                  {isLoading ? t('reset.submitting') : t('reset.submit')}
                </span>
                <div className="absolute inset-0 translate-x-full transform bg-white transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4 text-black/80 hover:text-black"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('reset.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

function ResetPasswordFallback() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">{t('common.loading')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('common.pleaseWait')}</p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
