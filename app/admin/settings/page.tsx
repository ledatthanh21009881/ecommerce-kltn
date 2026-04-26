'use client'

import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react'
import { Save, Settings, Bell, Palette, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getAuthData } from '@/lib/admin-auth'
import type { InventoryVariant } from '@/lib/types'

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
  /** Khớp `SiteSettingsController::NOTIFICATION_DEFAULTS` */
  notifications: {
    admin_notify_new_order: boolean
    admin_notify_payment: boolean
    admin_notify_order_assigned: boolean
    email_invoice: boolean
    low_stock_alerts: boolean
    low_stock_threshold: number
  }
  appearance: {
    theme: string
    primary_color: string
    favicon_url: string
  }
}

const defaultNotifications = (): SettingsData['notifications'] => ({
  admin_notify_new_order: true,
  admin_notify_payment: true,
  admin_notify_order_assigned: true,
  email_invoice: true,
  low_stock_alerts: true,
  low_stock_threshold: 5,
})

export default function AdminSettingsPage() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<SettingsData>({
    general: {
      site_name: 'VIVIENNE',
      site_description: 'Your premium fashion destination',
      contact_email: 'contact@vivienne.com',
      contact_phone: '+84 123 456 789',
      address: '123 Fashion Street, District 1, Ho Chi Minh City',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND'
    },
    notifications: defaultNotifications(),
    appearance: {
      theme: 'light',
      primary_color: '#000000',
      favicon_url: '/icon.png'
    }
  })
  const [loading, setLoading] = useState(false)
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [faviconUploading, setFaviconUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [inventoryRows, setInventoryRows] = useState<InventoryVariant[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [changePasswordData, setChangePasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

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
      
      if (data.success && data.data) {
        const d = data.data
        setSettings((prev) => {
          const n = d.notifications as Partial<SettingsData['notifications']> | undefined
          const th = n?.low_stock_threshold
          const lowTh =
            typeof th === 'number' && !Number.isNaN(th)
              ? Math.max(0, Math.min(999999, th))
              : Math.max(0, parseInt(String(th ?? ''), 10) || defaultNotifications().low_stock_threshold)
          return {
            ...prev,
            ...d,
            general: { ...prev.general, ...d.general },
            appearance: { ...prev.appearance, ...d.appearance },
            notifications: { ...defaultNotifications(), ...n, low_stock_threshold: lowTh },
          }
        })
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

  const loadInventoryPreview = useCallback(async () => {
    try {
      setInventoryLoading(true)
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/inventory', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await response.json()
      const rows = Array.isArray(data.data) ? data.data : (data.data?.variants ?? [])
      setInventoryRows(Array.isArray(rows) ? (rows as InventoryVariant[]) : [])
    } catch {
      setInventoryRows([])
    } finally {
      setInventoryLoading(false)
    }
  }, [])

  const lowStockPreview = useMemo(() => {
    const th = settings.notifications.low_stock_threshold
    return inventoryRows.filter((v) => v.stock_quantity <= th)
  }, [inventoryRows, settings.notifications.low_stock_threshold])

  useEffect(() => {
    if (activeTab === 'notifications') {
      void loadInventoryPreview()
    }
  }, [activeTab, loadInventoryPreview])

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
    { id: 'appearance', label: t('settingsTabAppearance'), icon: Palette },
    { id: 'security', label: t('settingsTabSecurity'), icon: KeyRound },
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
      setChangePasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (error) {
      console.error('Change password error:', error)
      toast.error(t('settingsChangePasswordFailed'))
    } finally {
      setChangePasswordLoading(false)
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

                    {/* Notification Settings — theo từng kênh hệ thống thực sự có */}
                    {activeTab === 'notifications' && (
                      <div className="space-y-8">
                        <p className="text-sm text-slate-600">{t('settingsNotifSettingsHint')}</p>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                            {t('settingsNotifAdminSection')}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">{t('settingsNotifNewOrder')}</Label>
                              <p className="text-sm text-gray-500">{t('settingsNotifNewOrderDesc')}</p>
                            </div>
                            <Switch
                              checked={settings.notifications.admin_notify_new_order}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, admin_notify_new_order: checked }
                              })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">{t('settingsNotifPayment')}</Label>
                              <p className="text-sm text-gray-500">{t('settingsNotifPaymentDesc')}</p>
                            </div>
                            <Switch
                              checked={settings.notifications.admin_notify_payment}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, admin_notify_payment: checked }
                              })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">{t('settingsNotifOrderAssigned')}</Label>
                              <p className="text-sm text-gray-500">{t('settingsNotifOrderAssignedDesc')}</p>
                            </div>
                            <Switch
                              checked={settings.notifications.admin_notify_order_assigned}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, admin_notify_order_assigned: checked }
                              })}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                            {t('settingsNotifEmailSection')}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">{t('settingsEmailInvoice')}</Label>
                              <p className="text-sm text-gray-500">{t('settingsEmailInvoiceDesc')}</p>
                            </div>
                            <Switch
                              checked={settings.notifications.email_invoice}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, email_invoice: checked }
                              })}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                            {t('settingsNotifInventorySection')}
                          </h3>
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
                          <div className="space-y-2 max-w-xs">
                            <Label htmlFor="low_stock_threshold">{t('settingsLowStockThreshold')}</Label>
                            <p className="text-sm text-gray-500">{t('settingsLowStockThresholdDesc')}</p>
                            <Input
                              id="low_stock_threshold"
                              type="number"
                              min={0}
                              max={999999}
                              value={settings.notifications.low_stock_threshold}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10)
                                setSettings({
                                  ...settings,
                                  notifications: {
                                    ...settings.notifications,
                                    low_stock_threshold: Number.isNaN(v) ? 0 : Math.max(0, Math.min(999999, v)),
                                  },
                                })
                              }}
                            />
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-800">{t('settingsLowStockPreviewTitle')}</span>
                              {inventoryLoading && (
                                <span className="text-xs text-slate-500">{t('loading')}</span>
                              )}
                            </div>
                            {lowStockPreview.length === 0 ? (
                              <p className="text-sm text-slate-600">{t('settingsLowStockPreviewEmpty')}</p>
                            ) : (
                              <div className="max-h-56 overflow-auto">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-600">
                                      <th className="py-1.5 pr-2 font-medium">{t('settingsLowStockPreviewColProduct')}</th>
                                      <th className="py-1.5 pr-2 font-medium">{t('settingsLowStockPreviewColSku')}</th>
                                      <th className="py-1.5 pr-2 font-medium">{t('settingsLowStockPreviewColSize')}</th>
                                      <th className="py-1.5 font-medium text-right">{t('settingsLowStockPreviewColQty')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lowStockPreview.map((row) => (
                                      <tr key={row.variant_id} className="border-b border-slate-100 last:border-0">
                                        <td className="py-1.5 pr-2">{row.product_name}</td>
                                        <td className="py-1.5 pr-2 font-mono text-xs">{row.sku}</td>
                                        <td className="py-1.5 pr-2">{row.size_name}</td>
                                        <td className="py-1.5 text-right tabular-nums">{row.stock_quantity}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
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

                    {/* Security Settings */}
                    {activeTab === 'security' && (
                      <div className="space-y-6">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-slate-700" />
                            <h3 className="text-sm font-semibold text-slate-800">
                              {t('settingsChangePasswordTitle')}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              className="flex items-center gap-2"
                            >
                              <KeyRound className="h-4 w-4" />
                              {changePasswordLoading ? t('saving') : t('settingsChangePasswordButton')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Save Button (not needed in Security tab) */}
                    {activeTab !== 'security' && (
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
                    )}
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
