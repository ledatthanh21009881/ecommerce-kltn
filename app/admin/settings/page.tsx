'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import { Save, Settings, Bell, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getAuthData } from '@/lib/admin-auth'

interface SettingsData {
  general: {
    site_name: string
    site_description: string
    contact_email: string
    contact_phone: string
    address: string
    timezone: string
    currency: string
  }
  notifications: {
    email_notifications: boolean
    sms_notifications: boolean
    order_confirmation: boolean
    shipping_updates: boolean
    low_stock_alerts: boolean
  }
  appearance: {
    theme: string
    primary_color: string
    favicon_url: string
  }
}

export default function AdminSettingsPage() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<SettingsData>({
    general: {
      site_name: 'ShopSwift',
      site_description: 'Your premium fashion destination',
      contact_email: 'contact@shopswift.com',
      contact_phone: '+84 123 456 789',
      address: '123 Fashion Street, District 1, Ho Chi Minh City',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND'
    },
    notifications: {
      email_notifications: true,
      sms_notifications: false,
      order_confirmation: true,
      shipping_updates: true,
      low_stock_alerts: true
    },
    appearance: {
      theme: 'light',
      primary_color: '#000000',
      favicon_url: '/icon.png'
    }
  })
  const [loading, setLoading] = useState(false)
  const [faviconUploading, setFaviconUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/settings', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.data || settings)
      } else {
        toast.error(t('settingsFetchFailed'))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error(t('settingsFetchError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Save settings
  const saveSettings = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings)
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(t('settingsSavedSuccessfully'))
      } else {
        toast.error(t('settingsSaveFailed'))
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(t('settingsSaveError'))
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'general', label: t('settingsTabGeneral'), icon: Settings },
    { id: 'notifications', label: t('settingsTabNotifications'), icon: Bell },
    { id: 'appearance', label: t('settingsTabAppearance'), icon: Palette }
  ]
  const faviconPreviewSrc = settings.appearance.favicon_url?.trim() || '/icon.png'

  const uploadFavicon = async (payload: { favicon_base64?: string; favicon_url?: string }) => {
    const { token } = getAuthData()
    const response = await fetch('/api/backend/v1/settings/favicon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Upload failed')
    }
    const nextUrl = data?.data?.favicon_url
    if (typeof nextUrl === 'string' && nextUrl.trim()) {
      setSettings((prev) => ({
        ...prev,
        appearance: { ...prev.appearance, favicon_url: nextUrl.trim() },
      }))
    }
    toast.success(t('settingsFaviconUploadSuccess'))
  }

  const handleFaviconFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('settingsFaviconInvalidFile'))
      return
    }

    try {
      setFaviconUploading(true)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(file)
      })
      await uploadFavicon({ favicon_base64: base64 })
    } catch (error) {
      console.error('Favicon file upload error:', error)
      toast.error(t('settingsFaviconUploadFailed'))
    } finally {
      setFaviconUploading(false)
      event.target.value = ''
    }
  }

  const handleUploadFaviconFromUrl = async () => {
    const url = settings.appearance.favicon_url?.trim()
    if (!url) {
      toast.error(t('settingsFaviconUrlRequired'))
      return
    }
    try {
      setFaviconUploading(true)
      const isRelative = url.startsWith('/')
      const isLocalhostUrl =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url) ||
        /^https?:\/\/192\.168\./i.test(url)

      if (isRelative || isLocalhostUrl) {
        const candidates: string[] = []
        const pushUnique = (value: string) => {
          if (value && !candidates.includes(value)) candidates.push(value)
        }
        const toAbsolute = (value: string) =>
          value.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${value}` : value

        pushUnique(toAbsolute(url))
        if (typeof window !== 'undefined') {
          pushUnique(`${window.location.origin}/icon.png`)
          pushUnique(`${window.location.origin}/favicon.ico`)
        }

        let blob: Blob | null = null
        let lastStatus: number | null = null

        for (const candidate of candidates) {
          try {
            const response = await fetch(candidate)
            if (!response.ok) {
              lastStatus = response.status
              continue
            }
            const nextBlob = await response.blob()
            if (!nextBlob.type.startsWith('image/')) {
              continue
            }
            blob = nextBlob
            break
          } catch {
            // try next candidate
          }
        }

        if (!blob) {
          throw new Error(`Failed to fetch favicon from URL${lastStatus ? `: ${lastStatus}` : ''}`)
        }

        if (!blob.type.startsWith('image/')) {
          throw new Error('URL does not point to a valid image')
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('Failed to read image from URL'))
          reader.readAsDataURL(blob)
        })
        await uploadFavicon({ favicon_base64: base64 })
      } else {
        await uploadFavicon({ favicon_url: url })
      }
    } catch (error) {
      console.error('Favicon URL upload error:', error)
      toast.error(t('settingsFaviconUploadFailed'))
    } finally {
      setFaviconUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="admin-page-title mb-2">{t('settingsManagement')}</h1>
          <p className="admin-page-description">{t('settingsStoreSubtitle')}</p>
        </div>

        {/* Settings Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = tabs.find(t => t.id === activeTab)?.icon || Settings
                    return <Icon className="h-5 w-5" />
                  })()}
                  {tabs.find(t => t.id === activeTab)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* General Settings */}
                    {activeTab === 'general' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="site_name">{t('settingsSiteName')}</Label>
                            <Input
                              id="site_name"
                              value={settings.general.site_name}
                              onChange={(e) => setSettings({
                                ...settings,
                                general: { ...settings.general, site_name: e.target.value }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact_email">{t('settingsContactEmail')}</Label>
                            <Input
                              id="contact_email"
                              type="email"
                              value={settings.general.contact_email}
                              onChange={(e) => setSettings({
                                ...settings,
                                general: { ...settings.general, contact_email: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="site_description">{t('settingsSiteDescription')}</Label>
                          <Textarea
                            id="site_description"
                            value={settings.general.site_description}
                            onChange={(e) => setSettings({
                              ...settings,
                              general: { ...settings.general, site_description: e.target.value }
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact_phone">{t('settingsContactPhone')}</Label>
                            <Input
                              id="contact_phone"
                              value={settings.general.contact_phone}
                              onChange={(e) => setSettings({
                                ...settings,
                                general: { ...settings.general, contact_phone: e.target.value }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="currency">{t('settingsCurrency')}</Label>
                            <select
                              id="currency"
                              value={settings.general.currency}
                              onChange={(e) => setSettings({
                                ...settings,
                                general: { ...settings.general, currency: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="VND">{t('settingsCurrencyVnd')}</option>
                              <option value="USD">{t('settingsCurrencyUsd')}</option>
                              <option value="EUR">{t('settingsCurrencyEur')}</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">{t('settingsAddress')}</Label>
                          <Textarea
                            id="address"
                            value={settings.general.address}
                            onChange={(e) => setSettings({
                              ...settings,
                              general: { ...settings.general, address: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Notification Settings */}
                    {activeTab === 'notifications' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">{t('settingsEmailNotifications')}</Label>
                            <p className="text-sm text-gray-500">{t('settingsEmailNotificationsDesc')}</p>
                          </div>
                          <Switch
                            checked={settings.notifications.email_notifications}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, email_notifications: checked }
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">{t('settingsSmsNotifications')}</Label>
                            <p className="text-sm text-gray-500">{t('settingsSmsNotificationsDesc')}</p>
                          </div>
                          <Switch
                            checked={settings.notifications.sms_notifications}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, sms_notifications: checked }
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">{t('settingsOrderConfirmation')}</Label>
                            <p className="text-sm text-gray-500">{t('settingsOrderConfirmationDesc')}</p>
                          </div>
                          <Switch
                            checked={settings.notifications.order_confirmation}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, order_confirmation: checked }
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">{t('settingsShippingUpdates')}</Label>
                            <p className="text-sm text-gray-500">{t('settingsShippingUpdatesDesc')}</p>
                          </div>
                          <Switch
                            checked={settings.notifications.shipping_updates}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, shipping_updates: checked }
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">{t('settingsLowStockAlerts')}</Label>
                            <p className="text-sm text-gray-500">{t('settingsLowStockAlertsDesc')}</p>
                          </div>
                          <Switch
                            checked={settings.notifications.low_stock_alerts}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, low_stock_alerts: checked }
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Appearance Settings */}
                    {activeTab === 'appearance' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="theme">{t('settingsTheme')}</Label>
                            <select
                              id="theme"
                              value={settings.appearance.theme}
                              onChange={(e) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, theme: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="light">{t('settingsThemeLight')}</option>
                              <option value="dark">{t('settingsThemeDark')}</option>
                              <option value="auto">{t('settingsThemeAuto')}</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="primary_color">{t('settingsPrimaryColor')}</Label>
                            <Input
                              id="primary_color"
                              type="color"
                              value={settings.appearance.primary_color}
                              onChange={(e) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, primary_color: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="favicon_url">{t('settingsFaviconUrl')}</Label>
                            <Input
                              id="favicon_url"
                              value={settings.appearance.favicon_url}
                              onChange={(e) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, favicon_url: e.target.value }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="favicon_file">{t('settingsFaviconFile')}</Label>
                            <Input
                              id="favicon_file"
                              type="file"
                              accept="image/*"
                              disabled={faviconUploading}
                              onChange={handleFaviconFileChange}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={faviconUploading}
                            onClick={handleUploadFaviconFromUrl}
                          >
                            {faviconUploading ? t('settingsFaviconUploading') : t('settingsFaviconUploadFromUrl')}
                          </Button>
                          <img
                            src={faviconPreviewSrc}
                            alt="favicon preview"
                            className="h-8 w-8 rounded border object-contain bg-white"
                            onError={(e) => {
                              const target = e.currentTarget
                              if (target.src.endsWith('/icon.png')) return
                              target.src = '/icon.png'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t">
                      <Button
                        onClick={saveSettings}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {loading ? t('saving') : t('settingsSaveButton')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
