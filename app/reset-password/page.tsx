'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'

function ResetPasswordForm() {
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
      toast.error('Invalid reset link')
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
        toast.error('Invalid or expired reset link')
        router.push('/login')
      }
    } catch (error) {
      console.error('Token validation error:', error)
      toast.error('Error validating reset link')
      router.push('/login')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
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
        toast.success('Password reset successfully')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        toast.error(data.message || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Error resetting password')
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
              Validating Reset Link
            </h2>
            <p className="text-sm text-black/70">
              Please wait while we validate your reset link...
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
            Reset Password
          </h2>
          <p className="mb-8 text-center text-sm text-black/70">
            Enter your new password below.
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm">
                New Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm your new password"
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
                  {isLoading ? 'Resetting...' : 'Reset Password'}
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
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
            <p className="mt-2 text-sm text-gray-600">Please wait.</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
