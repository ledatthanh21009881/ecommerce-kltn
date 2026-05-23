import type { TranslationKey } from '@/lib/ui-translations'

const ORDER_STATUS_KEYS: Record<string, TranslationKey> = {
  pending: 'pending',
  processing: 'processing',
  shipping: 'orderStatusShipping',
  completed: 'completed',
  cancelled: 'cancelled',
  returned: 'returned',
}

const SHIPPER_STATUS_KEYS: Record<string, TranslationKey> = {
  new_request: 'shipStatusNewRequest',
  accepted: 'shipStatusAccepted',
  picked_up: 'shipStatusPickedUp',
  delivering: 'shipStatusDelivering',
  arrived: 'shipStatusArrived',
  delivered: 'shipStatusDelivered',
  rejected: 'shipStatusRejected',
  completed: 'shipStatusCompleted',
}

const NOTIF_TYPE_KEYS: Record<string, TranslationKey> = {
  new_order: 'notifTypeNewOrder',
  payment_update: 'notifTypePaymentUpdate',
  order_assigned: 'notifTypeOrderAssigned',
  order_rejected: 'notifTypeOrderRejected',
  order_reassigned: 'notifTypeOrderReassigned',
  order_reassign_failed: 'notifTypeOrderReassignFailed',
}

export function translateOrderStatus(
  status: string | undefined | null,
  t: (key: TranslationKey) => string,
): string {
  if (!status) return ''
  const key = ORDER_STATUS_KEYS[status]
  if (key) return t(key)
  const direct = t(status as TranslationKey)
  return direct !== status ? direct : status
}

export function translateShipperDeliveryStatus(
  status: string | undefined | null,
  t: (key: TranslationKey) => string,
): string {
  if (!status) return ''
  const key = SHIPPER_STATUS_KEYS[status]
  if (key) return t(key)
  return status.replace(/_/g, ' ')
}

export function translateNotificationType(
  type: string,
  t: (key: TranslationKey) => string,
): string {
  const key = NOTIF_TYPE_KEYS[type]
  if (key) return t(key)
  return type.replace(/_/g, ' ')
}
