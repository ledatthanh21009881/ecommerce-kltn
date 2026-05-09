"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { loginUser, authUtils, type LoginData } from "@/lib/auth"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"

function isInvalidCredentialsErrorMessage(message?: string): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes("invalid credentials") ||
    m.includes("invalid account") ||
    m.includes("invalid password") ||
    m.includes("invalid phone number or password") ||
    m.includes("sai tài khoản") ||
    m.includes("sai mật khẩu")
  )
}

export default function LoginPage() {
  const { t } = useLanguage()
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
      toast.error(t("auth.accountNameRequired"))
      return
    }

    if (!formData.password.trim()) {
      toast.error(t("auth.passwordRequired"))
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
        
        toast.success(t("auth.welcomeBack").replace("{name}", response.data.user.first_name))
        
        // Trigger a page reload to update header state or use router events
        setTimeout(() => {
          window.location.href = "/"
        }, 1500)
      } else {
        toast.error(
          isInvalidCredentialsErrorMessage(response.message)
            ? t("auth.invalidCredentials")
            : response.message || t("auth.loginFailed"),
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.loginFailed")
      toast.error(isInvalidCredentialsErrorMessage(message) ? t("auth.invalidCredentials") : message)
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
              {t("auth.signIn")}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="accountName" className="text-sm">
                  {t("auth.accountName")}
                </label>
                <Input 
                  id="accountName" 
                  name="accountName" 
                  value={formData.accountName} 
                  onChange={handleChange} 
                  placeholder={t("auth.accountNamePlaceholder")}
                  required 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm">
                    {t("auth.password")}
                  </label>
                  <Link href="/forgot-password" className="text-xs underline underline-offset-4">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                />
              </div>

              <div className="relative overflow-hidden border border-black">
                <button 
                  type="submit" 
                  className="group relative h-10 w-full overflow-hidden bg-black text-sm font-normal uppercase tracking-wider text-white transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/30 hover:bg-white hover:text-black active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  disabled={isLoading}
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-2 font-sans font-bold uppercase tracking-wider">
                    {isLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent group-hover:border-black group-hover:border-t-transparent" />}
                    {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                  </span>
                  <div className="absolute inset-0 translate-x-full transform bg-white transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden"></div>
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm">
                {t("auth.dontHaveAccount")}{" "}
                <Link href="/register" className="underline underline-offset-4">
                  {t("auth.createOne")}
                </Link>
              </p>
              <div className="mt-3">
                <Link href="/" className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-4">
                  {t("auth.backToHome")}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
