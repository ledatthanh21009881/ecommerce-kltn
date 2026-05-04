'use client'

import { useState, useEffect } from 'react'
import { AdminVnAddressFields, isInsideAddressDropdown, type AdminAddressValue } from '@/components/admin/AdminVnAddressFields'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Users, UserPlus, Mail, Phone, Calendar, Shield, Truck, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { isAuthenticated } from '@/lib/admin-auth'
import ConfirmModal from '@/components/ui/confirm-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/ui-translations'

interface User {
  user_id: number
  account_name: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  roles: string[] | string // This can be array or string from backend
  is_active: boolean
  created_at: string
  last_login_at?: string
}

interface UserStats {
  total_users: number
  active_users: number
  admins: number
  managers: number
  staff: number
  customers: number
}

const USER_ROLE_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  admin: 'userRole_admin',
  customer: 'userRole_customer',
  shipper: 'userRole_shipper',
  staff: 'userRole_staff',
  manager: 'userRole_manager',
}

/** Tên vai trò từ API (admin, customer, …) → bản dịch theo ngôn ngữ admin. */
function translatedUserRole(
  roleName: string,
  t: (key: TranslationKey, params?: Record<string, string>) => string
): string {
  const key = USER_ROLE_TRANSLATION_KEYS[roleName.trim().toLowerCase()]
  return key ? t(key) : roleName
}

export default function AdminUsersPage() {
  const { t } = useLanguage()
  
  // CSS để bỏ backdrop mờ
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      [data-radix-dialog-overlay] {
        background: transparent !important;
        backdrop-filter: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    admins: 0,
    managers: 0,
    staff: 0,
    customers: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [roles, setRoles] = useState<Array<{role_id: number, role_name: string}>>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_users_view') as 'list' | 'grid') || 'list'
    return 'list'
  })
  const [addDialogContentEl, setAddDialogContentEl] = useState<HTMLElement | null>(null)
  const [editDialogContentEl, setEditDialogContentEl] = useState<HTMLElement | null>(null)

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_users_view', mode)
  }

  // Check authentication using admin auth system
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/admin-login')
      return
    }

    // If authenticated, load data
    fetchUsers()
    fetchStats()
    fetchRoles()
  }, [router])

  // Fetch roles for dropdown
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        console.error('No admin token found')
        return
      }

      const response = await fetch('/api/backend/v1/roles/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setRoles(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      console.log('🔍 Fetching users with token:', token ? 'Token exists' : 'No token')
      
      if (!token) {
        console.error('No admin token found')
        return
      }

      console.log('📡 Making request to /api/backend/v1/users')
      const response = await fetch('/api/backend/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📥 Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 Response data:', data)
      
      if (data.success) {
        const list = data.data?.items ?? data.data
        setUsers(Array.isArray(list) ? list : [])
      } else {
        console.error('❌ Failed to fetch users:', data.message)
        toast.error(t('failedToFetchUsers'))
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      toast.error(t('failedToFetchUsers'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      console.log('🔍 Fetching stats with token:', token ? 'Token exists' : 'No token')
      
      if (!token) {
        console.error('No admin token found')
        return
      }

      console.log('📡 Making request to /api/backend/v1/users/stats')
      const response = await fetch('/api/backend/v1/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📥 Stats response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Stats response error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 Stats response data:', data)
      
      if (data.success) {
        console.log('✅ Stats data:', data.data)
        setStats(data.data || {
          total_users: 0,
          active_users: 0,
          admins: 0,
          managers: 0,
          staff: 0,
          customers: 0
        })
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || (Array.isArray(user.roles) ? user.roles.includes(roleFilter) : user.roles === roleFilter)
    return matchesSearch && matchesRole
  })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / limit))
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, filteredUsers.length)
  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, roleFilter])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'staff':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'customer':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'shipper':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'manager':
        return <Users className="h-4 w-4" />
      case 'staff':
        return <UserPlus className="h-4 w-4" />
      case 'customer':
        return <Users className="h-4 w-4" />
      case 'shipper':
        return <Truck className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'N/A'
    }
  }

  const handleRefresh = () => {
    fetchUsers()
    fetchStats()
  }

  // Handle user actions
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (userId: number) => {
    setDeletingUserId(userId)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!deletingUserId) return
    
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error(t('authenticationFailed'))
        return
      }

      const response = await fetch(`/api/backend/v1/users/delete?id=${deletingUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        toast.success(t('userDeletedSuccessfully'))
        fetchUsers()
        fetchStats()
      } else {
        toast.error(data.message || t('failedToDeleteUser'))
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(t('failedToDeleteUser'))
    } finally {
      setShowDeleteModal(false)
      setDeletingUserId(null)
    }
  }

  const handleToggleLock = async (userId: number, isLocked: boolean) => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error(t('authenticationFailed'))
        return
      }

      const response = await fetch(`/api/backend/v1/users/update?id=${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locked_until: isLocked ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Lock for 24 hours
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        toast.success(isLocked ? t('userUnlockedSuccessfully') : t('userLockedSuccessfully'))
        fetchUsers()
      } else {
        toast.error(data.message || t('operationFailed'))
      }
    } catch (error) {
      console.error('Error toggling user lock:', error)
      toast.error(t('operationFailed'))
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-lg">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('userManagement')}</h1>
            <p className="admin-page-description">{t('manageSystemUsersAndPermissions')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button className="flex items-center gap-2" onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4" />
              {t('addUser')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalUsers')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total_users}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('activeUsers')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.active_users}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-rose-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('admins')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.admins}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('managers')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.managers}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('staff')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.staff}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-700">
                  <UserPlus className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('customers')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.customers}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchUsersByNameEmailOrUsername')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('role')}</label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="min-w-[180px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allRoles')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allRoles')}</SelectItem>
                      <SelectItem value="admin">{translatedUserRole('admin', t)}</SelectItem>
                      <SelectItem value="manager">{translatedUserRole('manager', t)}</SelectItem>
                      <SelectItem value="staff">{translatedUserRole('staff', t)}</SelectItem>
                      <SelectItem value="customer">{translatedUserRole('customer', t)}</SelectItem>
                      <SelectItem value="shipper">{translatedUserRole('shipper', t)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noUsersFound')}</h3>
              <p className="text-slate-500">{t('noUsersMatchSearchCriteria')}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('nameLabel')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('emailLabel')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('role')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('status')}</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.user_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-900">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-slate-500">@{user.account_name}</div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">{user.email}</td>
                        <td className="py-4 px-4">
                          {Array.isArray(user.roles)
                            ? user.roles.map((r, i) => (
                                <Badge key={i} variant="outline" className={`mr-1 ${getRoleColor(r)}`}>
                                  {translatedUserRole(r, t)}
                                </Badge>
                              ))
                            : (
                                <Badge variant="outline" className={getRoleColor(user.roles)}>
                                  {translatedUserRole(String(user.roles), t)}
                                </Badge>
                              )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant="outline"
                            className={user.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}
                          >
                            {user.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditUser(user)} className="bg-white/80 border-slate-200 hover:bg-white" title={t('edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.user_id)} className="text-red-600 border-red-200 hover:bg-red-50" title={t('delete')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedUsers.map((user) => (
              <Card key={user.user_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">@{user.account_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {Array.isArray(user.roles) ? user.roles.map((role, index) => (
                          <Badge 
                            key={index}
                            variant="outline" 
                            className={`flex items-center gap-1 ${getRoleColor(role)}`}
                          >
                            {getRoleIcon(role)}
                            {translatedUserRole(role, t)}
                          </Badge>
                        )) : (
                          <Badge 
                            variant="outline" 
                            className={`flex items-center gap-1 ${getRoleColor(user.roles)}`}
                          >
                            {getRoleIcon(user.roles)}
                            {translatedUserRole(String(user.roles), t)}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={user.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}
                        >
                          {user.is_active ? t('active') : t('inactive')}
                        </Badge>
                    </div>
                  </div>

                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{t('joined')}: {formatDate(user.created_at)}</span>
                      </div>
      </div>

                    {/* Last Login */}
                    {user.last_login_at && (
                      <div className="text-xs text-gray-400">
                        {t('lastLogin')}: {formatDate(user.last_login_at)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white/80 border-slate-200 hover:bg-white"
                        onClick={() => handleEditUser(user)}
                        title={t('edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.user_id)}
                        title={t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredUsers.length > 0 && totalPages > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-6">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  {t('showingXOfY', { from: String(from), to: String(to), total: String(filteredUsers.length) })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="bg-white/80 border-slate-200">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600 px-2">{t('pageOf', { current: String(page), total: String(totalPages) })}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="bg-white/80 border-slate-200">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add User Modal */}
        <Dialog
          open={showAddModal}
          onOpenChange={(open) => {
            setShowAddModal(open)
            if (!open) setAddDialogContentEl(null)
          }}
        >
          <DialogContent
            className="flex w-[min(96vw,72rem)] max-w-6xl max-h-[92vh] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-[0_10px_25px_rgba(0,0,0,0.2)] sm:rounded-lg"
            style={{
              backdropFilter: 'none',
              backgroundColor: 'white',
            }}
            onPointerDownOutside={(e) => {
              if (isInsideAddressDropdown(e.target)) e.preventDefault()
            }}
            onInteractOutside={(e) => {
              if (isInsideAddressDropdown(e.target)) e.preventDefault()
            }}
            onFocusOutside={(e) => {
              const rt = (
                e as unknown as CustomEvent<{ originalEvent?: FocusEvent | null }>
              ).detail?.originalEvent?.relatedTarget
              if (rt != null && isInsideAddressDropdown(rt)) e.preventDefault()
            }}
          >
            <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-4 text-left sm:px-8 sm:py-5">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">{t('addNewUser')}</DialogTitle>
            </DialogHeader>
            <div
              ref={(node) => setAddDialogContentEl(node)}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 sm:px-8 sm:py-5"
            >
              <AddUserForm
                roles={roles}
                dialogContentEl={addDialogContentEl}
                modalOpen={showAddModal}
                onSuccess={() => {
                  setShowAddModal(false)
                  fetchUsers()
                  fetchStats()
                }}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </DialogContent>
        </Dialog>

      {/* Edit User Modal */}
        <Dialog
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open)
            if (!open) setEditDialogContentEl(null)
          }}
        >
          <DialogContent
            className="flex w-[min(96vw,72rem)] max-w-6xl max-h-[92vh] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-[0_10px_25px_rgba(0,0,0,0.2)] sm:rounded-lg"
            style={{
              backdropFilter: 'none',
              backgroundColor: 'white',
            }}
            onPointerDownOutside={(e) => {
              if (isInsideAddressDropdown(e.target)) e.preventDefault()
            }}
            onInteractOutside={(e) => {
              if (isInsideAddressDropdown(e.target)) e.preventDefault()
            }}
            onFocusOutside={(e) => {
              const rt = (
                e as unknown as CustomEvent<{ originalEvent?: FocusEvent | null }>
              ).detail?.originalEvent?.relatedTarget
              if (rt != null && isInsideAddressDropdown(rt)) e.preventDefault()
            }}
          >
            <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-4 text-left sm:px-8 sm:py-5">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">{t('editUser')}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div
                ref={(node) => setEditDialogContentEl(node)}
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 sm:px-8 sm:py-5"
              >
                <EditUserForm
                  user={selectedUser}
                  roles={roles}
                  dialogContentEl={editDialogContentEl}
                  modalOpen={showEditModal}
                  onSuccess={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    fetchUsers()
                    fetchStats()
                  }}
                  onCancel={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeletingUserId(null)
          }}
          onConfirm={confirmDeleteUser}
          title={t('deleteUser')}
          description={t('deleteUserConfirm')}
          confirmText={t('delete')}
          cancelText={t('cancel')}
        />
      </div>
    </div>
  )
}

function emptyAdminAddress(): AdminAddressValue {
  return {
    receiver_name: '',
    phone: '',
    address_line: '',
    ward: '',
    district: '',
    province: '',
    is_default: true,
  }
}

function addressFieldsFilled(a: AdminAddressValue): boolean {
  return [a.receiver_name, a.phone, a.address_line, a.ward, a.district, a.province].every(
    (s) => String(s ?? '').trim() !== ''
  )
}

function addressFieldsPartial(a: AdminAddressValue): boolean {
  const filled = [a.receiver_name, a.phone, a.address_line, a.ward, a.district, a.province].map(
    (s) => String(s ?? '').trim() !== ''
  )
  return filled.some(Boolean) && !filled.every(Boolean)
}

// Add User Form Component
function AddUserForm({
  roles,
  onSuccess,
  onCancel,
  dialogContentEl,
  modalOpen,
}: {
  roles: Array<{ role_id: number; role_name: string }>
  onSuccess: () => void
  onCancel: () => void
  dialogContentEl: HTMLElement | null
  modalOpen: boolean
}) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    account_name: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_ids: [] as number[],
  })
  const [addressForm, setAddressForm] = useState<AdminAddressValue>(() => emptyAdminAddress())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (modalOpen) {
      setAddressForm(emptyAdminAddress())
    }
  }, [modalOpen])

  const patchAddress = (patch: Partial<AdminAddressValue>) => {
    setAddressForm((prev) => ({ ...prev, ...patch }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addressFieldsPartial(addressForm)) {
      toast.error(t('adminUserAddressPartial'))
      return
    }
    setLoading(true)

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error(t('authenticationFailed'))
        return
      }

      const payload: Record<string, unknown> = { ...formData }
      if (addressFieldsFilled(addressForm)) {
        const receiver =
          addressForm.receiver_name.trim() ||
          `${formData.first_name} ${formData.last_name}`.trim()
        const phoneDigits = (
          addressForm.phone.trim() || formData.phone.replace(/\D/g, '')
        ).replace(/\D/g, '')
        payload.address = {
          receiver_name: receiver,
          phone: phoneDigits,
          address_line: addressForm.address_line.trim(),
          ward: addressForm.ward.trim(),
          district: addressForm.district.trim(),
          province: addressForm.province.trim(),
          is_default: addressForm.is_default,
        }
      }

      const response = await fetch('/api/backend/v1/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        const msg =
          data?.message ||
          (data?.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).flat().join(' ')
            : null) ||
          t('failedToCreateUser')
        toast.error(msg)
        return
      }
      if (data.success) {
        toast.success(t('userCreatedSuccessfully'))
        onSuccess()
      } else {
        toast.error(data.message || t('failedToCreateUser'))
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(t('failedToCreateUser'))
    } finally {
      setLoading(false)
    }
  }

  const adminInputClass = 'h-10 mt-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 md:items-start">
        <div>
          <Label htmlFor="add_first_name">{t('firstName')}</Label>
          <Input
            id="add_first_name"
            className={adminInputClass}
            value={formData.first_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="add_last_name">{t('lastName')}</Label>
          <Input
            id="add_last_name"
            className={adminInputClass}
            value={formData.last_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="add_account_name">{t('username')}</Label>
          <Input
            id="add_account_name"
            className={adminInputClass}
            value={formData.account_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, account_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="add_password">{t('password')}</Label>
          <Input
            id="add_password"
            className={adminInputClass}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="add_email">{t('email')}</Label>
          <Input
            id="add_email"
            className={adminInputClass}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="add_phone">{t('phoneNumber')}</Label>
          <Input
            id="add_phone"
            className={adminInputClass}
            value={formData.phone}
            autoComplete="off"
            inputMode="numeric"
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="add_role">{t('role')}</Label>
          <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, role_ids: [parseInt(value, 10)] }))}>
            <SelectTrigger id="add_role" className="h-10 mt-1.5 w-full md:max-w-md">
              <SelectValue placeholder={t('selectRole')} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.role_id} value={role.role_id.toString()}>
                  {translatedUserRole(role.role_name, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AdminVnAddressFields
        value={addressForm}
        onChange={patchAddress}
        enableNameSync={false}
        dialogContentEl={dialogContentEl}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('creating') : t('createUser')}
        </Button>
      </div>
    </form>
  )
}

// Edit User Form Component
function EditUserForm({
  user,
  roles,
  onSuccess,
  onCancel,
  dialogContentEl,
  modalOpen,
}: {
  user: User
  roles: Array<{ role_id: number; role_name: string }>
  onSuccess: () => void
  onCancel: () => void
  dialogContentEl: HTMLElement | null
  modalOpen: boolean
}) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone || '',
    role_ids: Array.isArray(user.roles)
      ? user.roles
          .map((role) => {
            const roleObj = roles.find((r) => r.role_name === role)
            return roleObj ? roleObj.role_id : 0
          })
          .filter((id) => id > 0)
      : [roles.find((r) => r.role_name === user.roles)?.role_id || 0].filter((id) => id > 0),
  })
  const [addressId, setAddressId] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState<AdminAddressValue>(() => ({
    ...emptyAdminAddress(),
    receiver_name: `${user.first_name} ${user.last_name}`.trim(),
    phone: (user.phone ?? '').replace(/\D/g, '').slice(0, 10),
  }))
  const [enableNameSync, setEnableNameSync] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!modalOpen) return
    let cancelled = false
    ;(async () => {
      const token = localStorage.getItem('adminToken')
      if (!token) return
      try {
        const res = await fetch(`/api/backend/v1/users/${user.user_id}/addresses`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const data = await res.json()
        if (cancelled) return
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const primary =
            data.data.find((x: { is_default: number }) => Number(x.is_default) === 1) ?? data.data[0]
          setAddressId(Number(primary.address_id))
          setAddressForm({
            receiver_name: String(primary.receiver_name ?? ''),
            phone: String(primary.phone ?? '').replace(/\D/g, '').slice(0, 10),
            address_line: String(primary.address_line ?? ''),
            ward: String(primary.ward ?? ''),
            district: String(primary.district ?? ''),
            province: String(primary.province ?? ''),
            is_default: Number(primary.is_default) === 1,
          })
          setEnableNameSync(true)
        } else {
          setAddressId(null)
          setAddressForm({
            ...emptyAdminAddress(),
            receiver_name: `${user.first_name} ${user.last_name}`.trim(),
            phone: (user.phone ?? '').replace(/\D/g, '').slice(0, 10),
          })
          setEnableNameSync(false)
        }
      } catch {
        if (!cancelled) {
          setAddressId(null)
          setEnableNameSync(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [modalOpen, user.user_id, user.first_name, user.last_name, user.phone])

  const patchAddress = (patch: Partial<AdminAddressValue>) => {
    setAddressForm((prev) => ({ ...prev, ...patch }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addressFieldsPartial(addressForm)) {
      toast.error(t('adminUserAddressPartial'))
      return
    }
    setLoading(true)

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error(t('authenticationFailed'))
        return
      }

      const userRes = await fetch(`/api/backend/v1/users/update?id=${user.user_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      const userData = await userRes.json()
      if (!userRes.ok || !userData.success) {
        const msg =
          userData?.message ||
          (userData?.errors && typeof userData.errors === 'object'
            ? Object.values(userData.errors).flat().join(' ')
            : null) ||
          t('failedToUpdateUser')
        toast.error(msg)
        return
      }

      if (addressFieldsFilled(addressForm)) {
        const receiver =
          addressForm.receiver_name.trim() ||
          `${formData.first_name} ${formData.last_name}`.trim()
        const phoneDigits = addressForm.phone.replace(/\D/g, '')
        const body = {
          receiver_name: receiver,
          phone: phoneDigits,
          address_line: addressForm.address_line.trim(),
          ward: addressForm.ward.trim(),
          district: addressForm.district.trim(),
          province: addressForm.province.trim(),
          is_default: addressForm.is_default,
        }
        const addrUrl =
          addressId != null
            ? `/api/backend/v1/users/${user.user_id}/addresses/${addressId}`
            : `/api/backend/v1/users/${user.user_id}/addresses`
        const addrRes = await fetch(addrUrl, {
          method: addressId != null ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
        const addrData = await addrRes.json()
        if (!addrRes.ok || !addrData.success) {
          const msg =
            addrData?.message ||
            (addrData?.errors && typeof addrData.errors === 'object'
              ? Object.values(addrData.errors).flat().join(' ')
              : null) ||
            t('failedToUpdateUser')
          toast.error(msg)
          return
        }
      }

      toast.success(t('userUpdatedSuccessfully'))
      onSuccess()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(t('failedToUpdateUser'))
    } finally {
      setLoading(false)
    }
  }

  const adminInputClass = 'h-10 mt-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 md:items-start">
        <div>
          <Label htmlFor="edit_first_name">{t('firstName')}</Label>
          <Input
            id="edit_first_name"
            className={adminInputClass}
            value={formData.first_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit_last_name">{t('lastName')}</Label>
          <Input
            id="edit_last_name"
            className={adminInputClass}
            value={formData.last_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit_email">{t('email')}</Label>
          <Input
            id="edit_email"
            className={adminInputClass}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit_phone">{t('phoneNumber')}</Label>
          <Input
            id="edit_phone"
            className={adminInputClass}
            value={formData.phone}
            autoComplete="off"
            inputMode="numeric"
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="edit_role">{t('role')}</Label>
          <Select
            value={formData.role_ids[0]?.toString() || ''}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, role_ids: [parseInt(value, 10)] }))}
          >
            <SelectTrigger id="edit_role" className="h-10 mt-1.5 w-full md:max-w-md">
              <SelectValue placeholder={t('selectRole')} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.role_id} value={role.role_id.toString()}>
                  {translatedUserRole(role.role_name, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AdminVnAddressFields
        value={addressForm}
        onChange={patchAddress}
        enableNameSync={enableNameSync}
        dialogContentEl={dialogContentEl}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('updating') : t('update')}
        </Button>
      </div>
    </form>
  )
}
