"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loginAdmin, authUtils } from "@/lib/auth"

export default function DebugAdminPage() {
  const [formData, setFormData] = useState({
    accountName: "admin",
    password: "admin123",
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const response = await loginAdmin({
        account_name: formData.accountName,
        password: formData.password,
      })
      
      console.log('Login response:', response)
      setResult(response)
      
      if (response.success && response.data) {
        authUtils.saveToken(response.data.token)
        authUtils.saveUser(response.data.user)
        
        // Check saved data
        const savedUser = authUtils.getUser()
        const isAdmin = authUtils.isAdmin()
        
        console.log('Saved user:', savedUser)
        console.log('Is admin check:', isAdmin)
      }
    } catch (error) {
      console.error('Login error:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const checkAuth = () => {
    const token = authUtils.getToken()
    const user = authUtils.getUser()
    const isLoggedIn = authUtils.isLoggedIn()
    const isAdmin = authUtils.isAdmin()
    
    console.log('Current auth state:')
    console.log('Token:', token)
    console.log('User:', user)
    console.log('Is logged in:', isLoggedIn)
    console.log('Is admin:', isAdmin)
    
    setResult({
      token: token ? 'Present' : 'None',
      user,
      isLoggedIn,
      isAdmin
    })
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Debug Admin Login</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Login Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Account Name</label>
              <Input
                value={formData.accountName}
                onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? 'Logging in...' : 'Login as Admin'}
            </Button>
            <Button onClick={checkAuth} variant="outline" className="w-full">
              Check Current Auth State
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result && (
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
