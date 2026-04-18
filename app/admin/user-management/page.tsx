"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Shield, 
  User, 
  Users, 
  UserCheck, 
  UserX,
  Edit,
  Trash2,
  Lock,
  Unlock,
  MoreHorizontal,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { apiClient } from "@/lib/api-client"
import { useLanguage } from "@/contexts/LanguageContext"
import { AdminPageHeading } from "@/components/admin/AdminPageHeading"

interface User {
  user_id: number
  first_name: string
  last_name: string
  email: string
  account_name: string
  roles: string
  is_active: boolean
  last_login_at: string | null
  locked_until: string | null
  two_fa_enabled: boolean
}

interface Role {
  role_id: number
  role_name: string
}

interface UserStats {
  total_users: number
  active_users: number
  admins: number
  managers: number
  staff: number
  customers: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export default function UserManagementPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    admins: 0,
    managers: 0,
    staff: 0,
    customers: 0
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  
  // Modal states
  const [addUserModal, setAddUserModal] = useState(false)
  const [editUserModal, setEditUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [manageRolesModal, setManageRolesModal] = useState(false)
  
  // Form states
  const [userForm, setUserForm] = useState({
    account_name: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_ids: [] as number[],
    is_active: true
  })

  // Load data
  useEffect(() => {
    loadUsers()
    loadRoles()
    loadStats()
  }, [pagination.page, searchTerm, selectedRole, selectedStatus])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (searchTerm) params.append("search", searchTerm)
      if (selectedRole) params.append("role", selectedRole)
      if (selectedStatus !== "") params.append("is_active", selectedStatus)

      const response = await apiClient.get(`/api/v1/users?${params}`)
      
      if (response.success) {
        setUsers(response.data.users)
        setPagination(response.data.pagination)
      } else {
        toast.error("Failed to fetch users")
      }
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const response = await apiClient.get("/api/v1/roles/all")
      if (response.success) {
        setRoles(response.data)
      }
    } catch (error) {
      console.error("Error loading roles:", error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await apiClient.get("/api/v1/users/stats")
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const handleAddUser = async () => {
    try {
      const response = await apiClient.post("/api/v1/users", userForm)
      
      if (response.success) {
        toast.success("User created successfully")
        setAddUserModal(false)
        resetUserForm()
        loadUsers()
        loadStats()
      } else {
        toast.error(response.message || "Failed to create user")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Failed to create user")
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return
    
    try {
      const response = await apiClient.put(`/api/v1/users/${selectedUser.user_id}`, userForm)
      
      if (response.success) {
        toast.success("User updated successfully")
        setEditUserModal(false)
        resetUserForm()
        loadUsers()
      } else {
        toast.error(response.message || "Failed to update user")
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Failed to update user")
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    
    try {
      const response = await apiClient.delete(`/api/v1/users/${userId}`)
      
      if (response.success) {
        toast.success("User deleted successfully")
        loadUsers()
        loadStats()
      } else {
        toast.error(response.message || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user")
    }
  }

  const handleToggleLock = async (userId: number, isLocked: boolean) => {
    try {
      const response = await apiClient.put(`/api/v1/users/${userId}/lock`, {
        locked_until: isLocked ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Lock for 24 hours
      })
      
      if (response.success) {
        toast.success(isLocked ? "User unlocked successfully" : "User locked successfully")
        loadUsers()
      } else {
        toast.error(response.message || "Failed to toggle user lock")
      }
    } catch (error) {
      console.error("Error toggling user lock:", error)
      toast.error("Failed to toggle user lock")
    }
  }

  const handleToggle2FA = async (userId: number, enabled: boolean) => {
    try {
      const response = await apiClient.put(`/api/v1/users/${userId}/2fa`, {
        enabled: !enabled
      })
      
      if (response.success) {
        toast.success(enabled ? "2FA disabled successfully" : "2FA enabled successfully")
        loadUsers()
      } else {
        toast.error(response.message || "Failed to toggle 2FA")
      }
    } catch (error) {
      console.error("Error toggling 2FA:", error)
      toast.error("Failed to toggle 2FA")
    }
  }

  const resetUserForm = () => {
    setUserForm({
      account_name: "",
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role_ids: [],
      is_active: true
    })
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setUserForm({
      account_name: user.account_name,
      password: "",
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: "",
      role_ids: user.roles ? user.roles.split(',').map(role => {
        const foundRole = roles.find(r => r.role_name === role.trim())
        return foundRole?.role_id || 0
      }).filter(id => id > 0) : [],
      is_active: user.is_active
    })
    setEditUserModal(true)
  }

  const getStatusBadge = (user: User) => {
    if (user.locked_until) {
      return <Badge variant="destructive">Locked</Badge>
    }
    if (!user.is_active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getRoleBadges = (roles: string) => {
    if (!roles) return <Badge variant="outline">No Role</Badge>
    
    return roles.split(',').map((role, index) => (
      <Badge key={index} variant="outline" className="mr-1">
        {role.trim()}
      </Badge>
    ))
  }

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeading
        title={t("userManagement")}
        description={t("manageSystemUsersAndPermissions")}
        actions={
          <Button onClick={() => setAddUserModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addUser")}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.staff}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.role_id} value={role.role_name}>
                    {role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={loadUsers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Showing {users.length} of {pagination.total} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{user.account_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadges(user.roles)}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      {user.last_login_at 
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : "Never"
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditModal(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleToggleLock(user.user_id, !!user.locked_until)}
                          >
                            {user.locked_until ? (
                              <>
                                <Unlock className="w-4 h-4 mr-2" />
                                Unlock
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Lock
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggle2FA(user.user_id, user.two_fa_enabled)}
                          >
                            {user.two_fa_enabled ? "Disable 2FA" : "Enable 2FA"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user.user_id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              disabled={pagination.page === pagination.total_pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={addUserModal} onOpenChange={setAddUserModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with roles and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="account_name">Username</Label>
              <Input
                id="account_name"
                value={userForm.account_name}
                onChange={(e) => setUserForm(prev => ({ ...prev, account_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Roles</Label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div key={role.role_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.role_id}`}
                      checked={userForm.role_ids.includes(role.role_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setUserForm(prev => ({
                            ...prev,
                            role_ids: [...prev.role_ids, role.role_id]
                          }))
                        } else {
                          setUserForm(prev => ({
                            ...prev,
                            role_ids: prev.role_ids.filter(id => id !== role.role_id)
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`role-${role.role_id}`}>{role.role_name}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={userForm.is_active}
                onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, is_active: !!checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editUserModal} onOpenChange={setEditUserModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Roles</Label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div key={role.role_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-role-${role.role_id}`}
                      checked={userForm.role_ids.includes(role.role_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setUserForm(prev => ({
                            ...prev,
                            role_ids: [...prev.role_ids, role.role_id]
                          }))
                        } else {
                          setUserForm(prev => ({
                            ...prev,
                            role_ids: prev.role_ids.filter(id => id !== role.role_id)
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`edit-role-${role.role_id}`}>{role.role_name}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_active"
                checked={userForm.is_active}
                onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, is_active: !!checked }))}
              />
              <Label htmlFor="edit_is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
