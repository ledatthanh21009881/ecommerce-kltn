// API configuration - Use Next.js API routes instead of direct backend calls
export const apiUrl = (endpoint: string) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `/${cleanEndpoint}`;
};

// Common fetch wrapper with authentication
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('adminToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(apiUrl(endpoint), config);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

// Specific API functions
export const ordersApi = {
  getAll: (params?: URLSearchParams) => 
    apiFetch(`api/backend/v1/orders${params ? `?${params}` : ''}`),
  
  getById: (id: string) => 
    apiFetch(`api/orders/${id}`),
  
  getStatistics: () => 
    apiFetch('api/orders/statistics'),
  
  updateStatus: (id: string, status: string, reason?: string) => 
    apiFetch(`api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    }),
  
  delete: (id: string) => 
    apiFetch(`api/orders/${id}`, {
      method: 'DELETE',
    }),
  
  sendInvoice: (id: string, data?: any) => 
    apiFetch(`api/orders/${id}/send-invoice`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  
  export: (params?: URLSearchParams) => 
    apiFetch(`api/backend/v1/orders/export${params ? `?${params}` : ''}`),
};

export const authApi = {
  adminLogin: (credentials: { email: string; password: string }) => 
    apiFetch('api/backend/v1/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  validateResetToken: (token: string) => 
    apiFetch('api/backend/v1/auth/validate-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  
  resetPassword: (token: string, password: string) => 
    apiFetch('api/backend/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

export const productsApi = {
  getAll: (params?: URLSearchParams) => 
    apiFetch(`api/backend/v1/products${params ? `?${params}` : ''}`),
  
  getById: (id: string) => 
    apiFetch(`api/backend/v1/products/${id}`),
  
  create: (data: any) => 
    apiFetch('api/backend/v1/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) => 
    apiFetch(`api/backend/v1/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) => 
    apiFetch(`api/backend/v1/products/${id}`, {
      method: 'DELETE',
    }),
  
  uploadImages: (productId: string, formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    return fetch(apiUrl(`api/backend/v1/products/${productId}/images`), {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
  },
};

export const categoriesApi = {
  getAll: () => 
    apiFetch('api/backend/v1/categories'),
  
  delete: (id: string) => 
    apiFetch(`api/backend/v1/categories/${id}`, {
      method: 'DELETE',
    }),
};

export const inventoryApi = {
  getAll: (params?: URLSearchParams) => 
    apiFetch(`api/backend/v1/inventory${params ? `?${params}` : ''}`),
  
  delete: (id: string) => 
    apiFetch(`api/backend/v1/inventory/${id}`, {
      method: 'DELETE',
    }),
};

export const analyticsApi = {
  getDashboard: (range?: string) => 
    apiFetch(`api/backend/v1/analytics${range ? `?range=${range}` : ''}`),
};

export const shippersApi = {
  getAvailable: () => 
    apiFetch('api/test/available-shippers'),
  
  assign: (orderId: string, shipperId: string) => 
    apiFetch(`api/orders/${orderId}/assign-shipper`, {
      method: 'POST',
      body: JSON.stringify({ shipper_id: shipperId }),
    }),
};
