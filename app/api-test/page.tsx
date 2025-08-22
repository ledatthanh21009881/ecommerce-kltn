"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loginAdmin, loginUser, logoutUser, authUtils, type AdminLoginData, type LoginData } from "@/lib/auth"
import { toast } from "sonner"

export default function ApiTestPage() {
  const [adminLogin, setAdminLogin] = useState({ accountName: "admin", password: "admin123" })
  const [userLogin, setUserLogin] = useState({ accountName: "", password: "" })
  const [isLoading, setIsLoading] = useState({ admin: false, user: false, logout: false })

  const testAdminLogin = async () => {
    setIsLoading(prev => ({ ...prev, admin: true }))
    try {
      const loginData: AdminLoginData = {
        account_name: adminLogin.accountName,
        password: adminLogin.password,
      }

      const response = await loginAdmin(loginData)
      
      if (response.success && response.data) {
        authUtils.saveToken(response.data.token)
        authUtils.saveUser(response.data.user)
        
        toast.success("Admin login successful!", {
          description: `Welcome ${response.data.user.first_name}! Token saved.`,
          duration: 5000,
        })
        
        console.log("Admin Login Response:", response)
      } else {
        toast.error("Admin login failed!", {
          description: response.message || "Unknown error",
          duration: 5000,
        })
      }
    } catch (error) {
      toast.error("Admin Login Error", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      })
      console.error("Admin Login Error:", error)
    } finally {
      setIsLoading(prev => ({ ...prev, admin: false }))
    }
  }

  const testUserLogin = async () => {
    setIsLoading(prev => ({ ...prev, user: true }))
    try {
      const loginData: LoginData = {
        account_name: userLogin.accountName,
        password: userLogin.password,
      }

      const response = await loginUser(loginData)
      
      if (response.success && response.data) {
        authUtils.saveToken(response.data.token)
        authUtils.saveUser(response.data.user)
        
        toast.success("User login successful!", {
          description: `Welcome ${response.data.user.first_name}! Token saved.`,
          duration: 5000,
        })
        
        console.log("User Login Response:", response)
      } else {
        toast.error("User login failed!", {
          description: response.message || "Unknown error",
          duration: 5000,
        })
      }
    } catch (error) {
      toast.error("User Login Error", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      })
      console.error("User Login Error:", error)
    } finally {
      setIsLoading(prev => ({ ...prev, user: false }))
    }
  }

  const testLogout = async () => {
    setIsLoading(prev => ({ ...prev, logout: true }))
    try {
      const response = await logoutUser()
      
      authUtils.logout()
      
      toast.success("Logout successful!", {
        description: "Token and user data cleared",
        duration: 5000,
      })
      
      console.log("Logout Response:", response)
    } catch (error) {
      // Still clear local data even if API fails
      authUtils.logout()
      
      toast.warning("Logout API failed but cleared locally", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      })
      console.error("Logout Error:", error)
    } finally {
      setIsLoading(prev => ({ ...prev, logout: false }))
    }
  }

  const checkCurrentAuth = () => {
    const token = authUtils.getToken()
    const user = authUtils.getUser()
    const isLoggedIn = authUtils.isLoggedIn()
    const isAdmin = authUtils.isAdmin()

    toast.info("Current Auth Status", {
      description: `Logged In: ${isLoggedIn}, Admin: ${isAdmin}, User: ${user?.first_name || 'None'}`,
      duration: 8000,
    })

    console.log("Current Auth Status:", {
      token: token ? `${token.substring(0, 20)}...` : null,
      user,
      isLoggedIn,
      isAdmin
    })
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">API Testing Page</h1>
          <p className="text-gray-600">Test authentication APIs and functionality</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Login Test */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Login Test</CardTitle>
              <CardDescription>Test admin authentication API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Account Name</label>
                <Input 
                  value={adminLogin.accountName}
                  onChange={(e) => setAdminLogin(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input 
                  type="password"
                  value={adminLogin.password}
                  onChange={(e) => setAdminLogin(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="admin123"
                />
              </div>
              <Button 
                onClick={testAdminLogin}
                disabled={isLoading.admin}
                className="w-full"
              >
                {isLoading.admin ? "Testing..." : "Test Admin Login"}
              </Button>
            </CardContent>
          </Card>

          {/* User Login Test */}
          <Card>
            <CardHeader>
              <CardTitle>User Login Test</CardTitle>
              <CardDescription>Test regular user authentication API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Account Name</label>
                <Input 
                  value={userLogin.accountName}
                  onChange={(e) => setUserLogin(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Enter user account"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input 
                  type="password"
                  value={userLogin.password}
                  onChange={(e) => setUserLogin(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              <Button 
                onClick={testUserLogin}
                disabled={isLoading.user}
                className="w-full"
                variant="outline"
              >
                {isLoading.user ? "Testing..." : "Test User Login"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logout and Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Logout Test</CardTitle>
              <CardDescription>Test logout API and clear auth data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testLogout}
                disabled={isLoading.logout}
                className="w-full"
                variant="destructive"
              >
                {isLoading.logout ? "Logging out..." : "Test Logout"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Check Auth Status</CardTitle>
              <CardDescription>Check current authentication status</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={checkCurrentAuth}
                className="w-full"
                variant="secondary"
              >
                Check Current Status
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* API Endpoints Info */}
        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>Available authentication endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Admin Login:</strong> POST http://localhost:8000/api/v1/auth/admin/login</div>
              <div><strong>User Login:</strong> POST http://localhost:8000/api/v1/auth/login</div>
              <div><strong>Logout:</strong> POST http://localhost:8000/api/v1/auth/logout</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
