'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type AdminPageHeadingProps = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  descriptionClassName?: string
}

/**
 * Tiêu đề serif (Playfair) + mô tả sans-serif — đồng bộ giao diện trang quản lý.
 */
export function AdminPageHeading({
  title,
  description,
  actions,
  className,
  descriptionClassName,
}: AdminPageHeadingProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0">
        <h1 className="admin-page-title">{title}</h1>
        {description != null && description !== false && (
          <p className={cn('admin-page-description', descriptionClassName)}>{description}</p>
        )}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
