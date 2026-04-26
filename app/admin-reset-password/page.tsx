'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, ArrowLeft } from 'lucide-react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'

function AdminResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [token, setToken] = useState('')
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch('/api/backend/v1/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken }),
      })
      const data = await response.json()
      if (data.success) {
        setIsValidToken(true)
      } else {
        toast.error(t('adminResetInvalidLink'))
        router.replace('/admin-login')
      }
    } catch {
      toast.error(t('adminResetFailed'))
      router.replace('/admin-login')
    }
  }

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      void validateToken(tokenFromUrl)
    } else {
      toast.error(t('adminResetInvalidLink'))
      router.replace('/admin-login')
    }
    // Intentionally omit `t` / `validateToken` to only react to URL token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirmPassword) {
      toast.error(t('adminLoginFillAllFields'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('settingsPasswordMismatch'))
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(t('adminResetSuccess'))
        setTimeout(() => {
          router.replace('/admin-login')
        }, 1500)
      } else {
        toast.error(data.message || t('adminResetFailed'))
      }
    } catch {
      toast.error(t('adminResetFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <p className="text-sm text-muted-foreground">
          {t('adminResetValidating')}
          <br />
          <span className="text-xs">{t('adminResetValidatingSub')}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('adminResetPasswordTitle')}</CardTitle>
          <p className="text-sm text-gray-600">{t('adminResetPasswordDesc')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-password">{t('adminResetPasswordNew')}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1.5 h-10 border-slate-200"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">{t('adminResetPasswordConfirm')}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1.5 h-10 border-slate-200"
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
                  {isLoading ? t('adminResetPasswordSubmitting') : t('adminResetPasswordButton')}
                </span>
                <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
              </button>
            </div>
            <div className="pt-2 text-center">
              <Link
                href="/admin-login"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('adminResetBackToLogin')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function AdminResetPasswordWithLang() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        }
      >
        <AdminResetPasswordForm />
      </Suspense>
    </LanguageProvider>
  )
}

export default function AdminResetPasswordPage() {
  return <AdminResetPasswordWithLang />
}
