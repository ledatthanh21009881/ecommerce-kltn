"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { loginUser, authUtils, type LoginData } from "@/lib/auth"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    accountName: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.accountName.trim()) {
      toast.error("Account name is required!")
      return
    }

    if (!formData.password.trim()) {
      toast.error("Password is required!")
      return
    }

    setIsLoading(true)

    try {
      const loginData: LoginData = {
        account_name: formData.accountName,
        password: formData.password,
      }

      const response = await loginUser(loginData)

      if (response.success && response.data) {
        // Save user data
        authUtils.saveUser(response.data.user)
        
        toast.success(`Welcome back, ${response.data.user.first_name}!`)
        
        // Trigger a page reload to update header state or use router events
        setTimeout(() => {
          window.location.href = "/"
        }, 1500)
      } else {
        toast.error(response.message || "Login failed!")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed!")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">
              Sign In
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="accountName" className="text-sm">
                  Account Name
                </label>
                <Input 
                  id="accountName" 
                  name="accountName" 
                  value={formData.accountName} 
                  onChange={handleChange} 
                  placeholder="Enter your account name"
                  required 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs underline underline-offset-4">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="relative overflow-hidden border border-black">
                <button 
                  type="submit" 
                  className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group"
                  disabled={isLoading}
                >
                  <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                    {isLoading ? "Signing In..." : "Sign In"}
                  </span>
                  <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0"></div>
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm">
                Don't have an account?{" "}
                <Link href="/register" className="underline underline-offset-4">
                  Create one
                </Link>
              </p>
              <div className="mt-3">
                <Link href="/" className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-4">
                  ← Back to Home
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
