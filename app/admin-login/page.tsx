'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Lock, User } from 'lucide-react'
import { getAuthData, setAuthData, checkAndRefreshAuth, getFirstAllowedPath } from '@/lib/admin-auth'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'

function isInvalidCredentialsErrorMessage(message?: string): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('invalid credentials') ||
    m.includes('invalid account') ||
    m.includes('invalid password') ||
    m.includes('sai tài khoản') ||
    m.includes('sai mật khẩu')
  )
}

function AdminLoginForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    account_name: '',
    password: '',
  })

  useEffect(() => {
    const checkAuth = async () => {
      console.log('AdminLoginPage useEffect - checking authentication...')

      const isValid = await checkAndRefreshAuth()

      if (isValid) {
        const { user } = getAuthData()
        console.log('User already logged in with valid token, redirecting to admin...', user)
        router.replace(getFirstAllowedPath(user) ?? '/admin/dashboard')
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.account_name || !formData.password) {
      toast.error(t('adminLoginFillAllFields'))
      return
    }

    setLoading(true)

    try {
      console.log('Sending login request with data:', formData)
      const response = await fetch('/api/backend/v1/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('Login response status:', response.status)
      console.log('Login response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Login failed with status:', response.status, 'Error:', errorText)
        toast.error(
          isInvalidCredentialsErrorMessage(errorText)
            ? t('authInvalidCredentials')
            : t('adminLoginFailedRetry'),
        )
        return
      }

      const result = await response.json()
      console.log('Login response data:', result)

      if (result.success) {
        console.log('Login successful, setting auth data:', result.data)
        if (result.data?.refresh_token) {
          localStorage.setItem('refresh_token', result.data.refresh_token)
        }
        const account = result.data.account ?? {}
        const sessionUser = {
          ...account,
          roles: result.data.roles ?? [],
          allowed_menus: result.data.allowed_menus ?? [],
          order_actions: result.data.order_actions ?? [],
        }
        if (!sessionUser.allowed_menus?.length && !(sessionUser.roles ?? []).includes('admin')) {
          toast.error(t('noMenuAccess'))
          return
        }
        setAuthData(result.data.token, sessionUser)
        toast.success(t('adminLoginSuccess'))

        const redirectTo =
          getFirstAllowedPath(sessionUser) ?? result.data.redirect ?? '/admin/dashboard'

        try {
          router.replace(redirectTo)
        } catch {
          window.location.href = redirectTo
        }
      } else {
        toast.error(
          isInvalidCredentialsErrorMessage(result.message)
            ? t('authInvalidCredentials')
            : result.message || t('adminLoginFailed'),
        )
      }
    } catch (error) {
      console.error('Login error:', error)
      const message = error instanceof Error ? error.message : t('adminLoginFailedRetry')
      toast.error(
        isInvalidCredentialsErrorMessage(message)
          ? t('authInvalidCredentials')
          : t('adminLoginFailedRetry'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('adminLoginTitle')}</CardTitle>
          <p className="text-gray-600">{t('adminLoginSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">{t('username')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t('adminLoginUsernamePlaceholder')}
                  value={formData.account_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, account_name: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('adminLoginPasswordPlaceholder')}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="relative overflow-hidden border border-black">
              <button
                type="submit"
                className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                  {loading ? t('adminLoginSigningIn') : t('adminLoginSignIn')}
                </span>
                <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
              </button>
            </div>
          </form>
          <div className="mt-4 text-right">
            <Link
              href="/admin-forgot-password"
              className="text-sm text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              {t('adminForgotPassword')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <LanguageProvider>
      <AdminLoginForm />
    </LanguageProvider>
  )
}
