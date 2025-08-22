export interface AdminUser {
  account_id: number
  account_name: string
  account_type: string
  role: string
}

export function getAuthData(): { token: string | null; user: AdminUser | null } {
  try {
    const token = localStorage.getItem('adminToken')
    const userData = localStorage.getItem('adminUser')
    
    if (!token || !userData || userData === 'null' || userData === 'undefined') {
      return { token: null, user: null }
    }
    
    const user = JSON.parse(userData)
    return { token, user }
  } catch (error) {
    console.error('Error parsing auth data:', error)
    // Clear invalid data
    localStorage.removeItem('adminUser')
    localStorage.removeItem('adminToken')
    return { token: null, user: null }
  }
}

export function setAuthData(token: string, user: AdminUser): void {
  localStorage.setItem('adminToken', token)
  localStorage.setItem('adminUser', JSON.stringify(user))
}

export function clearAuthData(): void {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminUser')
}

export function isAuthenticated(): boolean {
  const { token, user } = getAuthData()
  return !!(token && user)
}
