'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Collection } from '@/lib/collections-api'
import type { ShopNavCategory } from '@/lib/shop-nav-categories'
import { useLanguage } from '@/components/language-provider'

const SHOP_CATEGORY_TRANSLATION_BY_SLUG: Record<string, string> = {
  shirts: 'nav.shopShirts',
  'jackets-coats': 'nav.shopJackets',
  jackets: 'nav.shopJackets',
  skirts: 'nav.shopSkirts',
  pants: 'nav.shopPants',
  accessories: 'nav.shopAccessories',
}

export type StorefrontNavMenuProps = {
  siteName: string
  textColorClass: string
  hoverColorClass: string
  isShopOpen: boolean
  setIsShopOpen: (open: boolean) => void
  isCollectionOpen: boolean
  setIsCollectionOpen: (open: boolean) => void
  collections: Collection[]
  shopCategories: ShopNavCategory[]
  isLoggedIn: boolean
  onLogoutClick: () => void
  onNavigate?: () => void
}

export function StorefrontNavMenu({
  siteName,
  textColorClass,
  hoverColorClass,
  isShopOpen,
  setIsShopOpen,
  isCollectionOpen,
  setIsCollectionOpen,
  collections,
  shopCategories,
  isLoggedIn,
  onLogoutClick,
  onNavigate,
}: StorefrontNavMenuProps) {
  const { t } = useLanguage()
  const pathname = usePathname()

  const linkProps = { onClick: onNavigate }

  const getLocalizedShopCategoryName = (cat: ShopNavCategory): string => {
    const key = SHOP_CATEGORY_TRANSLATION_BY_SLUG[cat.slug?.toLowerCase?.() || '']
    return key ? t(key) : cat.category_name
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className={`text-lg font-bold uppercase tracking-wider ${textColorClass} hover:opacity-80 transition-opacity`}
          {...linkProps}
        >
          {siteName}
        </Link>
      </div>

      <div className="mb-6 relative">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setIsShopOpen(!isShopOpen)}
            className={`text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors cursor-pointer`}
          >
            {t('nav.shopNav')}
          </button>
        </div>
        {isShopOpen && (
          <nav className="space-y-1 sidebar-nav relative z-[110]">
            <Link
              href="/all-products"
              className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
              {...linkProps}
            >
              {t('nav.shopAll')}
            </Link>
            {shopCategories.map((cat) => (
              <Link
                key={cat.category_id}
                href={`/category/${encodeURIComponent(cat.slug)}`}
                className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
                {...linkProps}
              >
                {getLocalizedShopCategoryName(cat)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="mb-6 relative">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setIsCollectionOpen(!isCollectionOpen)}
            className={`text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors cursor-pointer`}
          >
            {t('nav.collectionNav')}
          </button>
        </div>
        {isCollectionOpen && (
          <nav className="space-y-1 sidebar-nav relative z-[110] mb-4">
            {collections.map((c) => {
              const isActive = pathname === `/collections/${c.slug}`
              return (
                <Link
                  key={c.collection_id}
                  href={`/collections/${c.slug}`}
                  className={`block text-xs font-bold uppercase tracking-wider py-0.5 ${
                    isActive
                      ? 'text-black font-semibold'
                      : `${textColorClass} ${hoverColorClass}`
                  } transition-colors`}
                  {...linkProps}
                >
                  {c.collection_name}
                </Link>
              )
            })}
          </nav>
        )}
        <nav className="space-y-1 sidebar-nav">
          <Link
            href="/about"
            className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
            {...linkProps}
          >
            {t('nav.aboutNav')}
          </Link>
          <Link
            href="/search"
            className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
            {...linkProps}
          >
            {t('nav.searchNav')}
          </Link>
          <Link
            href="/cart"
            className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
            {...linkProps}
          >
            {t('nav.cartNav')}
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                href="/messenger"
                className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
                {...linkProps}
              >
                {t('nav.messengerNav')}
              </Link>
              <Link
                href="/account"
                className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
                {...linkProps}
              >
                {t('nav.accountNav')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  onLogoutClick()
                  onNavigate?.()
                }}
                className={`block w-full text-left text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5 cursor-pointer`}
              >
                {t('nav.logoutNav')}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
              {...linkProps}
            >
              {t('nav.loginNav')}
            </Link>
          )}
        </nav>
      </div>
    </div>
  )
}
