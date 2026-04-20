'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'

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

function getStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const s = status.toLowerCase()
  if (s === 'pending' || s === 'processing' || s === 'confirmed' || s === 'assigned') {
    return t('account.orderStatus.waiting')
  }
  if (
    s === 'shipping' ||
    s === 'in_transit' ||
    s === 'picking_up' ||
    s === 'picked_up' ||
    s === 'arriving'
  ) {
    return t('account.orderStatus.shipping')
  }
  if (s === 'delivered' || s === 'completed') return t('account.orderStatus.delivered')
  if (s === 'cancelled' || s === 'failed' || s === 'returned') {
    return t('account.orderStatus.cancelled')
  }
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
  const { t } = useLanguage()
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
          {getStatusLabel(status, t)}
        </span>
      </div>

      {/* SECOND ROW: Order # + Created date */}
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
        <span>
          {t('account.orderPrefix')} #{orderId}
        </span>
        <span>·</span>
        <span>{createdAt}</span>
      </div>

      {/* THIRD ROW: Total amount (left) + Item count (right) */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-black">{totalAmount}</span>
        <span className="text-sm text-gray-500">
          {itemCount} {t('account.productsUnit')}
        </span>
      </div>

      {/* BOTTOM ROW: Right-aligned "View details" */}
      <div className="mt-4 flex justify-end">
        <span className="text-sm font-medium text-black">{t('account.viewDetails')}</span>
      </div>
    </Link>
  )
}
