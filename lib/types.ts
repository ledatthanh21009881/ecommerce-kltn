export interface Product {
  product_id: number
  product_name: string
  category_id: number
  category_name?: string
  short_description?: string
  description?: string
  material?: string
  list_price: number
  compare_at_price?: number
  cost_price?: number
  stock?: number
  stock_quantity?: number
  status: 'active' | 'inactive' | 'draft'
  is_featured: boolean
  created_at: string
  updated_at: string
  main_image?: string
  variant_count?: number
  variants?: ProductVariant[]
  images?: ProductImage[]
}

export interface ProductVariant {
  variant_id: number
  product_id: number
  size_id: number
  size_name: string
  sku: string
  stock_quantity: number
  status: 'in_stock' | 'out_of_stock' | 'discontinued'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductImage {
  image_id: number
  product_id: number
  image_url?: string
  url?: string
  alt_text?: string
  image_type: 'thumbnail' | 'gallery' | 'main'
  is_main: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Category {
  category_id: number
  category_name: string
  slug: string
  parent_id?: number
  parent_name?: string
  position: number
  is_active: boolean
  children_count?: number
  children?: Category[]
  created_at?: string
  updated_at?: string
}

export interface AdminUser {
  account_id: number
  account_name: string
  account_type: string
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  product_name: string
  category_id: number
  short_description?: string
  description?: string
  material?: string
  list_price: number
  compare_at_price?: number
  cost_price?: number
  stock: number
  status: 'active' | 'inactive' | 'draft'
  is_featured: boolean
  variants: ProductVariant[]
  images: ProductImage[]
}

export interface InventoryVariant {
  variant_id: number
  product_id: number
  size_id: number
  sku: string
  stock_quantity: number
  status: 'in_stock' | 'out_of_stock'
  is_active: boolean
  product_name: string
  size_name: string
}

export interface InventoryFormData {
  product_id: number
  size_id: number
  sku: string
  stock_quantity: number
  status: 'in_stock' | 'out_of_stock'
}

// Order Types
export interface Order {
  order_id: number
  customer_id: number
  address_id: number
  shipping_method_id: number
  voucher_id?: number
  voucher_code_applied?: string
  discount_amount_applied: number
  total_amount: number
  shipping_fee: number
  cod_amount: number
  status: 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled' | 'returned'
  note?: string
  internal_note?: string
  estimated_delivery_at?: string
  invoice_number: string
  shipping_address_snapshot: string
  shipping_method_name_snapshot: string
  voucher_summary_snapshot?: string
  created_at: string
  updated_at: string
  // Joined fields
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  shipping_method_name?: string
  voucher_code?: string
  item_count?: number
  // Related data
  items?: OrderItem[]
  status_logs?: OrderStatusLog[]
  tracking?: ShippingTracking
  payment?: Payment
  delivery_proofs?: DeliveryProof[]
}

export interface OrderItem {
  item_id: number
  order_id: number
  variant_id: number
  quantity: number
  unit_price: number
  product_name_snapshot: string
  created_at: string
  updated_at: string
  // Joined fields
  product_name?: string
  product_slug?: string
  sku?: string
  size_name?: string
  product_image?: string
}

export interface OrderStatusLog {
  log_id: number
  order_id: number
  status: string
  changed_by: number
  reason?: string
  changed_at: string
  // Joined fields
  first_name?: string
  last_name?: string
}

export interface DeliveryProof {
  proof_id?: number
  order_id?: number
  shipper_id?: number
  status?: string
  proof_type: string
  photo_url: string
  latitude?: number | null
  longitude?: number | null
  captured_at?: string
}

export interface ShippingTracking {
  tracking_id: number
  order_id: number
  shipper_id: number
  current_lat?: number
  current_lng?: number
  confirmed_delivery_at?: string
  photo_proof_url?: string
  signature_url?: string
  route_polyline?: string
  last_updated: string
  // Joined fields
  vehicle_info?: string
  rating?: number
  first_name?: string
  last_name?: string
  phone?: string
}

export interface Payment {
  payment_id: number
  order_id: number
  method: string
  status: string
  transaction_id?: string
  bank_code?: string
  paid_amount: number
  is_suspicious: boolean
  vnp_secure_hash?: string
  callback_payload?: string
  confirmed_at?: string
  failure_reason?: string
  payment_url?: string | null
  qr_code?: string | null
  created_at: string
  updated_at: string
}

export interface OrderStatistics {
  total_orders: number
  pending_orders: number
  processing_orders: number
  shipping_orders: number
  completed_orders: number
  cancelled_orders: number
  returned_orders: number
  total_revenue: number
}

export interface Shipper {
  user_id: number
  vehicle_info?: string
  rating: number
  on_time_delivery_pct: number
  total_delivered: number
  total_deliveries?: number
  is_available: boolean
  first_name: string
  last_name: string
  phone: string
  email?: string
  current_location?: string
  shipper_id?: number
}

export interface OrderFormData {
  customer_id: number
  address_id: number
  shipping_method_id: number
  voucher_id?: number
  total_amount: number
  shipping_fee: number
  status: string
  note?: string
  internal_note?: string
  estimated_delivery_at?: string
  items: OrderItemFormData[]
}

export interface OrderItemFormData {
  variant_id: number
  quantity: number
  unit_price: number
  product_name_snapshot: string
}
