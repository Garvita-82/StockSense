'use client'

import { CalendarDays, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDate, fmtNum } from '@/lib/format'
import { useReadyDb } from '@/lib/use-db'
import { Badge, statusTone } from '@/components/common/status-badge'
import { ORDER_CONFIG, type OrderKind, type OrderRow } from './order-model'
import { AdvanceButton } from './advance-button'

const columnAccent = {
  neutral: 'bg-muted-foreground',
  pending: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
  brand: 'bg-primary',
} as const

export function OrdersKanban({ kind, rows, onOpen }: { kind: OrderKind; rows: OrderRow[]; onOpen: (id: string) => void }) {
  const config = ORDER_CONFIG[kind]
  const { lk } = useReadyDb()

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {config.statuses.map((status) => {
        const items = rows
          .filter((o) => o.status === status)
          .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.reference.localeCompare(b.reference))
        const units = items.reduce((s, o) => s + o.units, 0)
        return (
          <section key={status} aria-labelledby={`col-${status}`} className="flex min-h-48 flex-col rounded-lg border border-border bg-muted/40">
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', columnAccent[statusTone[status]])} aria-hidden="true" />
                <h2 id={`col-${status}`} className="text-sm font-semibold">
                  {status}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{fmtNum(units)} units</span>
            </header>
            <ul className="flex flex-1 flex-col gap-2 p-2">
              {items.length === 0 ? (
                <li className="px-2 py-6 text-center text-xs text-muted-foreground">No {config.title.toLowerCase()}</li>
              ) : (
                items.map((o) => {
                  const loc = lk.locations.get(o.location_id)
                  return (
                    <li key={o.id}>
                      <article className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onOpen(o.id)}
                            className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="block font-mono text-[13px] font-medium text-primary hover:underline">{o.reference}</span>
                            <span className="mt-0.5 block text-sm font-medium">{o.partner}</span>
                          </button>
                          {o.short ? <Badge tone="pending">Short</Badge> : null}
                        </div>
                        <dl className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <dt className="sr-only">Scheduled</dt>
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            <dd className="tabular-nums">{fmtDate(o.scheduled_date)}</dd>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <dt className="sr-only">{config.locationLabel}</dt>
                            <MapPin className="size-3.5" aria-hidden="true" />
                            <dd className="font-mono">{loc?.code}</dd>
                          </div>
                        </dl>
                        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
                          <span className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground tabular-nums">{fmtNum(o.units)}</span> units · {o.lines.length}{' '}
                            {o.lines.length === 1 ? 'line' : 'lines'}
                          </span>
                          <AdvanceButton kind={kind} order={o} />
                        </div>
                      </article>
                    </li>
                  )
                })
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
