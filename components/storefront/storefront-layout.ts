import { cn } from '@/lib/utils'

/** Matches desktop sidebar `w-56` (14rem). */
export const STOREFRONT_SIDEBAR_OFFSET =
  'md:pl-[calc(14rem+1.5rem)] md:pr-12'

/** Top offset for fixed mobile nav bar (~3.5rem) + safe area. */
export const STOREFRONT_MOBILE_TOP =
  'pt-[calc(3.5rem+env(safe-area-inset-top,0px))]'

/**
 * Main content area for storefront pages (beside desktop sidebar).
 * Mobile: full width with hamburger clearance. Desktop: offset for w-56 nav.
 */
export function storefrontMainClass(extra?: string) {
  return cn(
    'w-full min-w-0 max-w-full box-border',
    'px-4 pb-12',
    STOREFRONT_MOBILE_TOP,
    'md:px-8 md:pt-[26px] md:pb-[87px]',
    STOREFRONT_SIDEBAR_OFFSET,
    extra,
  )
}

/** Centered empty/loading states (collections index, etc.). */
export function storefrontCenteredClass(extra?: string) {
  return cn(
    'flex min-h-[50vh] w-full min-w-0 items-center justify-center px-4',
    STOREFRONT_MOBILE_TOP,
    'md:min-h-screen md:px-8',
    STOREFRONT_SIDEBAR_OFFSET,
    extra,
  )
}

/** Product listing grids */
export const storefrontProductGridClass =
  'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
