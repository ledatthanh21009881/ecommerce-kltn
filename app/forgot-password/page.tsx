'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'

type Step = 'email' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : ''

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error(t('otp.emailRequired'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success(t('otp.codeSent'))
        setStep('otp')
        setCountdown(60)
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else {
        if (data.error_code === 'EMAIL_NOT_REGISTERED') {
          toast.error(t('otp.emailNotRegistered'))
        } else {
          toast.error(data.message || t('otp.sendError'))
        }
      }
    } catch {
      toast.error(t('otp.sendError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error(t('otp.enterFullCode'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success(t('otp.verified'))
        setStep('password')
      } else {
        toast.error(data.message || t('otp.invalidCode'))
      }
    } catch {
      toast.error(t('otp.verifyError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success(t('otp.resent'))
        setOtp(['', '', '', '', '', ''])
        setCountdown(60)
        otpRefs.current[0]?.focus()
      } else {
        toast.error(data.message || t('otp.sendError'))
      }
    } catch {
      toast.error(t('otp.sendError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirmPassword) {
      toast.error(t('otp.fillAllFields'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('otp.passwordMismatch'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.join(''),
          new_password: password,
          confirm_password: confirmPassword,
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success(t('otp.resetSuccess'))
        setTimeout(() => router.push('/login'), 2000)
      } else {
        toast.error(data.message || t('otp.resetFailed'))
      }
    } catch {
      toast.error(t('otp.resetError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
          {step === 'email' && (
            <>
              <h1 className="mb-4 text-center font-serif text-3xl font-light md:text-4xl">
                {t('otp.forgotTitle')}
              </h1>
              <p className="mb-8 text-center text-sm text-black/70">
                {t('otp.forgotDesc')}
              </p>
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm">
                    {t('otp.emailLabel')}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('otp.emailPlaceholder')}
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
                      {isLoading ? t('otp.sending') : t('otp.sendOTP')}
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
                    {t('otp.backToLogin')}
                  </Link>
                </div>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h1 className="mb-4 text-center font-serif text-3xl font-light md:text-4xl">
                {t('otp.verifyTitle')}
              </h1>
              <p className="mb-8 text-center text-sm text-black/70">
                {t('otp.verifyDesc')}{' '}
                <span className="font-medium text-black">{maskedEmail}</span>
              </p>
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-14 w-12 rounded-lg border-2 border-black/20 text-center text-2xl font-bold transition-colors focus:border-black focus:outline-none"
                      disabled={isLoading}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-black/50">
                  {t('otp.expiresIn')}
                </p>
                <div className="relative overflow-hidden border border-black">
                  <button
                    type="submit"
                    disabled={isLoading || otp.join('').length !== 6}
                    className="group relative h-10 w-full bg-black text-sm font-normal uppercase tracking-wider text-white transition-all duration-300 ease-in-out hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                      {isLoading ? t('otp.verifying') : t('otp.verify')}
                    </span>
                    <div className="absolute inset-0 translate-x-full transform bg-white transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
                  </button>
                </div>
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-black/50">
                      {t('otp.resendIn')} {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-sm underline underline-offset-4 text-black/80 hover:text-black disabled:opacity-50"
                    >
                      {t('otp.resend')}
                    </button>
                  )}
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="inline-flex items-center gap-1 text-sm underline underline-offset-4 text-black/80 hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('otp.changeEmail')}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'password' && (
            <>
              <h1 className="mb-4 text-center font-serif text-3xl font-light md:text-4xl">
                {t('otp.newPasswordTitle')}
              </h1>
              <p className="mb-8 text-center text-sm text-black/70">
                {t('otp.newPasswordDesc')}
              </p>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm">
                    {t('otp.newPasswordLabel')}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('otp.newPasswordPlaceholder')}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm">
                    {t('otp.confirmPasswordLabel')}
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('otp.confirmPasswordPlaceholder')}
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
                      {isLoading ? t('otp.resetting') : t('otp.resetPassword')}
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
                    {t('otp.backToLogin')}
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
