'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtDateTime, fmtNum } from '@/lib/format'
import { useReadyDb } from '@/lib/use-db'
import { useTable } from '@/lib/use-table'
import { ADJUSTMENT_REASONS, type Adjustment } from '@/lib/types'
import { PageHeader, Panel } from '@/components/common/layout'
import { Delta } from '@/components/common/status-badge'
import { EmptyRow, SearchInput, Select, SortableTh, TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'
import { StockMovementPanel } from './adjustment-form'

type SortKey = 'created_at' | 'reference' | 'product' | 'location' | 'delta' | 'reason'

export function AdjustmentsView() {
  const { db, lk } = useReadyDb()
  const [reason, setReason] = useState('all')

  const filter = useMemo(() => (reason === 'all' ? undefined : (a: Adjustment) => a.reason === reason), [reason])

  const table = useTable<Adjustment, SortKey>(db.adjustments, {
    sortBy: {
      created_at: (a) => a.created_at,
      reference: (a) => a.reference,
      product: (a) => lk.products.get(a.product_id)?.sku ?? '',
      location: (a) => lk.locations.get(a.location_id)?.code ?? '',
      delta: (a) => a.delta,
      reason: (a) => a.reason,
    },
    searchText: (a) => {
      const p = lk.products.get(a.product_id)
      return `${a.reference} ${p?.sku} ${p?.name} ${lk.locations.get(a.location_id)?.code} ${a.reason} ${a.note} ${lk.users.get(a.created_by)?.name}`
    },
    initialSort: { key: 'created_at', dir: 'desc' },
    filter,
  })

  return (
    <>
      <PageHeader
        title="Adjustments"
        description="Manual corrections and internal transfers. Every change is written to the stock ledger."
      />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="xl:sticky xl:top-6 xl:self-start">
          <StockMovementPanel />
        </div>

        <Panel
          title="Adjustment history"
          description={`${db.adjustments.length} recorded`}
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Select aria-label="Filter by reason" value={reason} onChange={(e) => setReason(e.target.value)} className="sm:w-48">
                <option value="all">All reasons</option>
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <SearchInput value={table.query} onChange={table.setQuery} label="Search adjustments" placeholder="Reference, product, note" className="sm:w-60" />
            </div>
          }
        >
          <TableShell caption="Adjustment history">
            <thead className={theadClass}>
              <tr>
                <SortableTh label="Date" sortKey="created_at" sort={table.sort} onSort={table.toggleSort} />
                <SortableTh label="Reference" sortKey="reference" sort={table.sort} onSort={table.toggleSort} />
                <SortableTh label="Product" sortKey="product" sort={table.sort} onSort={table.toggleSort} />
                <SortableTh label="Location" sortKey="location" sort={table.sort} onSort={table.toggleSort} />
                <SortableTh label="Change" sortKey="delta" sort={table.sort} onSort={table.toggleSort} align="right" />
                <SortableTh label="Reason" sortKey="reason" sort={table.sort} onSort={table.toggleSort} />
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {table.rows.length === 0 ? (
                <EmptyRow colSpan={7} message="No adjustments match the current filters." />
              ) : (
                table.rows.map((a) => {
                  const p = lk.products.get(a.product_id)
                  return (
                    <tr key={a.id} className={rowClass}>
                      <td className={cn(cellClass, 'whitespace-nowrap text-muted-foreground tabular-nums')}>{fmtDateTime(a.created_at)}</td>
                      <td className={cn(cellClass, 'font-mono text-xs')}>{a.reference}</td>
                      <td className={cellClass}>
                        <div className="font-medium">{p?.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{p?.sku}</div>
                      </td>
                      <td className={cn(cellClass, 'font-mono text-xs')}>{lk.locations.get(a.location_id)?.code}</td>
                      <td className={cn(cellClass, 'text-right')}>
                        <Delta value={a.delta} /> <span className="text-xs text-muted-foreground">{p?.uom}</span>
                      </td>
                      <td className={cellClass}>
                        <div>{a.reason}</div>
                        {a.note ? <div className="max-w-56 truncate text-xs text-muted-foreground" title={a.note}>{a.note}</div> : null}
                      </td>
                      <td className={cn(cellClass, 'text-muted-foreground')}>{lk.users.get(a.created_by)?.name}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </TableShell>
          <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            Net change shown: {fmtNum(table.rows.reduce((s, a) => s + a.delta, 0))} units across {table.rows.length} adjustments
          </div>
        </Panel>
      </div>
    </>
  )
}
