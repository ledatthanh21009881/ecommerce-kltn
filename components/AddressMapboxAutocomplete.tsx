'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import {
  isMapboxAddressEnabled,
  MAPBOX_ADDRESS_SUGGEST_LIMIT,
  parseMapboxFeature,
  searchMapboxAddresses,
  type MapboxParsedAddress,
  type MapboxFeature,
} from '@/lib/mapbox-address'

export type { MapboxParsedAddress }

type AddressMapboxAutocompleteProps = {
  id?: string
  value: string
  onValueChange: (addressLine: string) => void
  onPlaceSelect: (parsed: MapboxParsedAddress, feature: MapboxFeature) => void | Promise<void>
  className?: string
  inputClassName?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function AddressMapboxAutocomplete({
  id,
  value,
  onValueChange,
  onPlaceSelect,
  className,
  inputClassName,
  required,
  disabled,
  placeholder,
}: AddressMapboxAutocompleteProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const mapboxEnabled = isMapboxAddressEnabled()

  const updateDropdownPos = useCallback(() => {
    if (!wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    setDropdownPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 200) })
  }, [])

  useLayoutEffect(() => {
    if (!open || !mapboxEnabled) {
      setDropdownPos(null)
      return
    }
    updateDropdownPos()
  }, [open, mapboxEnabled, updateDropdownPos, loading, suggestions.length, value, resolving])

  useEffect(() => {
    if (!mapboxEnabled || !open) return
    const onScrollResize = () => updateDropdownPos()
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    return () => {
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }, [open, mapboxEnabled, updateDropdownPos])

  const runSearch = useCallback(async (query: string) => {
    abortRef.current?.abort()
    const trimmed = query.trim()
    if (!mapboxEnabled || trimmed.length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setOpen(true)
    try {
      const features = await searchMapboxAddresses(query, {
        signal: controller.signal,
        limit: MAPBOX_ADDRESS_SUGGEST_LIMIT,
      })
      if (!controller.signal.aborted) {
        setSuggestions(features)
        setOpen(true)
      }
    } catch {
      if (!controller.signal.aborted) {
        setSuggestions([])
        setOpen(true)
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [mapboxEnabled])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (target instanceof Element && target.closest?.('[data-address-suggestions]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const handleInputChange = (text: string) => {
    onValueChange(text)
    if (!mapboxEnabled) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = text.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setOpen(true)
    debounceRef.current = setTimeout(() => {
      void runSearch(text)
    }, 350)
  }

  const handleSelect = async (feature: MapboxFeature) => {
    const parsed = parseMapboxFeature(feature)
    onValueChange(parsed.address_line)
    setSuggestions([])
    setOpen(false)
    setResolving(true)
    try {
      await onPlaceSelect(parsed, feature)
    } finally {
      setResolving(false)
    }
  }

  if (!mapboxEnabled) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(inputClassName, className)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />
    )
  }

  const showListPanel = open && (loading || suggestions.length > 0)
  const showEmptyPanel = open && !loading && value.trim().length >= 3 && suggestions.length === 0

  const listDropdown =
    mapboxEnabled &&
    dropdownPos &&
    showListPanel &&
    typeof document !== 'undefined'
      ? createPortal(
          <ul
            data-address-suggestions
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
            className="max-h-80 overflow-y-auto rounded-md border bg-popover py-1 text-sm shadow-lg"
            role="listbox"
          >
            {suggestions.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(f)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{f.place_name}</span>
                </button>
              </li>
            ))}
            {loading && (
              <li className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('addressMapboxSearching')}</span>
              </li>
            )}
          </ul>,
          document.body
        )
      : null

  const emptyDropdown =
    mapboxEnabled &&
    dropdownPos &&
    showEmptyPanel &&
    typeof document !== 'undefined'
      ? createPortal(
          <p
            data-address-suggestions
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
            className="rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow"
          >
            {t('addressMapboxNoResults')}
          </p>,
          document.body
        )
      : null

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= 3) setOpen(true)
          }}
          className={cn('pr-9', inputClassName)}
          required={required}
          disabled={disabled}
          placeholder={placeholder ?? t('addressMapboxPlaceholder')}
          autoComplete="off"
        />
        {loading || resolving ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>
      {listDropdown}
      {emptyDropdown}
    </div>
  )
}
