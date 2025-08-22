'use client'

import { useState, useEffect } from 'react'
import { Save, Settings, Shield, Globe, CreditCard, Truck, Bell, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
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
  payment: {
    stripe_enabled: boolean
    stripe_public_key: string
    stripe_secret_key: string
    paypal_enabled: boolean
    paypal_client_id: string
    paypal_secret: string
    cash_on_delivery: boolean
  }
  shipping: {
    free_shipping_threshold: number
    default_shipping_cost: number
    shipping_zones: Array<{
      name: string
      cost: number
      countries: string[]
    }>
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
    logo_url: string
    favicon_url: string
  }
}

export default function AdminSettingsPage() {
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
    payment: {
      stripe_enabled: false,
      stripe_public_key: '',
      stripe_secret_key: '',
      paypal_enabled: false,
      paypal_client_id: '',
      paypal_secret: '',
      cash_on_delivery: true
    },
    shipping: {
      free_shipping_threshold: 500000,
      default_shipping_cost: 30000,
      shipping_zones: [
        { name: 'Local', cost: 15000, countries: ['VN'] },
        { name: 'Regional', cost: 50000, countries: ['TH', 'MY', 'SG'] },
        { name: 'International', cost: 200000, countries: ['US', 'UK', 'CA'] }
      ]
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
      logo_url: '/logo.png',
      favicon_url: '/favicon.ico'
    }
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/settings')
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.data || settings)
      } else {
        toast.error('Failed to fetch settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error fetching settings')
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
      const response = await fetch('/api/backend/v1/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error saving settings')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Configure your store settings and preferences</p>
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
                  {tabs.find(t => t.id === activeTab)?.label} Settings
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
                            <Label htmlFor="site_name">Site Name</Label>
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
                            <Label htmlFor="contact_email">Contact Email</Label>
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
                          <Label htmlFor="site_description">Site Description</Label>
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
                            <Label htmlFor="contact_phone">Contact Phone</Label>
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
                            <Label htmlFor="currency">Currency</Label>
                            <select
                              id="currency"
                              value={settings.general.currency}
                              onChange={(e) => setSettings({
                                ...settings,
                                general: { ...settings.general, currency: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="VND">Vietnamese Dong (VND)</option>
                              <option value="USD">US Dollar (USD)</option>
                              <option value="EUR">Euro (EUR)</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
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

                    {/* Payment Settings */}
                    {activeTab === 'payment' && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">Stripe Payment</Label>
                              <p className="text-sm text-gray-500">Enable Stripe payment gateway</p>
                            </div>
                            <Switch
                              checked={settings.payment.stripe_enabled}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                payment: { ...settings.payment, stripe_enabled: checked }
                              })}
                            />
                          </div>
                          {settings.payment.stripe_enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                              <div className="space-y-2">
                                <Label htmlFor="stripe_public_key">Stripe Public Key</Label>
                                <Input
                                  id="stripe_public_key"
                                  value={settings.payment.stripe_public_key}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    payment: { ...settings.payment, stripe_public_key: e.target.value }
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="stripe_secret_key">Stripe Secret Key</Label>
                                <Input
                                  id="stripe_secret_key"
                                  type="password"
                                  value={settings.payment.stripe_secret_key}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    payment: { ...settings.payment, stripe_secret_key: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">PayPal Payment</Label>
                              <p className="text-sm text-gray-500">Enable PayPal payment gateway</p>
                            </div>
                            <Switch
                              checked={settings.payment.paypal_enabled}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                payment: { ...settings.payment, paypal_enabled: checked }
                              })}
                            />
                          </div>
                          {settings.payment.paypal_enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                              <div className="space-y-2">
                                <Label htmlFor="paypal_client_id">PayPal Client ID</Label>
                                <Input
                                  id="paypal_client_id"
                                  value={settings.payment.paypal_client_id}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    payment: { ...settings.payment, paypal_client_id: e.target.value }
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="paypal_secret">PayPal Secret</Label>
                                <Input
                                  id="paypal_secret"
                                  type="password"
                                  value={settings.payment.paypal_secret}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    payment: { ...settings.payment, paypal_secret: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Cash on Delivery</Label>
                            <p className="text-sm text-gray-500">Allow customers to pay on delivery</p>
                          </div>
                          <Switch
                            checked={settings.payment.cash_on_delivery}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              payment: { ...settings.payment, cash_on_delivery: checked }
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Shipping Settings */}
                    {activeTab === 'shipping' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="free_shipping_threshold">Free Shipping Threshold (VND)</Label>
                            <Input
                              id="free_shipping_threshold"
                              type="number"
                              value={settings.shipping.free_shipping_threshold}
                              onChange={(e) => setSettings({
                                ...settings,
                                shipping: { ...settings.shipping, free_shipping_threshold: parseInt(e.target.value) }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="default_shipping_cost">Default Shipping Cost (VND)</Label>
                            <Input
                              id="default_shipping_cost"
                              type="number"
                              value={settings.shipping.default_shipping_cost}
                              onChange={(e) => setSettings({
                                ...settings,
                                shipping: { ...settings.shipping, default_shipping_cost: parseInt(e.target.value) }
                              })}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-base font-medium">Shipping Zones</Label>
                          {settings.shipping.shipping_zones.map((zone, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Zone Name</Label>
                                  <Input
                                    value={zone.name}
                                    onChange={(e) => {
                                      const newZones = [...settings.shipping.shipping_zones]
                                      newZones[index].name = e.target.value
                                      setSettings({
                                        ...settings,
                                        shipping: { ...settings.shipping, shipping_zones: newZones }
                                      })
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Shipping Cost (VND)</Label>
                                  <Input
                                    type="number"
                                    value={zone.cost}
                                    onChange={(e) => {
                                      const newZones = [...settings.shipping.shipping_zones]
                                      newZones[index].cost = parseInt(e.target.value)
                                      setSettings({
                                        ...settings,
                                        shipping: { ...settings.shipping, shipping_zones: newZones }
                                      })
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Countries</Label>
                                  <Input
                                    value={zone.countries.join(', ')}
                                    placeholder="VN, TH, MY"
                                    onChange={(e) => {
                                      const newZones = [...settings.shipping.shipping_zones]
                                      newZones[index].countries = e.target.value.split(',').map(c => c.trim())
                                      setSettings({
                                        ...settings,
                                        shipping: { ...settings.shipping, shipping_zones: newZones }
                                      })
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notification Settings */}
                    {activeTab === 'notifications' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Email Notifications</Label>
                            <p className="text-sm text-gray-500">Send notifications via email</p>
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
                            <Label className="text-base font-medium">SMS Notifications</Label>
                            <p className="text-sm text-gray-500">Send notifications via SMS</p>
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
                            <Label className="text-base font-medium">Order Confirmation</Label>
                            <p className="text-sm text-gray-500">Send order confirmation emails</p>
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
                            <Label className="text-base font-medium">Shipping Updates</Label>
                            <p className="text-sm text-gray-500">Send shipping status updates</p>
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
                            <Label className="text-base font-medium">Low Stock Alerts</Label>
                            <p className="text-sm text-gray-500">Notify when products are low in stock</p>
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
                            <Label htmlFor="theme">Theme</Label>
                            <select
                              id="theme"
                              value={settings.appearance.theme}
                              onChange={(e) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, theme: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="light">Light</option>
                              <option value="dark">Dark</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="primary_color">Primary Color</Label>
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
                            <Label htmlFor="logo_url">Logo URL</Label>
                            <Input
                              id="logo_url"
                              value={settings.appearance.logo_url}
                              onChange={(e) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, logo_url: e.target.value }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="favicon_url">Favicon URL</Label>
                            <Input
                              id="favicon_url"
                              value={settings.appearance.favicon_url}
                              onChange={(e) => setSettings({
                                ...settings,
                                appearance: { ...settings.appearance, favicon_url: e.target.value }
                              })}
                            />
                          </div>
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
                        {loading ? 'Saving...' : 'Save Settings'}
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
