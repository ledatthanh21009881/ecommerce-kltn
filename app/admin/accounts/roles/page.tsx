'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Redirect legacy URL to Vai trò module */
export default function LegacyRoleConfigRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/roles')
  }, [router])

  return null
}
