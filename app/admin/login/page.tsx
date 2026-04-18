// "use client"

// import { useState } from "react"
// import Link from "next/link"
// import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { motion } from "framer-motion"
// import { loginAdmin, type AdminLoginData } from "@/lib/auth"
// import { setAuthData } from "@/lib/admin-auth"
// import { toast } from "sonner"

// export default function AdminLoginPage() {
//   const router = useRouter()
//   const [isLoading, setIsLoading] = useState(false)
//   const [formData, setFormData] = useState({
//     accountName: "",
//     password: "",
//   })

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target
//     setFormData((prev) => ({ ...prev, [name]: value }))
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
    
//     // Validation
//     if (!formData.accountName.trim()) {
//       toast.error("Account name is required!")
//       return
//     }

//     if (!formData.password.trim()) {
//       toast.error("Password is required!")
//       return
//     }

//     setIsLoading(true)

//     try {
//       const loginData: AdminLoginData = {
//         account_name: formData.accountName,
//         password: formData.password,
//       }

//       const response = await loginAdmin(loginData)

//       if (response.success && response.data) {
//         // Save admin token and user data using the admin-auth system
//         setAuthData(response.data.token, response.data.account)
        
//         toast.success(`Welcome back, Admin!`)
        
//         // Redirect to admin dashboard
//         setTimeout(() => {
//           router.push("/admin/users")
//         }, 1500)
//       } else {
//         toast.error(response.message || "Admin login failed!")
//       }
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Admin login failed!")
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <main className="pt-24">
//       <div className="container mx-auto px-4 py-12">
//         <div className="mx-auto max-w-md">
//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
//             <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">
//               Admin Login
//             </h1>

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div className="space-y-2">
//                 <label htmlFor="accountName" className="text-sm">
//                   Account Name
//                 </label>
//                 <Input 
//                   id="accountName" 
//                   name="accountName" 
//                   value={formData.accountName} 
//                   onChange={handleChange} 
//                   placeholder="Enter admin account name"
//                   required 
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label htmlFor="password" className="text-sm">
//                   Password
//                 </label>
//                 <Input 
//                   id="password" 
//                   name="password" 
//                   type="password" 
//                   value={formData.password} 
//                   onChange={handleChange} 
//                   placeholder="Enter admin password"
//                   required 
//                 />
//               </div>

//               <div className="relative overflow-hidden border border-black">
//                 <button
//                   type="submit" 
//                   className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group"
//                   disabled={isLoading}
//                 >
//                   <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
//                     {isLoading ? "Signing In..." : "Admin Sign In"}
//                   </span>
//                   <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0"></div>
//                 </button>
//               </div>
//             </form>

//             <div className="mt-6 text-center">
//               <div className="mt-3">
//                 <Link href="/" className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-4">
//                   ← Back to Home
//                 </Link>
//               </div>
//             </div>
//           </motion.div>
//         </div>
//       </div>
//     </main>
//   )
// }
