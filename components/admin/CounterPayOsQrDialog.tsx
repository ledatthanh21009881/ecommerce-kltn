'use client'

import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'

export interface CounterPayOsPaymentInfo {
  payment_id: number
  order_id: number
  payment_url?: string | null
  qr_code?: string | null
  total_amount?: number
}

interface PaymentStatusPayload {
  payment_id: number
  order_id: number
  method: string
  status: string
  payment_url: string | null
  qr_code?: string | null
  order?: { total_amount?: number } | null
}

interface CounterPayOsQrDialogProps {
  open: boolean
  onClose: () => void
  onPaid?: () => void
  initial: CounterPayOsPaymentInfo | null
}

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export default function CounterPayOsQrDialog({
  open,
  onClose,
  onPaid,
  initial,
}: CounterPayOsQrDialogProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [payment, setPayment] = useState<PaymentStatusPayload | null>(null)

  const loadPayment = useCallback(async () => {
    if (!initial?.payment_id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/backend/v1/payments/${initial.payment_id}/status`)
      const data = await res.json()
      if (data.success && data.data) {
        setPayment(data.data as PaymentStatusPayload)
        if (data.data.status === 'confirmed') {
          toast.success(t('counterPayOsPaidSuccess'))
          onPaid?.()
        }
      } else {
        toast.error(data.message || t('counterPayOsLoadFailed'))
      }
    } catch {
      toast.error(t('counterPayOsLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [initial?.payment_id, onPaid, t])

  useEffect(() => {
    if (!open || !initial?.payment_id) {
      setPayment(null)
      setPolling(false)
      return
    }
    void loadPayment()
  }, [open, initial?.payment_id, loadPayment])

  useEffect(() => {
    if (!open || !initial?.payment_id || payment?.status === 'confirmed') {
      setPolling(false)
      return
    }
    setPolling(true)
    const id = window.setInterval(() => {
      void loadPayment()
    }, 4000)
    return () => window.clearInterval(id)
  }, [open, initial?.payment_id, payment?.status, loadPayment])

  const qrImageUrl = payment?.payment_url ?? initial?.payment_url ?? null
  const qrData = payment?.qr_code ?? initial?.qr_code ?? null
  const orderId = payment?.order_id ?? initial?.order_id ?? 0
  const amount =
    Number(payment?.order?.total_amount) ||
    Number(initial?.total_amount) ||
    0

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('counterPayOsTitle')}</DialogTitle>
          <DialogDescription>
            {t('counterPayOsDesc').replace('{orderId}', String(orderId))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {amount > 0 && (
            <p className="text-center text-lg font-semibold tabular-nums">{formatVnd(amount)}</p>
          )}

          {loading && !qrImageUrl && !qrData ? (
            <p className="text-center text-sm text-muted-foreground">{t('loading')}</p>
          ) : null}

          {qrData ? (
            <div className="flex flex-col items-center rounded-lg border bg-white p-4">
              <QRCodeSVG value={qrData} size={256} level="H" includeMargin />
            </div>
          ) : qrImageUrl ? (
            <div className="flex flex-col items-center rounded-lg border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr-proxy?url=${encodeURIComponent(qrImageUrl)}`}
                alt="PayOS QR"
                className="h-64 w-64 object-contain"
                onError={(e) => {
                  e.currentTarget.src = qrImageUrl
                }}
              />
              <a
                href={qrImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-primary underline"
              >
                {t('counterPayOsOpenLink')}
              </a>
            </div>
          ) : (
            <p className="text-center text-sm text-amber-700">{t('counterPayOsNoQr')}</p>
          )}

          {payment?.status === 'confirmed' ? (
            <p className="text-center text-sm font-medium text-emerald-700">{t('counterPayOsConfirmed')}</p>
          ) : polling ? (
            <p className="text-center text-sm text-muted-foreground">{t('counterPayOsPolling')}</p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => void loadPayment()} disabled={loading}>
            {t('counterPayOsRefresh')}
          </Button>
          <Button type="button" onClick={handleClose}>
            {payment?.status === 'confirmed' ? t('close') : t('counterPayOsClosePending')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
