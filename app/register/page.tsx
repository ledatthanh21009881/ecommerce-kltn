"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { registerUser, type RegisterData } from "@/lib/auth"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    accountName: "",
    acceptTerms: false,
    newsletter: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters!")
      return
    }

    if (!formData.acceptTerms) {
      toast.error("Please accept the terms and conditions!")
      return
    }

    if (!formData.accountName.trim()) {
      toast.error("Account name is required!")
      return
    }

    setIsLoading(true)

    try {
      const registerData: RegisterData = {
        account_name: formData.accountName,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
      }

      const response = await registerUser(registerData)

      if (response.success) {
        toast.success(response.message || "Registration successful!")
        // Redirect to login page after successful registration
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } else {
        toast.error(response.message || "Registration failed!")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed!")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">Create Account</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm">
                    First Name
                  </label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm">
                    Last Name
                  </label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>

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
                <label htmlFor="email" className="text-sm">
                  Email
                </label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm">
                  Phone Number
                </label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, acceptTerms: checked === true }))}
                  required
                />
                <label htmlFor="acceptTerms" className="text-sm">
                  I agree to the{" "}
                  <Link href="/terms" className="underline underline-offset-4">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-4">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  name="newsletter"
                  checked={formData.newsletter}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, newsletter: checked === true }))}
                />
                <label htmlFor="newsletter" className="text-sm">
                  Subscribe to our newsletter for updates and promotions
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
