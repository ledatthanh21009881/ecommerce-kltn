"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { registerUser, type RegisterData } from "@/lib/auth"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
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
  const PHONE_REGEX = /^0[0-9]{9}$/

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10)
      const withLeadingZero = digits.length > 0 && digits[0] !== "0" ? "0" + digits.slice(0, 9) : digits
      setFormData((prev) => ({
        ...prev,
        phone: withLeadingZero,
      }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error(t("register.passwordMismatch"))
      return
    }

    if (!formData.acceptTerms) {
      toast.error(t("register.mustAcceptTerms"))
      return
    }

    if (!formData.accountName.trim()) {
      toast.error(t("register.accountNameRequired"))
      return
    }
    if (!PHONE_REGEX.test(formData.phone.trim().replace(/\D/g, ""))) {
      toast.error(t("account.err.phoneProfile"))
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
        toast.success(t("register.success"))
        // Redirect to login page after successful registration
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } else {
        toast.error(response.message || t("register.failed"))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("register.failed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
            <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">{t("register.title")}</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm">
                    {t("register.firstName")}
                  </label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm">
                    {t("register.lastName")}
                  </label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="accountName" className="text-sm">
                  {t("register.accountName")}
                </label>
                <Input 
                  id="accountName" 
                  name="accountName" 
                  value={formData.accountName} 
                  onChange={handleChange} 
                  placeholder={t("register.accountNamePlaceholder")}
                  required 
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm">
                  {t("register.email")}
                </label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm">
                  {t("register.phone")}
                </label>
                <Input id="phone" name="phone" type="tel" inputMode="numeric" maxLength={10} value={formData.phone} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm">
                  {t("register.password")}
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
                  {t("register.confirmPassword")}
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
                  {t("register.acceptPrefix")}{" "}
                  <Link href="/terms" className="underline underline-offset-4">
                    {t("register.terms")}
                  </Link>{" "}
                  {t("register.and")}{" "}
                  <Link href="/privacy" className="underline underline-offset-4">
                    {t("register.privacy")}
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
                  {t("register.newsletter")}
                </label>
              </div>

              <div className="relative overflow-hidden border border-black">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative h-10 w-full bg-black text-sm font-normal uppercase tracking-wider text-white transition-all duration-300 ease-in-out hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                    {isLoading ? t("register.creating") : t("register.submit")}
                  </span>
                  <div className="absolute inset-0 translate-x-full transform bg-white transition-transform duration-300 ease-in-out group-hover:translate-x-0 group-disabled:hidden" />
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm">
                {t("register.alreadyHaveAccount")}{" "}
                <Link href="/login" className="underline underline-offset-4">
                  {t("register.signIn")}
                </Link>
              </p>
              <div className="mt-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm underline underline-offset-4 text-black/80 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </div>
        </div>
      </div>
    </main>
  )
}
