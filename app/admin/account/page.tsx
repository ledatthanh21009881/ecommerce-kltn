'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, KeyRound, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLanguage } from '@/contexts/LanguageContext'
import { getAuthData, setAdminAvatarUrl } from '@/lib/admin-auth'
import { adminProfileApi } from '@/lib/adminProfileApi'

const PHONE_REGEX = /^0[0-9]{9}$/
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const MAX_AVATAR_BYTES = 10 * 1024 * 1024

function profileInitials(first: string, last: string, login: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  if (f || l) return `${f}${l}`.toUpperCase()
  return (login.trim().charAt(0) || 'A').toUpperCase()
}

export default function AdminAccountPage() {
  const { t } = useLanguage()
  const loginName = getAuthData().user?.account_name ?? ''

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({})

  const [changePasswordData, setChangePasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError(null)
    const { ok, data } = await adminProfileApi.getProfile()
    setProfileLoading(false)
    if (ok && data?.success && data.data) {
      const u = data.data
      setProfileData({
        firstName: u.first_name ?? '',
        lastName: u.last_name ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
      })
      const url = u.avatar_url?.trim() || null
      setAvatarUrl(url)
      setAdminAvatarUrl(url)
    } else {
      setProfileError((data as { message?: string })?.message ?? t('adminAccountLoadFailed'))
    }
  }, [t])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('adminAccountAvatarInvalid'))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t('adminAccountAvatarTooLarge'))
      return
    }

    try {
      setAvatarUploading(true)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
      })
      const { ok, data } = await adminProfileApi.uploadAvatar(base64)
      if (ok && data?.success && data.data?.avatar_url) {
        const url = data.data.avatar_url
        setAvatarUrl(url)
        setAdminAvatarUrl(url)
        toast.success(t('adminAccountAvatarSaved'))
      } else {
        toast.error((data as { message?: string })?.message ?? t('adminAccountAvatarFailed'))
      }
    } catch {
      toast.error(t('adminAccountAvatarFailed'))
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
    if (name === 'email' || name === 'phone') {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const phoneNormalized = profileData.phone.trim().replace(/\D/g, '')
    const emailValid = isValidEmail(profileData.email.trim())
    const phoneValid = PHONE_REGEX.test(phoneNormalized)

    if (!emailValid) {
      setFieldErrors((prev) => ({ ...prev, email: t('adminAccountEmailInvalid') }))
      toast.error(t('adminAccountEmailInvalid'))
      return
    }
    if (!phoneValid) {
      setFieldErrors((prev) => ({ ...prev, phone: t('adminAccountPhoneInvalid') }))
      toast.error(t('adminAccountPhoneInvalid'))
      return
    }

    setSaving(true)
    const { ok, data } = await adminProfileApi.updateProfile({
      first_name: profileData.firstName.trim(),
      last_name: profileData.lastName.trim(),
      email: profileData.email.trim(),
      phone: profileData.phone.trim(),
    })
    setSaving(false)

    if (ok && (data as { success?: boolean })?.success !== false) {
      toast.success(t('adminAccountProfileSaved'))
      await loadProfile()
      return
    }

    const errors = (data as { errors?: Record<string, string[]> })?.errors
    if (errors) {
      const next: { phone?: string; email?: string } = {}
      if (errors.phone?.[0]) next.phone = errors.phone[0]
      if (errors.email?.[0]) next.email = errors.email[0]
      setFieldErrors(next)
    }
    const msg = (data as { message?: string })?.message ?? t('adminAccountSaveFailed')
    toast.error(msg)
  }

  const handleChangePassword = async () => {
    const current = changePasswordData.current_password.trim()
    const next = changePasswordData.new_password.trim()
    const confirm = changePasswordData.confirm_password.trim()

    if (!current || !next || !confirm) {
      toast.error(t('settingsChangePasswordFailed'))
      return
    }
    if (next !== confirm) {
      toast.error(t('settingsPasswordMismatch'))
      return
    }

    try {
      setChangePasswordLoading(true)
      const { token } = getAuthData()
      if (!token) {
        toast.error(t('authenticationFailed'))
        return
      }
      const response = await fetch('/api/backend/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: current,
          new_password: next,
          confirm_password: confirm,
        }),
      })
      const data = await response.json()
      if (!response.ok || data?.success === false) {
        const firstError =
          data?.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).flat().find(Boolean)
            : null
        toast.error(firstError || data?.message || t('settingsChangePasswordFailed'))
        return
      }
      toast.success(t('settingsChangePasswordSuccess'))
      setChangePasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch {
      toast.error(t('settingsChangePasswordFailed'))
    } finally {
      setChangePasswordLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="admin-page-title mb-2">{t('adminAccountTitle')}</h1>
        <p className="admin-page-description">{t('adminAccountDesc')}</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {t('adminAccountProfileSection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <p className="text-sm text-gray-500">{t('loading')}</p>
            ) : (
              <>
                {profileError && <p className="mb-4 text-sm text-red-600">{profileError}</p>}
                <form className="space-y-4" onSubmit={handleSaveProfile}>
                  <div className="flex flex-col items-start gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-2 border-gray-200">
                        <AvatarImage src={avatarUrl ?? undefined} alt="" />
                        <AvatarFallback className="bg-gray-200 text-xl font-semibold text-gray-600">
                          {profileInitials(
                            profileData.firstName,
                            profileData.lastName,
                            loginName,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        disabled={avatarUploading}
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-white shadow hover:bg-gray-800 disabled:opacity-50"
                        aria-label={t('adminAccountChangeAvatar')}
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">{t('adminAccountAvatar')}</p>
                      <p className="text-xs text-gray-500">{t('adminAccountAvatarHint')}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={avatarUploading}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {avatarUploading ? t('saving') : t('adminAccountChangeAvatar')}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login_name">{t('adminAccountUsername')}</Label>
                    <Input
                      id="login_name"
                      value={loginName}
                      readOnly
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('firstName')}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('lastName')}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      inputMode="numeric"
                      maxLength={10}
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="0912345678"
                    />
                    {fieldErrors.phone && (
                      <p className="text-sm text-red-600">{fieldErrors.phone}</p>
                    )}
                    <p className="text-xs text-gray-500">{t('adminAccountPhoneHint')}</p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? t('saving') : t('adminAccountSaveProfile')}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5" />
              {t('settingsChangePasswordTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current_password">{t('settingsCurrentPassword')}</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={changePasswordData.current_password}
                  onChange={(e) =>
                    setChangePasswordData((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">{t('settingsNewPassword')}</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={changePasswordData.new_password}
                  onChange={(e) =>
                    setChangePasswordData((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">{t('settingsConfirmPassword')}</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={changePasswordData.confirm_password}
                  onChange={(e) =>
                    setChangePasswordData((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={changePasswordLoading}
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {changePasswordLoading ? t('saving') : t('settingsChangePasswordButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
