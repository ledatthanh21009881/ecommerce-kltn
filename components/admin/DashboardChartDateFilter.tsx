'use client'

import { useState, useEffect } from 'react'
import { ListFilter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLanguage } from '@/contexts/LanguageContext'

export type DateRangeApply = { from: string; to: string }

type Align = 'start' | 'center' | 'end'

type Props = {
  appliedFrom: string
  appliedTo: string
  onApply: (range: DateRangeApply) => void
  align?: Align
}

export function DashboardChartDateFilter({ appliedFrom, appliedTo, onApply, align = 'end' }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(appliedFrom)
  const [draftTo, setDraftTo] = useState(appliedTo)

  useEffect(() => {
    if (open) {
      setDraftFrom(appliedFrom)
      setDraftTo(appliedTo)
    }
  }, [open, appliedFrom, appliedTo])

  const handleApply = () => {
    if (!draftFrom || !draftTo) {
      toast.error(t('dashboardInvalidDateRange'))
      return
    }
    if (draftFrom > draftTo) {
      toast.error(t('dashboardInvalidDateRange'))
      return
    }
    const start = new Date(draftFrom + 'T12:00:00')
    const end = new Date(draftTo + 'T12:00:00')
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
    if (days > 366) {
      toast.error(t('dashboardRangeTooLong'))
      return
    }
    onApply({ from: draftFrom, to: draftTo })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg border-slate-200 bg-white text-slate-600 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
          aria-label={t('dashboardChartFilterAria')}
        >
          <ListFilter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,280px)] p-4" align={align} side="bottom" sideOffset={6}>
        <p className="mb-3 text-xs font-medium text-slate-600">{t('dashboardChartFiltersLabel')}</p>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <span className="text-xs text-slate-500">{t('dashboardDateFrom')}</span>
            <input
              type="date"
              value={draftFrom}
              max={draftTo}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none ring-violet-500 focus:ring-2"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-slate-500">{t('dashboardDateTo')}</span>
            <input
              type="date"
              value={draftTo}
              min={draftFrom}
              onChange={(e) => setDraftTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none ring-violet-500 focus:ring-2"
            />
          </div>
          <Button type="button" onClick={handleApply} className="h-9 w-full bg-violet-600 text-white hover:bg-violet-700">
            {t('dashboardApplyFilter')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
