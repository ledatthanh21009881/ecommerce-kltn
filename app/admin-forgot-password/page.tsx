'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTranslation, type Language } from '@/lib/ui-translations'

function getAdminUiLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const admin = localStorage.getItem('adminLanguage')
  if (admin === 'vi' || admin === 'en') return admin
  const site = localStorage.getItem('language')
  if (site === 'vi' || site === 'en') return site
  return 'en'
}

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const lang = getAdminUiLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error(lang === 'vi' ? 'Vui lòng nhập email' : 'Please enter email')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), for_admin: true }),
      })
      const data = await response.json()
      if (!response.ok || data?.success === false) {
        const code = data?.error_code as string | undefined
        if (code === 'EMAIL_NOT_REGISTERED') {
          toast.error(getTranslation('forgotPasswordEmailNotFound', lang))
        } else if (code === 'NOT_ADMIN_FOR_RESET') {
          toast.error(getTranslation('forgotPasswordNotAdmin', lang))
        } else {
          toast.error(data?.message || getTranslation('error', lang))
        }
        return
      }
      toast.success(getTranslation('adminResetLinkSent', lang))
      setEmail('')
    } catch (error) {
      console.error('Admin forgot password failed:', error)
      toast.error(getTranslation('error', lang))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {getTranslation('adminForgotPasswordTitle', lang)}
          </CardTitle>
          <p className="text-gray-600">{getTranslation('adminForgotPasswordDesc', lang)}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{getTranslation('settingsContactEmail', lang)}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  {loading ? getTranslation('loading', lang) : getTranslation('send', lang)}
                </span>
                <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden"></div>
              </button>
            </div>
          </form>

          <div className="mt-4">
            <Link
              href="/admin-login"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {getTranslation('adminBackToLogin', lang)}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
