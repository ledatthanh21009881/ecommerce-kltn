import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Login - VIVIENNE",
  description: "Admin portal login",
}

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
