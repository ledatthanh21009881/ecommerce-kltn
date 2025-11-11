/**
 * TypeScript types for Order Tracking System
 * Áp dụng error prevention patterns từ Loi_thuong_gap.md
 */

// ==============================================
// Order Tracking Types
// ==============================================

export interface OrderTracking {
  order_id: number
  status: OrderStatus
  total_amount: number
  created_at: string
  estimated_delivery_at?: string
  customer_name: string
  customer_phone: string
  customer_address: string
  shipper_id?: number
  shipper_name?: string
  shipper_phone?: string
  vehicle_info?: string
  rating?: number
  current_lat?: number
  current_lng?: number
  location_updated_at?: string
  event_count: number
  last_status?: string
  last_event_at?: string
}

export interface OrderDetail {
  order: {
    order_id: number
    status: OrderStatus
    total_amount: number
    shipping_fee: number
    created_at: string
    estimated_delivery_at?: string
    note?: string
  }
  customer: {
    name: string
    phone: string
    email: string
    address: string
  }
  shipper?: {
    user_id: number
    name: string
    phone: string
    vehicle_info: string
    rating?: number
    on_time_delivery_pct?: number
    current_location: {
      lat?: number
      lng?: number
      speed?: number
      heading?: number
      updated_at?: string
    }
  }
  items: OrderItem[]
  tracking: {
    events: TrackingEvent[]
    event_count: number
  }
}

export interface OrderItem {
  order_item_id: number
  quantity: number
  price: number
  subtotal: number
  product_name: string
  size_name: string
  sku: string
}

export interface TrackingEvent {
  event_id: number
  status: OrderStatus
  note?: string
  lat?: number
  lng?: number
  created_at: string
  created_by_name?: string
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed' 
  | 'assigned'
  | 'picking_up'
  | 'picked_up'
  | 'in_transit'
  | 'arriving'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'returned'

// ==============================================
// Shipper Types
// ==============================================

export interface Shipper {
  user_id: number
  shipper_name: string
  phone: string
  email?: string
  vehicle_info: string
  rating?: number
  on_time_delivery_pct?: number
  total_delivered: number
  last_delivery_at?: string
  is_available: boolean
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at?: string
  current_lat?: number
  current_lng?: number
  location_updated_at?: string
  active_orders_count: number
}

export interface ShipperPerformance {
  shipper: Shipper
  performance: {
    total_orders: number
    completed_orders: number
    cancelled_orders: number
    success_rate: number
    avg_delivery_time: number
    total_revenue: number
  }
  recent_orders: OrderTracking[]
  date_range: {
    from: string
    to: string
  }
}

export interface ShipperLocation {
  location_id: number
  shipper_id: number
  order_id?: number
  lat: number
  lng: number
  speed: number
  heading: number
  accuracy: number
  battery_level: number
  captured_at: string
  shipper_name: string
  vehicle_info: string
}

// ==============================================
// Notification Types
// ==============================================

export interface Notification {
  notification_id: number
  type: NotificationType
  title: string
  message: string
  related_order_id?: number
  related_shipper_id?: number
  is_read: boolean
  created_at: string
  order_id?: number
  order_status?: string
  total_amount?: number
  shipper_name?: string
  shipper_phone?: string
  customer_name?: string
  customer_phone?: string
}

export type NotificationType = 
  | 'order_assigned'
  | 'order_picked_up'
  | 'order_delivered'
  | 'order_cancelled'
  | 'shipper_issue'
  | 'order_delayed'
  | 'shipper_offline'
  | 'system_alert'

export interface NotificationStats {
  total_notifications: number
  unread_notifications: number
  read_rate: number
  by_type: Array<{
    type: NotificationType
    count: number
  }>
  recent_notifications: Notification[]
  date_range: {
    from: string
    to: string
  }
}

// ==============================================
// Dashboard Stats Types
// ==============================================

export interface TrackingStats {
  total_orders_today: number
  active_deliveries: number
  completed_today: number
  pending_pickup: number
  failed_deliveries: number
  avg_delivery_time: number
  total_revenue_today: number
  active_shippers: number
  date_range: {
    from: string
    to: string
  }
}

// ==============================================
// API Response Types
// ==============================================

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  status_code?: number
  data?: T
}

export interface PaginatedResponse<T = any> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface TrackingOrdersResponse {
  orders: OrderTracking[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// ==============================================
// Filter & Search Types
// ==============================================

export interface OrderFilters {
  status?: string
  shipper_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
}

export interface ShipperFilters {
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface NotificationFilters {
  type?: string
  is_read?: string
  search?: string
  page?: number
  limit?: number
}

// ==============================================
// Form Data Types
// ==============================================

export interface UpdateOrderStatusData {
  status: OrderStatus
  note?: string
  lat?: number
  lng?: number
  created_by?: number
}

export interface UpdateShipperLocationData {
  lat: number
  lng: number
  speed?: number
  heading?: number
  accuracy?: number
  battery_level?: number
  order_id?: number
}

export interface AssignOrderData {
  order_id: number
  shipper_id: number
  note?: string
}

export interface CreateNotificationData {
  type: NotificationType
  title: string
  message: string
  related_order_id?: number
  related_shipper_id?: number
}

// ==============================================
// Map Types
// ==============================================

export interface MapMarker {
  id: number
  lat: number
  lng: number
  type: 'shipper' | 'destination'
  title: string
  description?: string
  status?: string
  updated_at?: string
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

// ==============================================
// Utility Types
// ==============================================

export interface StatusConfig {
  label: string
  color: string
  icon: string
  description?: string
}

export interface StatusTransition {
  from: OrderStatus
  to: OrderStatus[]
  description: string
}

// ==============================================
// Error Prevention Helpers
// ==============================================

/**
 * Safe array access helper - áp dụng từ Loi_thuong_gap.md
 */
export const ensureArray = <T>(data: any): T[] => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  if (data && Array.isArray(data.data)) return data.data
  return []
}

/**
 * Safe property access helper - áp dụng từ Loi_thuong_gap.md
 */
export const getNestedValue = (obj: any, path: string, defaultValue: any = null) => {
  return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue
}

/**
 * Status configuration for UI display
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Chờ xử lý',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
    description: 'Đơn hàng đang chờ xử lý'
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: 'bg-blue-100 text-blue-800',
    icon: '✅',
    description: 'Shop đã xác nhận đơn hàng'
  },
  assigned: {
    label: 'Đã gán shipper',
    color: 'bg-purple-100 text-purple-800',
    icon: '👤',
    description: 'Đã gán cho shipper'
  },
  picking_up: {
    label: 'Đang lấy hàng',
    color: 'bg-orange-100 text-orange-800',
    icon: '🚚',
    description: 'Shipper đang đến lấy hàng'
  },
  picked_up: {
    label: 'Đã lấy hàng',
    color: 'bg-indigo-100 text-indigo-800',
    icon: '📦',
    description: 'Shipper đã lấy hàng thành công'
  },
  in_transit: {
    label: 'Đang giao hàng',
    color: 'bg-cyan-100 text-cyan-800',
    icon: '🚛',
    description: 'Đang trên đường giao hàng'
  },
  arriving: {
    label: 'Sắp đến nơi',
    color: 'bg-teal-100 text-teal-800',
    icon: '📍',
    description: 'Sắp đến nơi giao hàng'
  },
  delivered: {
    label: 'Giao thành công',
    color: 'bg-green-100 text-green-800',
    icon: '🎉',
    description: 'Giao hàng thành công'
  },
  failed: {
    label: 'Giao thất bại',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    description: 'Giao hàng thất bại'
  },
  cancelled: {
    label: 'Đã hủy',
    color: 'bg-gray-100 text-gray-800',
    icon: '🚫',
    description: 'Đơn hàng đã bị hủy'
  },
  returned: {
    label: 'Hoàn hàng',
    color: 'bg-amber-100 text-amber-800',
    icon: '↩️',
    description: 'Đơn hàng đã hoàn trả'
  }
}

/**
 * Notification type configuration for UI display
 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, StatusConfig> = {
  order_assigned: {
    label: 'Gán đơn',
    color: 'bg-blue-100 text-blue-800',
    icon: '👤'
  },
  order_picked_up: {
    label: 'Lấy hàng',
    color: 'bg-orange-100 text-orange-800',
    icon: '📦'
  },
  order_delivered: {
    label: 'Giao thành công',
    color: 'bg-green-100 text-green-800',
    icon: '🎉'
  },
  order_cancelled: {
    label: 'Hủy đơn',
    color: 'bg-red-100 text-red-800',
    icon: '❌'
  },
  shipper_issue: {
    label: 'Sự cố shipper',
    color: 'bg-red-100 text-red-800',
    icon: '⚠️'
  },
  order_delayed: {
    label: 'Delay giao hàng',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏰'
  },
  shipper_offline: {
    label: 'Shipper offline',
    color: 'bg-gray-100 text-gray-800',
    icon: '📴'
  },
  system_alert: {
    label: 'Cảnh báo hệ thống',
    color: 'bg-purple-100 text-purple-800',
    icon: '🚨'
  }
}
