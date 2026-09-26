'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtDate, fmtNum } from '@/lib/format'
import { useReadyDb } from '@/lib/use-db'
import type { SortState } from '@/lib/use-table'
import { Panel } from '@/components/common/layout'
import { Badge, StatusBadge } from '@/components/common/status-badge'
import { EmptyRow, SortableTh, TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'
import { ORDER_CONFIG, type OrderKind, type OrderRow } from './order-model'
import { AdvanceButton } from './advance-button'

type SortKey = 'reference' | 'partner' | 'location' | 'scheduled' | 'units' | 'status'

export function OrdersTable({ kind, rows, onOpen }: { kind: OrderKind; rows: OrderRow[]; onOpen: (id: string) => void }) {
  const config = ORDER_CONFIG[kind]
  const { lk } = useReadyDb()
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'scheduled', dir: 'desc' })

  const sorted = useMemo(() => {
    const statusRank = (s: string) => config.statuses.indexOf(s as never)
    const get: Record<SortKey, (o: OrderRow) => string | number> = {
      reference: (o) => o.reference,
      partner: (o) => o.partner,
      location: (o) => lk.locations.get(o.location_id)?.code ?? '',
      scheduled: (o) => o.scheduled_date,
      units: (o) => o.units,
      status: (o) => statusRank(o.status),
    }
    const f = sort.dir === 'asc' ? 1 : -1
    const g = get[sort.key]
    return [...rows].sort((a, b) => {
      const av = g(a)
      const bv = g(b)
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return cmp * f || a.reference.localeCompare(b.reference)
    })
  }, [rows, sort, lk, config.statuses])

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return (
    <Panel>
      <TableShell caption={`${config.title} list`}>
        <thead className={theadClass}>
          <tr>
            <SortableTh label="Reference" sortKey="reference" sort={sort} onSort={onSort} />
            <SortableTh label={config.partnerLabel} sortKey="partner" sort={sort} onSort={onSort} />
            <SortableTh label={config.locationLabel} sortKey="location" sort={sort} onSort={onSort} />
            <SortableTh label="Scheduled" sortKey="scheduled" sort={sort} onSort={onSort} />
            <SortableTh label="Units" sortKey="units" sort={sort} onSort={onSort} align="right" />
            <SortableTh label="Status" sortKey="status" sort={sort} onSort={onSort} />
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <EmptyRow colSpan={7} message={`No ${config.title.toLowerCase()} match the current filters.`} />
          ) : (
            sorted.map((o) => {
              const loc = lk.locations.get(o.location_id)
              return (
                <tr key={o.id} className={cn(rowClass, 'cursor-pointer')} onClick={() => onOpen(o.id)}>
                  <td className={cellClass}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(o.id)
                      }}
                      className="rounded-sm font-mono text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {o.reference}
                    </button>
                  </td>
                  <td className={cellClass}>{o.partner}</td>
                  <td className={cellClass}>
                    <span className="font-mono text-xs">{loc?.code}</span>
                  </td>
                  <td className={cn(cellClass, 'whitespace-nowrap tabular-nums')}>{fmtDate(o.scheduled_date)}</td>
                  <td className={cn(cellClass, 'text-right font-mono tabular-nums')}>
                    {fmtNum(o.units)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      / {o.lines.length} {o.lines.length === 1 ? 'line' : 'lines'}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={o.status} />
                      {o.short ? <Badge tone="pending">Short</Badge> : null}
                    </div>
                  </td>
                  <td className={cn(cellClass, 'text-right')}>
                    <AdvanceButton kind={kind} order={o} />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </TableShell>
    </Panel>
  )
}
