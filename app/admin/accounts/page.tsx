'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  RefreshCw,
  Users,
  UserPlus,
  Shield,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { isAuthenticated, getAuthData } from '@/lib/admin-auth'
import ConfirmModal from '@/components/ui/confirm-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminPageHeading } from '@/components/admin/AdminPageHeading'
import { translateAdminMenuLabel, type TranslationKey } from '@/lib/ui-translations'

interface AccountRow {
  user_id: number
  account_name: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  roles: string[]
  is_active: boolean
  last_login_at?: string
  menu_preview?: string[]
}

interface AccountStats {
  total_accounts: number
  active_accounts: number
  admins: number
  staff: number
}

interface RoleOption {
  role_id: number
  role_name: string
}

interface MenuItem {
  permission_id: number
  key: string
  path: string
  name: string
}

const EXTERNAL_ROLES = ['customer', 'shipper']

const ROLE_KEYS: Record<string, TranslationKey> = {
  admin: 'userRole_admin',
  staff: 'userRole_staff',
  manager: 'userRole_manager',
  sale_staff: 'userRole_sale_staff',
  account_manager: 'userRole_account_manager',
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  iconBg,
}: {
  label: string
  value: number
  icon: LucideIcon
  gradient: string
  iconBg: string
}) {
  return (
    <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
      <StatGradientAccent className={gradient} />
      <CardContent className="p-6">
        <StatCardBody label={label} value={value} Icon={Icon} iconBg={iconBg} />
      </CardContent>
    </Card>
  )
}

function StatGradientAccent({ className }: { className: string }) {
  return (
    <div
      className={`pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${className} to-transparent`}
    />
  )
}

function StatCardBody({
  label,
  value,
  Icon,
  iconBg,
}: {
  label: string
  value: number
  Icon: LucideIcon
  iconBg: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}

export default function AdminAccountsPage() {
  const { t } = useLanguage()
  const router = useRouter()

  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [stats, setStats] = useState<AccountStats>({
    total_accounts: 0,
    active_accounts: 0,
    admins: 0,
    staff: 0,
  })
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [allMenus, setAllMenus] = useState<MenuItem[]>([])
  const [roleMenuKeys, setRoleMenuKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AccountRow | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    account_name: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_active: true,
    role_id: '',
  })

  const authHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
    'Content-Type': 'application/json',
  })

  const roleLabel = (name: string) => {
    const key = ROLE_KEYS[name.trim().toLowerCase()]
    return key ? t(key) : name
  }

  const fetchRoles = useCallback(async () => {
    const res = await fetch('/api/backend/v1/roles/all?scope=panel', { headers: authHeaders() })
    const data = await res.json()
    if (data.success) {
      setRoles(
        (data.data || []).filter(
          (r: RoleOption) => !EXTERNAL_ROLES.includes(r.role_name.toLowerCase()),
        ),
      )
    }
  }, [])

  const fetchAllMenus = useCallback(async () => {
    const res = await fetch('/api/backend/v1/menu-permissions', { headers: authHeaders() })
    const data = await res.json()
    if (data.success) setAllMenus(data.data || [])
  }, [])

  const fetchRoleMenus = async (roleId: number) => {
    const res = await fetch(`/api/backend/v1/roles/${roleId}/menus`, { headers: authHeaders() })
    const data = await res.json()
    if (data.success) {
      setRoleMenuKeys(new Set((data.data || []).map((m: MenuItem) => m.key)))
    }
  }

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (searchTerm) params.set('search', searchTerm)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (statusFilter === 'active') params.set('status', 'active')
      if (statusFilter === 'inactive') params.set('status', 'inactive')

      const res = await fetch(`/api/backend/v1/accounts?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        const list = data.data?.items ?? data.data ?? []
        setAccounts(Array.isArray(list) ? list : [])
        setTotal(data.data?.pagination?.total ?? data.pagination?.total ?? 0)
      }
    } catch {
      toast.error(t('operationFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, roleFilter, statusFilter, t])

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/backend/v1/accounts/stats', { headers: authHeaders() })
    const data = await res.json()
    if (data.success) setStats(data.data)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/admin-login')
      return
    }
    void fetchRoles()
    void fetchAllMenus()
    void fetchStats()
  }, [router, fetchRoles, fetchAllMenus, fetchStats])

  useEffect(() => {
    void fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (form.role_id) void fetchRoleMenus(parseInt(form.role_id, 10))
  }, [form.role_id])

  const openCreate = () => {
    setEditing(null)
    setForm({
      account_name: '',
      password: '',
      confirm_password: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      is_active: true,
      role_id: roles[0] ? String(roles[0].role_id) : '',
    })
    setShowModal(true)
  }

  const openEdit = (row: AccountRow) => {
    const roleId = roles.find((r) => row.roles?.includes(r.role_name))?.role_id
    setEditing(row)
    setForm({
      account_name: row.account_name,
      password: '',
      confirm_password: '',
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone || '',
      is_active: row.is_active,
      role_id: roleId ? String(roleId) : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.account_name || !form.first_name || !form.last_name || !form.email || !form.role_id) {
      toast.error(t('adminLoginFillAllFields'))
      return
    }
    if (!editing && (!form.password || form.password !== form.confirm_password)) {
      toast.error(t('confirmPassword'))
      return
    }
    if (editing && form.password && form.password !== form.confirm_password) {
      toast.error(t('confirmPassword'))
      return
    }

    const body: Record<string, unknown> = {
      account_name: form.account_name,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || null,
      role_ids: [parseInt(form.role_id, 10)],
      is_active: form.is_active,
    }
    if (form.password) body.password = form.password

    try {
      const url = editing ? '/api/backend/v1/accounts/update' : '/api/backend/v1/accounts'
      const method = editing ? 'PUT' : 'POST'
      if (editing) body.user_id = editing.user_id

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        toast.success(editing ? t('userUpdatedSuccessfully') : t('userCreatedSuccessfully'))
        setShowModal(false)
        void fetchAccounts()
        void fetchStats()
      } else {
        toast.error(data.message || t('operationFailed'))
      }
    } catch {
      toast.error(t('operationFailed'))
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/backend/v1/accounts/delete?user_id=${deletingId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('userDeletedSuccessfully'))
        void fetchAccounts()
        void fetchStats()
      } else {
        toast.error(data.message || t('failedToDeleteUser'))
      }
    } catch {
      toast.error(t('failedToDeleteUser'))
    } finally {
      setShowDeleteModal(false)
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (loading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="mt-4 text-slate-600">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeading
          title={t('accountManagement')}
          description={t('accountManagementDesc')}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => { void fetchAccounts(); void fetchStats() }}
                className="bg-white/80 border-slate-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
              <Button onClick={openCreate}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('createAccount')}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label={t('totalAccounts')} value={stats.total_accounts} icon={Users} gradient="from-blue-500/15" iconBg="bg-blue-500/15 text-blue-700" />
          <StatCard label={t('activeUsers')} value={stats.active_accounts} icon={Users} gradient="from-emerald-500/15" iconBg="bg-emerald-500/15 text-emerald-700" />
          <StatCard label={t('accountAdmins')} value={stats.admins} icon={Shield} gradient="from-rose-500/15" iconBg="bg-rose-500/15 text-rose-700" />
          <StatCard label={t('accountStaff')} value={stats.staff} icon={UserPlus} gradient="from-indigo-500/15" iconBg="bg-indigo-500/15 text-indigo-700" />
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/80 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-10 bg-white/50"
                  placeholder={t('searchAccountsPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder={t('role')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRoles')}</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.role_id} value={r.role_name}>
                      {roleLabel(r.role_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-slate-200/80 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left p-4 font-medium text-slate-600">{t('username')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('firstName')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">Email</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('role')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('menusVisible')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('status')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('lastLogin')}</th>
                    <th className="text-right p-4 font-medium text-slate-600">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">{t('noAccountsFound')}</td>
                    </tr>
                  ) : (
                    accounts.map((row) => (
                      <tr key={row.user_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-4 font-medium">{row.account_name}</td>
                        <td className="p-4">{row.first_name} {row.last_name}</td>
                        <td className="p-4">{row.email}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {(row.roles || []).map((r) => (
                              <Badge key={r} variant="outline">{roleLabel(r)}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          {row.menu_preview?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {row.menu_preview.map((token, i) => (
                                <Badge key={`${token}-${i}`} variant="secondary" className="text-xs font-normal whitespace-nowrap">
                                  {translateAdminMenuLabel(token, t)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              row.is_active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 whitespace-nowrap'
                                : 'border-slate-200 bg-slate-100 text-slate-600 whitespace-nowrap'
                            }
                          >
                            {row.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {row.last_login_at ? new Date(row.last_login_at).toLocaleString() : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeletingId(row.user_id); setShowDeleteModal(true) }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-100">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="admin-page-title text-2xl">
                {editing ? t('editAccountModalTitle') : t('createAccountModalTitle')}
              </DialogTitle>
              <p className="text-sm text-slate-600">{t('accountModalSubtitle')}</p>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <div>
                  <Label>{t('username')} *</Label>
                  <Input
                    value={form.account_name}
                    onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                    disabled={!!editing}
                  />
                </div>
                <div>
                  <Label>{t('password')} {editing ? '' : '*'}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('confirmPassword')} {editing ? '' : '*'}</Label>
                  <Input
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('firstName')} *</Label>
                    <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t('lastName')} *</Label>
                    <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>{t('phoneNumber')}</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="flex flex-row items-center gap-2">
                  <Checkbox
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c === true }))}
                  />
                  <Label htmlFor="is_active" className="whitespace-nowrap cursor-pointer">
                    {t('active')}
                  </Label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>{t('role')} *</Label>
                  <Select value={form.role_id} onValueChange={(v) => setForm((f) => ({ ...f, role_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('selectRole')} /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.role_id} value={String(r.role_id)}>{roleLabel(r.role_name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{t('menuPreviewTitle')}</p>
                  <p className="text-sm text-slate-500 mb-3">{t('menuPreviewNote')}</p>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                    {allMenus.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 text-sm text-slate-700 whitespace-nowrap">
                        <Checkbox checked={roleMenuKeys.has(m.key)} disabled />
                        <span>{translateAdminMenuLabel(m.key, t)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                    {t('menuPreviewConfigHint')}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave}>{editing ? t('save') : t('createAccount')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title={t('deleteUser')}
          description={t('deleteUserConfirm')}
        />
      </div>
    </div>
  )
}
