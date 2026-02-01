'use client'

import Link from 'next/link'

export interface UserOrderCardProps {
  orderId: number
  invoiceNumber: string
  status: string
  totalAmount: string
  createdAt: string
  itemCount: number
  detailHref: string
}

function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s === 'pending' || s === 'processing' || s === 'confirmed' || s === 'assigned') return 'bg-amber-100 text-amber-800'
  if (s === 'shipping' || s === 'in_transit' || s === 'picking_up' || s === 'picked_up' || s === 'arriving') return 'bg-blue-100 text-blue-800'
  if (s === 'delivered' || s === 'completed') return 'bg-green-100 text-green-800'
  if (s === 'cancelled' || s === 'failed' || s === 'returned') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s === 'pending' || s === 'processing') return 'Chờ xử lý'
  if (s === 'shipping' || s === 'in_transit') return 'Đang giao'
  if (s === 'delivered' || s === 'completed') return 'Đã giao'
  if (s === 'cancelled' || s === 'failed') return 'Đã hủy'
  return status
}

export function UserOrderCard({
  orderId,
  invoiceNumber,
  status,
  totalAmount,
  createdAt,
  itemCount,
  detailHref,
}: UserOrderCardProps) {
  return (
    <Link
      href={detailHref}
      className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-gray-300"
    >
      {/* TOP ROW: Invoice (left) + Status badge (right) */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xl font-bold text-black truncate min-w-0">{invoiceNumber}</p>
        <span
          className={`flex-shrink-0 rounded-xl px-3 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      {/* SECOND ROW: Order # + Created date */}
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
        <span>Order #{orderId}</span>
        <span>·</span>
        <span>{createdAt}</span>
      </div>

      {/* THIRD ROW: Total amount (left) + Item count (right) */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-black">{totalAmount}</span>
        <span className="text-sm text-gray-500">
          {itemCount} {itemCount === 1 ? 'sản phẩm' : 'sản phẩm'}
        </span>
      </div>

      {/* BOTTOM ROW: Right-aligned "View details" */}
      <div className="mt-4 flex justify-end">
        <span className="text-sm font-medium text-black">Xem chi tiết →</span>
      </div>
    </Link>
  )
}
