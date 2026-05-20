'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { isAuthenticated, getAuthData } from '@/lib/admin-auth'
import ConfirmModal from '@/components/ui/confirm-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminPageHeading } from '@/components/admin/AdminPageHeading'
import { translateAdminMenuLabel, type TranslationKey } from '@/lib/ui-translations'

interface PanelRole {
  role_id: number
  role_name: string
  display_name?: string | null
  user_count?: number
}

interface MenuItem {
  permission_id: number
  key: string
  path: string
  name: string
}

const ROLE_KEYS: Record<string, TranslationKey> = {
  admin: 'userRole_admin',
  staff: 'userRole_staff',
  manager: 'userRole_manager',
  sale_staff: 'userRole_sale_staff',
  account_manager: 'userRole_account_manager',
}

const MENU_ORDERS_KEY = 'menu.orders'
const ORDER_ACTION_MANAGE = 'orders.manage'
const ORDER_ACTION_ASSIGN = 'orders.assign_shipper'
const ALL_ORDER_ACTIONS = [ORDER_ACTION_MANAGE, ORDER_ACTION_ASSIGN] as const

export default function AdminRolesPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('list')

  const [roles, setRoles] = useState<PanelRole[]>([])
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingMenus, setSavingMenus] = useState(false)

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set())
  const [selectedOrderActions, setSelectedOrderActions] = useState<Set<string>>(new Set())

  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<PanelRole | null>(null)
  const [roleNameInput, setRoleNameInput] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PanelRole | null>(null)

  const authHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
    'Content-Type': 'application/json',
  })

  const roleLabel = (name: string) => {
    const key = ROLE_KEYS[name.trim().toLowerCase()]
    return key ? t(key) : name
  }

  const roleDisplayTitle = (role: PanelRole) => {
    const d = role.display_name?.trim()
    if (d) return d
    return roleLabel(role.role_name)
  }

  const canAccess = () => {
    const { user } = getAuthData()
    return (
      user?.roles?.includes('admin') ||
      user?.allowed_menus?.some((m) => m.key === 'menu.roles')
    )
  }

  const fetchPanelRoles = useCallback(async () => {
    const res = await fetch('/api/backend/v1/roles?limit=100', { headers: authHeaders() })
    const data = await res.json()
    if (data.success) {
      const list = data.data?.roles || []
      setRoles(list)
      setSelectedRoleId((prev) => prev ?? (list[0]?.role_id ?? null))
    }
  }, [])

  const fetchMenus = useCallback(async () => {
    const res = await fetch('/api/backend/v1/menu-permissions', { headers: authHeaders() })
    const data = await res.json()
    if (data.success) setMenus(data.data || [])
  }, [])

  const fetchRoleMenus = useCallback(async (roleId: number) => {
    const [menusRes, actionsRes] = await Promise.all([
      fetch(`/api/backend/v1/roles/${roleId}/menus`, { headers: authHeaders() }),
      fetch(`/api/backend/v1/roles/${roleId}/order-actions`, { headers: authHeaders() }),
    ])
    const menusData = await menusRes.json()
    const actionsData = await actionsRes.json()
    if (menusData.success) {
      setSelectedPermissionIds(new Set((menusData.data || []).map((m: MenuItem) => m.permission_id)))
    }
    if (actionsData.success) {
      setSelectedOrderActions(new Set((actionsData.data || []) as string[]))
    }
  }, [])

  const ordersMenuItem = menus.find((m) => m.key === MENU_ORDERS_KEY)
  const ordersMenuId = ordersMenuItem?.permission_id
  const hasOrdersMenu = ordersMenuId != null && selectedPermissionIds.has(ordersMenuId)
  const selectedRole = roles.find((r) => r.role_id === selectedRoleId)
  const selectedRoleIsAdmin = selectedRole?.role_name.toLowerCase() === 'admin'

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/admin-login')
      return
    }
    if (!canAccess()) {
      toast.error(t('noMenuAccess'))
      router.replace(getAuthData().user?.allowed_menus?.[0]?.path ?? '/admin/dashboard')
      return
    }
    void Promise.all([fetchPanelRoles(), fetchMenus()]).finally(() => setLoading(false))
  }, [router, fetchPanelRoles, fetchMenus, t])

  useEffect(() => {
    if (selectedRoleId) void fetchRoleMenus(selectedRoleId)
  }, [selectedRoleId, fetchRoleMenus])

  const openCreateRole = () => {
    setEditingRole(null)
    setRoleNameInput('')
    setDisplayNameInput('')
    setShowRoleModal(true)
  }

  const openEditRole = (role: PanelRole) => {
    setEditingRole(role)
    setRoleNameInput(role.role_name)
    setDisplayNameInput(role.display_name ?? '')
    setShowRoleModal(true)
  }

  const handleSaveRole = async () => {
    const name = roleNameInput.trim()
    const displayName = displayNameInput.trim()
    if (!name) {
      toast.error(t('roleName'))
      return
    }
    if (!displayName) {
      toast.error(t('roleDisplayNameRequired'))
      return
    }
    setSavingRole(true)
    try {
      const url = editingRole
        ? `/api/backend/v1/roles/${editingRole.role_id}`
        : '/api/backend/v1/roles'
      const res = await fetch(url, {
        method: editingRole ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ role_name: name, display_name: displayName }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingRole ? t('roleUpdated') : t('roleCreated'))
        setShowRoleModal(false)
        await fetchPanelRoles()
      } else {
        const msg =
          data?.message ||
          (data?.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).flat().join(' ')
            : null) ||
          t('operationFailed')
        toast.error(msg)
      }
    } catch {
      toast.error(t('operationFailed'))
    } finally {
      setSavingRole(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!deleteTarget) return
    if (deleteTarget.role_name.toLowerCase() === 'admin') {
      toast.error(t('roleProtectedAdmin'))
      setDeleteTarget(null)
      return
    }
    try {
      const res = await fetch(`/api/backend/v1/roles/${deleteTarget.role_id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('roleDeleted'))
        if (selectedRoleId === deleteTarget.role_id) {
          setSelectedRoleId(null)
        }
        await fetchPanelRoles()
      } else {
        toast.error(data.message || t('roleDeleteBlocked'))
      }
    } catch {
      toast.error(t('operationFailed'))
    } finally {
      setDeleteTarget(null)
    }
  }

  const togglePermission = (id: number, checked: boolean) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    if (ordersMenuId != null && id === ordersMenuId && !checked) {
      setSelectedOrderActions(new Set())
    }
  }

  const toggleOrderAction = (key: string, checked: boolean) => {
    if (selectedRoleIsAdmin) return
    setSelectedOrderActions((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const handleSaveMenus = async () => {
    if (!selectedRoleId) return
    setSavingMenus(true)
    try {
      const orderActionKeys = selectedRoleIsAdmin
        ? [...ALL_ORDER_ACTIONS]
        : hasOrdersMenu
          ? Array.from(selectedOrderActions)
          : []

      const [menusRes, actionsRes] = await Promise.all([
        fetch(`/api/backend/v1/roles/${selectedRoleId}/menus`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ permission_ids: Array.from(selectedPermissionIds) }),
        }),
        fetch(`/api/backend/v1/roles/${selectedRoleId}/order-actions`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ permission_keys: orderActionKeys }),
        }),
      ])
      const menusData = await menusRes.json()
      const actionsData = await actionsRes.json()
      if (menusData.success && actionsData.success) {
        toast.success(t('roleConfigSaved'))
      } else {
        toast.error(menusData.message || actionsData.message || t('operationFailed'))
      }
    } catch {
      toast.error(t('operationFailed'))
    } finally {
      setSavingMenus(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <p className="text-center py-20 text-slate-600">{t('loading')}</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <AdminPageHeading
        title={t('rolesManagement')}
        description={t('rolesManagementDesc')}
        actions={
          <>
            <Button
              variant="outline"
              className="bg-white/80 border-slate-200"
              onClick={() => {
                void fetchPanelRoles()
                void fetchMenus()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
            <Button onClick={openCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addRole')}
            </Button>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="bg-white/80 border border-slate-200/80">
          <TabsTrigger value="list">{t('rolesTabList')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('rolesTabPermissions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {roles.length === 0 ? (
            <Card className="border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="p-12 text-center text-slate-600">{t('noRolesFound')}</CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {roles.map((role) => {
                const isAdmin = role.role_name.toLowerCase() === 'admin'
                return (
                  <Card key={role.role_id} className="border-slate-200/80 bg-white/90 shadow-sm">
                    <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{roleDisplayTitle(role)}</p>
                        <p className="text-sm text-slate-500 font-mono">{role.role_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {t('roleUsersCount')}: {role.user_count ?? 0}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isAdmin && (
                          <Button variant="outline" size="sm" onClick={() => openEditRole(role)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            {t('edit')}
                          </Button>
                        )}
                        {!isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setDeleteTarget(role)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('delete')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1 border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="p-4 space-y-1">
                {roles.map((role) => (
                  <button
                    key={role.role_id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.role_id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedRoleId === role.role_id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {roleDisplayTitle(role)}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[480px] overflow-y-auto">
                  {menus.map((m) => {
                    const isOrdersMenu = m.key === MENU_ORDERS_KEY
                    const ordersChecked = selectedPermissionIds.has(m.permission_id)
                    return (
                      <div key={m.permission_id} className={isOrdersMenu ? 'sm:col-span-2' : ''}>
                        <label className="flex items-center gap-2 text-sm text-slate-700 p-2 rounded hover:bg-slate-50">
                          <Checkbox
                            checked={ordersChecked}
                            onCheckedChange={(c) => togglePermission(m.permission_id, c === true)}
                          />
                          <span className="font-medium">{translateAdminMenuLabel(m.key, t)}</span>
                        </label>
                        {isOrdersMenu && ordersChecked && (
                          <div className="ml-8 mt-1 mb-2 space-y-2 border-l-2 border-blue-100 pl-4">
                            <p className="text-xs text-slate-500">{t('orderActionsSubHint')}</p>
                            {ALL_ORDER_ACTIONS.map((actionKey) => (
                              <label
                                key={actionKey}
                                className="flex items-center gap-2 text-sm text-slate-600 p-1.5 rounded hover:bg-slate-50"
                              >
                                <Checkbox
                                  checked={
                                    selectedRoleIsAdmin ||
                                    selectedOrderActions.has(actionKey)
                                  }
                                  disabled={selectedRoleIsAdmin}
                                  onCheckedChange={(c) =>
                                    toggleOrderAction(actionKey, c === true)
                                  }
                                />
                                <span>
                                  {actionKey === ORDER_ACTION_MANAGE
                                    ? t('orderActionManage')
                                    : t('orderActionAssignShipper')}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <Button onClick={handleSaveMenus} disabled={savingMenus || !selectedRoleId}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingMenus ? t('creating') : t('roleConfigSave')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? t('editRole') : t('addRole')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="display_name">{t('roleDisplayName')}</Label>
              <Input
                id="display_name"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder={t('roleDisplayNamePlaceholder')}
              />
              <p className="text-xs text-slate-500 mt-1">{t('roleDisplayNameHint')}</p>
            </div>
            <div>
              <Label htmlFor="role_name">{t('roleName')}</Label>
              <Input
                id="role_name"
                value={roleNameInput}
                onChange={(e) => setRoleNameInput(e.target.value)}
                placeholder={t('roleNamePlaceholder')}
                disabled={editingRole?.role_name.toLowerCase() === 'admin'}
              />
              <p className="text-xs text-slate-500 mt-1">{t('roleNameHint')}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveRole} disabled={savingRole}>
                {savingRole ? t('creating') : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRole}
        title={t('delete')}
        description={t('roleDeleteConfirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  )
}
