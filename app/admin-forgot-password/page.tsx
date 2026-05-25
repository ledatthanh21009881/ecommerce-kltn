'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

type Step = 'email' | 'otp' | 'password'

export default function AdminForgotPasswordPage() {
  const router = useRouter()
  const lang = getAdminUiLanguage()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
      toast.error(lang === 'vi' ? 'Vui lòng nhập email' : 'Please enter email')
      return
    }

    setLoading(true)
    try {
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
      toast.success(lang === 'vi' ? 'Mã OTP đã được gửi đến email của bạn' : 'OTP code has been sent to your email')
      setStep('otp')
      setCountdown(60)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch {
      toast.error(getTranslation('error', lang))
    } finally {
      setLoading(false)
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
      toast.error(lang === 'vi' ? 'Vui lòng nhập đầy đủ mã 6 chữ số' : 'Please enter the full 6-digit code')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(lang === 'vi' ? 'Xác nhận OTP thành công' : 'OTP verified successfully')
        setStep('password')
      } else {
        toast.error(data.message || (lang === 'vi' ? 'Mã OTP không hợp lệ' : 'Invalid OTP code'))
      }
    } catch {
      toast.error(getTranslation('error', lang))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    setLoading(true)
    try {
      const response = await fetch('/api/backend/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), for_admin: true }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(lang === 'vi' ? 'Mã OTP mới đã được gửi' : 'New OTP code has been sent')
        setOtp(['', '', '', '', '', ''])
        setCountdown(60)
        otpRefs.current[0]?.focus()
      } else {
        toast.error(data.message || getTranslation('error', lang))
      }
    } catch {
      toast.error(getTranslation('error', lang))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirmPassword) {
      toast.error(lang === 'vi' ? 'Vui lòng điền đầy đủ các trường' : 'Please fill in all fields')
      return
    }
    if (password !== confirmPassword) {
      toast.error(lang === 'vi' ? 'Mật khẩu không khớp' : 'Passwords do not match')
      return
    }

    setLoading(true)
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
        toast.success(lang === 'vi' ? 'Đặt lại mật khẩu thành công!' : 'Password reset successfully!')
        setTimeout(() => router.push('/admin-login'), 2000)
      } else {
        toast.error(data.message || (lang === 'vi' ? 'Đặt lại mật khẩu thất bại' : 'Failed to reset password'))
      }
    } catch {
      toast.error(getTranslation('error', lang))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        {step === 'email' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {getTranslation('adminForgotPasswordTitle', lang)}
              </CardTitle>
              <p className="text-gray-600">
                {lang === 'vi'
                  ? 'Nhập email của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.'
                  : 'Enter your email and we will send you an OTP code to reset your password.'}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOTP} className="space-y-4">
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
                      {loading
                        ? getTranslation('loading', lang)
                        : lang === 'vi' ? 'Gửi mã OTP' : 'Send OTP Code'}
                    </span>
                    <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
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
          </>
        )}

        {step === 'otp' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {lang === 'vi' ? 'Xác nhận mã OTP' : 'Verify OTP Code'}
              </CardTitle>
              <p className="text-gray-600">
                {lang === 'vi' ? 'Nhập mã 6 chữ số đã gửi đến' : 'Enter the 6-digit code sent to'}{' '}
                <span className="font-medium text-gray-900">{maskedEmail}</span>
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
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
                      className="h-14 w-12 rounded-lg border-2 border-slate-200 text-center text-2xl font-bold transition-colors focus:border-blue-500 focus:outline-none"
                      disabled={loading}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-slate-500">
                  {lang === 'vi' ? 'Mã OTP có hiệu lực trong 10 phút' : 'OTP code is valid for 10 minutes'}
                </p>
                <div className="relative overflow-hidden border border-black">
                  <button
                    type="submit"
                    disabled={loading || otp.join('').length !== 6}
                    className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                      {loading
                        ? (lang === 'vi' ? 'Đang xác nhận...' : 'Verifying...')
                        : (lang === 'vi' ? 'Xác nhận' : 'Verify')}
                    </span>
                    <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
                  </button>
                </div>
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-slate-500">
                      {lang === 'vi' ? 'Gửi lại mã sau' : 'Resend OTP in'} {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-4 disabled:opacity-50"
                    >
                      {lang === 'vi' ? 'Gửi lại mã OTP' : 'Resend OTP Code'}
                    </button>
                  )}
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {lang === 'vi' ? 'Thay đổi email' : 'Change email address'}
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {step === 'password' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {lang === 'vi' ? 'Đặt mật khẩu mới' : 'Set New Password'}
              </CardTitle>
              <p className="text-gray-600">
                {lang === 'vi' ? 'Nhập mật khẩu mới của bạn bên dưới.' : 'Enter your new password below.'}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">
                    {lang === 'vi' ? 'Mật khẩu mới' : 'New Password'}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="mt-1.5 h-10 border-slate-200"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">
                    {lang === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="mt-1.5 h-10 border-slate-200"
                    required
                  />
                </div>
                <div className="relative overflow-hidden border border-black">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                      {loading
                        ? (lang === 'vi' ? 'Đang đặt lại...' : 'Resetting...')
                        : (lang === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password')}
                    </span>
                    <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
                  </button>
                </div>
                <div className="text-center">
                  <Link
                    href="/admin-login"
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {getTranslation('adminBackToLogin', lang)}
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
