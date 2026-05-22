'use client'

import Image from 'next/image'
import { getProofDisplayState, type DeliveryProof } from '@/lib/deliveryProofs'

interface DeliveryProofThumbnailProps {
  label: string
  proof: DeliveryProof | null
  onImageClick?: (url: string) => void
  emptyText?: string
  unviewableText?: string
}

export function DeliveryProofThumbnail({
  label,
  proof,
  onImageClick,
  emptyText = 'Chưa có ảnh',
  unviewableText = 'Không xem được (dữ liệu cũ)',
}: DeliveryProofThumbnailProps) {
  const state = getProofDisplayState(proof)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {state.kind === 'image' && state.url ? (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in"
            onClick={() => onImageClick?.(state.url!)}
          >
            <Image
              src={state.url}
              alt={label}
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </button>
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center p-4 text-center text-sm text-slate-500">
            {state.kind === 'unviewable' ? unviewableText : emptyText}
          </div>
        )}
      </div>
    </div>
  )
}
