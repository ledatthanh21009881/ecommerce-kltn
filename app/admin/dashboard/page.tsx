'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  ArrowUpRight,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { DashboardChartDateFilter } from '@/components/admin/DashboardChartDateFilter'
import { adminApi } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Language } from '@/lib/ui-translations'

interface SeriesPoint {
  date: string
  revenue: number
}

interface DashboardStats {
  total_products: number
  total_orders: number
  total_users: number
  total_revenue: number
  revenue_series: SeriesPoint[]
  date_from: string
  date_to: string
  top_date_from: string
  top_date_to: string
  top_products: any[]
}

const TOP_BAR_FILLS = ['#6366f1', '#7c3aed', '#9333ea', '#a855f7', '#c084fc']

function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Tháng liền kề trước (mặc định bộ lọc). */
function lastMonthRange(): { from: string; to: string } {
  const now = new Date()
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayPrev = new Date(firstThisMonth.getTime() - 86400000)
  const firstPrev = new Date(lastDayPrev.getFullYear(), lastDayPrev.getMonth(), 1)
  return { from: toYmd(firstPrev), to: toYmd(lastDayPrev) }
}

function formatDisplayDate(iso: string, lang: Language): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function shortDayLabel(iso: string, lang: Language): string {
  const [y, mo, d] = iso.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  return dt.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
  })
}

/** Trục Y ngắn gọn */
function compactVnd(n: number): string {
  const x = Math.abs(n)
  if (x >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (x >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (x >= 1e3) return `${Math.round(n / 1e3)}k`
  return String(Math.round(n))
}

export default function AdminDashboardPage() {
  const { t, language } = useLanguage()
  const initialRange = useMemo(() => lastMonthRange(), [])
  const [revenueRange, setRevenueRange] = useState(initialRange)
  const [productsRange, setProductsRange] = useState(initialRange)

  const [stats, setStats] = useState<DashboardStats>({
    total_products: 0,
    total_orders: 0,
    total_users: 0,
    total_revenue: 0,
    revenue_series: [],
    date_from: initialRange.from,
    date_to: initialRange.to,
    top_date_from: initialRange.from,
    top_date_to: initialRange.to,
    top_products: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const statsData = await adminApi.getDashboard({
          from: revenueRange.from,
          to: revenueRange.to,
          topFrom: productsRange.from,
          topTo: productsRange.to,
        })

        if (cancelled) return

        if (statsData.success && statsData.data) {
          const d = statsData.data
          const series: SeriesPoint[] = Array.isArray(d.revenue_series)
            ? d.revenue_series.map((row: any) => ({
                date: String(row.date),
                revenue: Number(row.revenue) || 0,
              }))
            : []

          setStats({
            total_products: d.total_products ?? 0,
            total_orders: d.total_orders ?? 0,
            total_users: d.total_users ?? 0,
            total_revenue: parseFloat(String(d.total_revenue ?? 0)) || 0,
            revenue_series: series,
            date_from: String(d.date_from ?? revenueRange.from),
            date_to: String(d.date_to ?? revenueRange.to),
            top_date_from: String(d.top_date_from ?? productsRange.from),
            top_date_to: String(d.top_date_to ?? productsRange.to),
            top_products: Array.isArray(d.top_products) ? d.top_products : [],
          })
        } else {
          toast.error(t('dashboardFailedFetchStats'))
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching dashboard data:', error)
          toast.error(t('dashboardErrorFetching'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [revenueRange, productsRange])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

  const chartData = useMemo(() => {
    return stats.revenue_series.map((row) => ({
      ...row,
      label: shortDayLabel(row.date, language),
    }))
  }, [stats.revenue_series, language])

  const periodRevenueSum = useMemo(
    () => stats.revenue_series.reduce((s, r) => s + r.revenue, 0),
    [stats.revenue_series]
  )

  const maxDaily = useMemo(() => Math.max(1, ...chartData.map((d) => d.revenue)), [chartData])

  const xTickInterval = useMemo(() => {
    const n = chartData.length
    if (n <= 14) return 0
    return Math.max(0, Math.ceil(n / 14) - 1)
  }, [chartData.length])

  const productsBarData = useMemo(() => {
    return stats.top_products.slice(0, 5).map((p: any, i: number) => {
      const name = String(p.product_name || '')
      const short = name.length > 18 ? `${name.slice(0, 18)}…` : name
      return {
        product_id: p.product_id,
        shortName: short,
        fullName: name,
        revenue: Number(p.revenue) || 0,
        sales: Number(p.sales_count) || 0,
        rank: i + 1,
      }
    })
  }, [stats.top_products])

  const maxProductRev = useMemo(
    () => Math.max(1, ...productsBarData.map((d) => d.revenue)),
    [productsBarData]
  )

  const kpiCards = [
    {
      title: t('totalRevenue'),
      value: formatPrice(stats.total_revenue),
      subtitle: t('dashboardStatsSelectedPeriod'),
      icon: DollarSign,
      accent: 'from-emerald-500/15 to-transparent',
      iconBg: 'bg-emerald-500/15 text-emerald-700',
    },
    {
      title: t('totalOrders'),
      value: String(stats.total_orders),
      subtitle: t('dashboardStatsSelectedPeriod'),
      icon: ShoppingCart,
      accent: 'from-sky-500/15 to-transparent',
      iconBg: 'bg-sky-500/15 text-sky-700',
    },
    {
      title: t('totalProducts'),
      value: String(stats.total_products),
      subtitle: t('dashboardStatsAllProducts'),
      icon: Package,
      accent: 'from-violet-500/15 to-transparent',
      iconBg: 'bg-violet-500/15 text-violet-700',
    },
    {
      title: t('totalUsers'),
      value: String(stats.total_users),
      subtitle: t('dashboardStatsAllUsers'),
      icon: Users,
      accent: 'from-amber-500/15 to-transparent',
      iconBg: 'bg-amber-500/15 text-amber-800',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-white to-violet-50/40 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-violet-800 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Admin
            </div>
            <h1 className="admin-page-title">{t('dashboard')}</h1>
            <p className="admin-page-description mt-1 max-w-xl">{t('dashboardWelcomeSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((item) => (
            <Card
              key={item.title}
              className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md"
            >
              <div
                className={`pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${item.accent}`}
              />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{item.title}</CardTitle>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <item.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <TrendingUp className="h-3 w-3 text-slate-400" />
                  {item.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-slate-200/80 bg-white/95 shadow-md backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {t('dashboardMonthlyRevenueTitle')}
                      </CardTitle>
                      <p className="mt-1 text-xs text-slate-500">{t('dashboardMonthlyRevenueHint')}</p>
                      <p className="mt-2 text-xs font-medium text-violet-800">
                        {formatDisplayDate(stats.date_from, language)} — {formatDisplayDate(stats.date_to, language)}
                      </p>
                    </div>
                    <DashboardChartDateFilter
                      appliedFrom={revenueRange.from}
                      appliedTo={revenueRange.to}
                      onApply={setRevenueRange}
                      align="end"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-[320px] items-center justify-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                </div>
              ) : (
                <>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          interval={xTickInterval}
                        />
                        <YAxis
                          domain={[0, maxDaily]}
                          tickFormatter={(v) => compactVnd(Number(v))}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          width={44}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0].payload as (typeof chartData)[0]
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                                <p className="text-xs font-semibold text-slate-900">
                                  {formatDisplayDate(row.date, language)}
                                </p>
                                <p className="text-sm font-medium text-violet-700">{formatPrice(row.revenue)}</p>
                              </div>
                            )
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#6d28d9"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#fillRevenue)"
                          dot={
                            chartData.length <= 45
                              ? { r: 3, fill: '#6d28d9', stroke: '#fff', strokeWidth: 2 }
                              : false
                          }
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {periodRevenueSum <= 0 && (
                    <p className="mt-3 text-center text-xs text-slate-500">{t('dashboardMonthlyRevenueEmpty')}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-md backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-1">
                  <CardTitle className="text-lg font-semibold text-slate-900">{t('dashboardTopProducts')}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">{t('dashboardTopProductsByRevenueHint')}</p>
                  <p className="mt-1 text-xs text-violet-700/90">{t('dashboardTopProductsPeriodHint')}</p>
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {formatDisplayDate(stats.top_date_from, language)} —{' '}
                    {formatDisplayDate(stats.top_date_to, language)}
                  </p>
                </div>
                <DashboardChartDateFilter
                  appliedFrom={productsRange.from}
                  appliedTo={productsRange.to}
                  onApply={setProductsRange}
                  align="end"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-[320px] items-center justify-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                </div>
              ) : productsBarData.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Package className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm text-slate-500">{t('dashboardNoProductsData')}</p>
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productsBarData} margin={{ top: 12, right: 8, left: 8, bottom: 52 }}>
                      <defs>
                        {TOP_BAR_FILLS.map((color, i) => (
                          <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 10, fill: '#475569' }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        height={48}
                        angle={-28}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, maxProductRev]}
                        tickFormatter={(v) => compactVnd(Number(v))}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const row = payload[0].payload as (typeof productsBarData)[0]
                          return (
                            <div className="max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                              <p className="text-xs font-semibold leading-snug text-slate-900">{row.fullName}</p>
                              <p className="mt-1 text-sm font-medium text-violet-700">{formatPrice(row.revenue)}</p>
                              <p className="text-xs text-slate-500">
                                {language === 'vi'
                                  ? `${row.sales} lượt đã bán`
                                  : `${row.sales} units sold`}
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="revenue" radius={[10, 10, 0, 0]} maxBarSize={48}>
                        {productsBarData.map((_, i) => (
                          <Cell key={`c-${i}`} fill={`url(#barGrad${i % TOP_BAR_FILLS.length})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboardQuickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: '/admin/products', label: t('addProduct'), Icon: Package },
                { href: '/admin/orders', label: t('dashboardViewOrders'), Icon: ShoppingCart },
                { href: '/admin/users', label: t('dashboardManageUsers'), Icon: Users },
                { href: '/admin/payments', label: t('dashboardViewReports'), Icon: TrendingUp },
              ].map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-violet-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">{label}</span>
                  <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-violet-600" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
