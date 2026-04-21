'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { forgotPassword } from '@/lib/auth'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error(t('auth.emailRequired'))
      return
    }

    setIsLoading(true)

    const res = await forgotPassword({ email: email.trim() })
    setIsLoading(false)

    if (!res.ok) {
      toast.error(res.message || t('auth.resetError'))
      return
    }

    toast.success(res.message || t('auth.resetLinkSent'))
    setTimeout(() => {
      router.push('/login')
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-white pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
          <h1 className="mb-4 text-center font-serif text-3xl font-light md:text-4xl">
            {t('auth.forgotPassword')}
          </h1>
          <p className="mb-8 text-center text-sm text-black/70">
            {t('auth.forgotPasswordDesc')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                disabled={isLoading}
                required
              />
            </div>

            <div className="relative overflow-hidden border border-black">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative h-10 w-full bg-black text-sm font-normal uppercase tracking-wider text-white transition-all duration-300 ease-in-out hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                  {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
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
                {t('auth.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
