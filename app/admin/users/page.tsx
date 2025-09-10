'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Users, UserPlus, Mail, Phone, Calendar, Shield, X, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { getAuthData, isAuthenticated } from '@/lib/admin-auth'
import ConfirmModal from '@/components/ui/confirm-modal'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const [roleFilter, setRoleFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [roles, setRoles] = useState<Array<{role_id: number, role_name: string}>>([])

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
        console.log('✅ Users data:', data.data?.items || [])
        setUsers(data.data?.items || [])
      } else {
        console.error('❌ Failed to fetch users:', data.message)
        toast.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      toast.error('Error fetching users')
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
    const matchesRole = !roleFilter || (Array.isArray(user.roles) ? user.roles.includes(roleFilter) : user.roles === roleFilter)
    return matchesSearch && matchesRole
  })

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
        toast.error('No admin token found')
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
        toast.success('User đã được xóa thành công')
        fetchUsers()
        fetchStats()
      } else {
        toast.error(data.message || 'Xóa user thất bại')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Xóa user thất bại')
    } finally {
      setShowDeleteModal(false)
      setDeletingUserId(null)
    }
  }

  const handleToggleLock = async (userId: number, isLocked: boolean) => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error('No admin token found')
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
        toast.success(isLocked ? 'User đã được mở khóa' : 'User đã được khóa')
        fetchUsers()
      } else {
        toast.error(data.message || 'Thao tác thất bại')
      }
    } catch (error) {
      console.error('Error toggling user lock:', error)
      toast.error('Thao tác thất bại')
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('userManagement')}</h1>
          <p className="text-slate-600">{t('manageSystemUsersAndPermissions')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('totalUsers')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('activeUsers')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.active_users}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
      <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('admins')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.admins}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('managers')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.managers}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('staff')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.staff}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('customers')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.customers}</p>
              </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            </CardContent>
          </Card>
      </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
                    placeholder={t('searchUsersByNameEmailOrUsername')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('allRoles')}</option>
                  <option value="admin">{t('admin')}</option>
                  <option value="manager">{t('manager')}</option>
                  <option value="staff">{t('staff')}</option>
                  <option value="customer">{t('customer')}</option>
                </select>
      </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowAddModal(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  {t('addUser')}
                </Button>
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
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">No users match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.user_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
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
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Badge>
                        )) : (
                          <Badge 
                            variant="outline" 
                            className={`flex items-center gap-1 ${getRoleColor(user.roles)}`}
                          >
                            {getRoleIcon(user.roles)}
                            {t(user.roles as any) || user.roles.charAt(0).toUpperCase() + user.roles.slice(1)}
                          </Badge>
                        )}
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
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
                        className="flex-1"
                        onClick={() => handleEditUser(user)}
                      >
                        {t('edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteUser(user.user_id)}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add User Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent 
            className="sm:max-w-[425px] bg-white" 
            style={{ 
              backdropFilter: 'none',
              backgroundColor: 'white',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('addNewUser')}</DialogTitle>
            </DialogHeader>
            <AddUserForm 
              roles={roles}
              onSuccess={() => {
                setShowAddModal(false)
                fetchUsers()
                fetchStats()
              }}
              onCancel={() => setShowAddModal(false)}
            />
          </DialogContent>
        </Dialog>

      {/* Edit User Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent 
            className="sm:max-w-[425px] bg-white" 
            style={{ 
              backdropFilter: 'none',
              backgroundColor: 'white',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
          >
          <DialogHeader>
              <DialogTitle>{t('editUser')}</DialogTitle>
          </DialogHeader>
            {selectedUser && (
              <EditUserForm 
                user={selectedUser}
                roles={roles}
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
          title="Xóa User"
          description="Bạn có chắc chắn muốn xóa user này? Hành động này không thể hoàn tác."
          confirmText="Xóa"
          cancelText="Cancel"
        />
      </div>
    </div>
  )
}

// Add User Form Component
function AddUserForm({ roles, onSuccess, onCancel }: { 
  roles: Array<{role_id: number, role_name: string}>, 
  onSuccess: () => void, 
  onCancel: () => void 
}) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    account_name: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_ids: [] as number[]
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error('No admin token found')
        return
      }

      const response = await fetch('/api/backend/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">{t('firstName')}</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            required
          />
              </div>
        <div>
          <Label htmlFor="last_name">{t('lastName')}</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            required
          />
              </div>
            </div>

      <div>
        <Label htmlFor="account_name">{t('username')}</Label>
        <Input
          id="account_name"
          value={formData.account_name}
          onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">{t('phoneNumber')}</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="role">{t('role')}</Label>
        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, role_ids: [parseInt(value)] }))}>
                  <SelectTrigger>
            <SelectValue placeholder={t('selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.role_id} value={role.role_id.toString()}>
                {role.role_name}
              </SelectItem>
            ))}
                  </SelectContent>
                </Select>
              </div>

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
function EditUserForm({ user, roles, onSuccess, onCancel }: { 
  user: User, 
  roles: Array<{role_id: number, role_name: string}>, 
  onSuccess: () => void, 
  onCancel: () => void 
}) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone || '',
    role_ids: Array.isArray(user.roles) ? user.roles.map(role => {
      const roleObj = roles.find(r => r.role_name === role)
      return roleObj ? roleObj.role_id : 0
    }).filter(id => id > 0) : [roles.find(r => r.role_name === user.roles)?.role_id || 0].filter(id => id > 0)
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        toast.error('No admin token found')
        return
      }

      const response = await fetch(`/api/backend/v1/users/update?id=${user.user_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        toast.success(t('userUpdatedSuccessfully'))
        onSuccess()
      } else {
        toast.error(data.message || t('failedToUpdateUser'))
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(t('failedToUpdateUser'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">{t('firstName')}</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">{t('lastName')}</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">{t('phoneNumber')}</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="role">{t('role')}</Label>
        <Select 
          value={formData.role_ids[0]?.toString() || ''} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, role_ids: [parseInt(value)] }))}
        >
                  <SelectTrigger>
            <SelectValue placeholder={t('selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.role_id} value={role.role_id.toString()}>
                {role.role_name}
              </SelectItem>
            ))}
                  </SelectContent>
                </Select>
              </div>

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
