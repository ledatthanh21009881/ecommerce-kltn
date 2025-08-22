import { fetchWithAuth } from './auth'

const API_BASE_URL = '/api/backend/v1'

export interface Category {
  category_id: number
  category_name: string
  slug: string
  parent_id: number | null
  position: number
  is_active: number
  created_at: string
  updated_at: string
  children?: Category[]
}

export interface CreateCategoryData {
  category_name: string
  parent_id?: number | null
  position?: number
}

export interface UpdateCategoryData {
  category_name?: string
  parent_id?: number | null
  position?: number
}

export interface ReorderCategoryData {
  categories: {
    category_id: number
    position: number
  }[]
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  status_code: number
  data?: T
  errors?: Record<string, string>
}

// Get all categories
export const getCategories = async (type?: 'hierarchy'): Promise<Category[]> => {
  try {
    let url = `${API_BASE_URL}/categories`
    if (type) {
      url += `?type=${type}`
    }
    
    console.log('Fetching categories from:', url) // Debug
    const response = await fetch(url)
    const result: ApiResponse<Category[]> = await response.json()
    
    console.log('Categories API response:', result) // Debug

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch categories')
    }

    console.log('Categories data:', result.data) // Debug
    return result.data || []
  } catch (error) {
    console.error('Get categories error:', error)
    throw error
  }
}

// Get category by ID
export const getCategoryById = async (id: number): Promise<Category> => {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`)
    const result: ApiResponse<Category> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch category')
    }

    return result.data!
  } catch (error) {
    console.error('Get category error:', error)
    throw error
  }
}

// Create category
export const createCategory = async (data: CreateCategoryData): Promise<Category> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    })

    const result: ApiResponse<Category> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create category')
    }

    return result.data!
  } catch (error) {
    console.error('Create category error:', error)
    throw error
  }
}

// Update category
export const updateCategory = async (id: number, data: UpdateCategoryData): Promise<Category> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    const result: ApiResponse<Category> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update category')
    }

    return result.data!
  } catch (error) {
    console.error('Update category error:', error)
    throw error
  }
}

// Toggle category status
export const toggleCategoryStatus = async (id: number): Promise<Category> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/categories/${id}/toggle-status`, {
      method: 'PATCH',
    })

    const result: ApiResponse<Category> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to toggle category status')
    }

    return result.data!
  } catch (error) {
    console.error('Toggle category status error:', error)
    throw error
  }
}

// Delete category
export const deleteCategory = async (id: number): Promise<void> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
    })

    const result: ApiResponse<null> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete category')
    }
  } catch (error) {
    console.error('Delete category error:', error)
    throw error
  }
}

// Reorder categories
export const reorderCategories = async (data: ReorderCategoryData): Promise<void> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/categories/reorder`, {
      method: 'POST',
      body: JSON.stringify(data),
    })

    const result: ApiResponse<null> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to reorder categories')
    }
  } catch (error) {
    console.error('Reorder categories error:', error)
    throw error
  }
}
