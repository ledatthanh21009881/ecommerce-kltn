'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ClipboardList, Package, PackageOpen, Truck, House, MapPinned } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCustomerOrderProgressPhase } from '@/lib/orderCustomerTracking'
import { useLanguage } from '@/components/language-provider'

const STEP_KEYS = [
  'orderProgress.step.placed',
  'orderProgress.step.processing',
  'orderProgress.step.picking',
  'orderProgress.step.delivering',
  'orderProgress.step.completed',
] as const

const STEP_ICONS = [ClipboardList, Package, PackageOpen, Truck, House] as const

const HEADLINE_KEYS = [
  'orderProgress.headline.received',
  'orderProgress.headline.preparing',
  'orderProgress.headline.picking',
  'orderProgress.headline.delivering',
  'orderProgress.headline.completed',
] as const

const N = STEP_KEYS.length

export type CustomerOrderStatusBarProps = {
  status: string
  showNearDestinationMapLink?: boolean
  mapHref?: string
  distanceKm?: number | null
}

function fillWidthPercent(activeIndex: number, normal: boolean): string {
  if (!normal || N <= 1) return '0%'
  const i = Math.max(0, Math.min(activeIndex, N - 1))
  return `${(i / N) * 100}%`
}

export function CustomerOrderStatusBar({
  status,
  showNearDestinationMapLink,
  mapHref,
  distanceKm,
}: CustomerOrderStatusBarProps) {
  const { t } = useLanguage()
  const { activeIndex, badge } = getCustomerOrderProgressPhase(status)
  const normal = badge === 'normal'

  const steps = useMemo(
    () =>
      STEP_KEYS.map((key, idx) => ({
        title: t(key),
        Icon: STEP_ICONS[idx],
      })),
    [t],
  )

  const headline =
    badge === 'cancelled'
      ? t('orderProgress.headline.cancelled')
      : badge === 'failed'
        ? t('orderProgress.headline.failed')
        : t(HEADLINE_KEYS[activeIndex])

  const lastIdx = N - 1
  const percentLeftCenter = `${100 / (2 * N)}%`
  const fillW = fillWidthPercent(activeIndex, normal)

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('orderProgress.title')}
        </h2>
        <p
          className={cn(
            'mt-1 text-lg font-semibold leading-snug text-neutral-900',
            badge === 'cancelled' && 'text-neutral-700',
            badge === 'failed' && 'text-red-700',
          )}
        >
          {headline}
        </p>
      </div>

      <div
        className="relative grid w-full pt-1"
        style={{
          gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
        }}
      >
        <div
          className="pointer-events-none absolute z-0 rounded-full bg-neutral-200"
          style={{
            height: '3px',
            top: '18px',
            left: percentLeftCenter,
            right: percentLeftCenter,
          }}
          aria-hidden
        />
        <div
          className={cn(
            'pointer-events-none absolute top-[18px] z-0 h-[3px] rounded-full bg-neutral-900 transition-[width] duration-300 ease-out',
            !normal && 'opacity-25',
          )}
          style={{
            left: percentLeftCenter,
            width: fillW,
          }}
          aria-hidden
        />

        {steps.map((step, idx) => {
          const Icon = step.Icon
          const done = normal && idx <= activeIndex
          const current = normal && idx === activeIndex && activeIndex < lastIdx

          return (
            <div key={step.title} className="relative z-[1] flex min-w-0 flex-col items-center">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-transform duration-200',
                  !normal && 'border-neutral-200 text-neutral-300',
                  normal &&
                    done &&
                    !current &&
                    'border-neutral-900 bg-neutral-50 text-neutral-900',
                  normal &&
                    current &&
                    'scale-[1.03] border-neutral-900 bg-neutral-900 text-white ring-[3px] ring-neutral-200',
                  normal && !done && 'border-neutral-200 text-neutral-400',
                )}
              >
                <Icon className="h-[15px] w-[15px] sm:h-4 sm:w-4" aria-hidden strokeWidth={2.25} />
              </div>
              <span
                className={cn(
                  'mt-2 max-h-9 w-full px-0.5 text-center text-[10px] font-medium leading-snug sm:max-h-none sm:text-[11px]',
                  normal && done && 'text-neutral-900',
                  normal && !done && 'text-neutral-400',
                  !normal && 'text-neutral-400',
                )}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>

      {(showNearDestinationMapLink && mapHref) || (distanceKm != null && Number.isFinite(distanceKm)) ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-4">
          {distanceKm != null && Number.isFinite(distanceKm) && (
            <p className="text-center text-xs text-neutral-600">
              {t('orderProgress.distance', { km: distanceKm.toFixed(2) })}
            </p>
          )}
          {showNearDestinationMapLink && mapHref ? (
            <Link
              href={mapHref}
              className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <MapPinned className="h-4 w-4 shrink-0" />
              {t('orderProgress.viewMap')}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
