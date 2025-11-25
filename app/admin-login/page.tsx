'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Lock, User } from 'lucide-react'
import { getAuthData, setAuthData, checkAndRefreshAuth } from '@/lib/admin-auth'

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    account_name: '',
    password: ''
  })

  // Check if user is already logged in with valid token
  useEffect(() => {
    const checkAuth = async () => {
      console.log('AdminLoginPage useEffect - checking authentication...')
      
      // Check and refresh auth if needed
      const isValid = await checkAndRefreshAuth()
      
      if (isValid) {
        const { user } = getAuthData()
        console.log('User already logged in with valid token, redirecting to admin...', user)
        router.replace('/admin/dashboard')
      }
    }
    
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.account_name || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      console.log('Sending login request with data:', formData)
      const response = await fetch('/api/backend/v1/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      console.log('Login response status:', response.status)
      console.log('Login response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Login failed with status:', response.status, 'Error:', errorText)
        toast.error('Login failed. Please try again.')
        return
      }
      
      const result = await response.json()
      console.log('Login response data:', result)

      if (result.success) {
        console.log('Login successful, setting auth data:', result.data)
        // API returns 'account' instead of 'user'
        setAuthData(result.data.token, result.data.account)
        toast.success('Login successful!')
        
        // Immediate redirect without setTimeout
        console.log('Redirecting to admin dashboard...')
        console.log('Current URL before redirect:', window.location.href)
        
        // Try router.replace first
        try {
          router.replace('/admin/dashboard')
          console.log('Router replace executed')
        } catch (error) {
          console.log('Router replace failed, using window.location')
          window.location.href = '/admin/dashboard'
        }
      } else {
        toast.error(result.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <p className="text-gray-600">Sign in to your admin account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.account_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Default credentials: admin / admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
